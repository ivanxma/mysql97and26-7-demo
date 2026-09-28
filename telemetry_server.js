// Bounded, in-memory OTLP/HTTP JSON receiver for the local learning demo.
// Use a real OpenTelemetry Collector for production telemetry.
const { randomBytes } = require('crypto');
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_BATCH_ITEMS = 300;
const MAX_RETAINED = 200;
const rows = { metrics: [], traces: [], logs: [] };
const totals = { metrics: 0, traces: 0, logs: 0 };
let lastReceivedAt = null;
let lastCollectorSampleAt = 0;

const field = (object, camel, snake) => object?.[camel] ?? object?.[snake];
const list = value => Array.isArray(value) ? value : [];

function textValue(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';
  return String(value.stringValue ?? value.string_value ?? value.intValue ?? value.int_value ?? value.doubleValue ?? value.double_value ?? '');
}
function safeText(value, maxLength = 90) {
  const text = String(value ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, maxLength);
  return /\b(select|insert|update|delete|password|secret|token)\b/i.test(text)
    ? '[redacted: possible SQL or secret]' : text;
}
function serviceName(resource) {
  const match = list(resource?.attributes).find(attribute => attribute?.key === 'service.name');
  return safeText(textValue(match?.value) || 'unknown service', 60);
}
function timestamp(nanos) {
  if (nanos == null || nanos === '') return new Date().toISOString();
  try {
    const date = new Date(Number(BigInt(nanos) / 1000000n));
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  } catch { return new Date().toISOString(); }
}
function durationMs(start, end) {
  try {
    if (start == null || end == null) return null;
    const nanos = BigInt(end) - BigInt(start);
    return nanos < 0n ? null : Number(nanos) / 1e6;
  } catch { return null; }
}
function metricValue(point) {
  const direct = point?.asDouble ?? point?.as_double ?? point?.asInt ?? point?.as_int ?? point?.sum;
  const value = Number(direct);
  return direct == null || !Number.isFinite(value) ? null : value;
}

function flattenOtlp(payload, expectedSignal) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Expected an OTLP JSON object.');
  const incoming = { metrics: [], traces: [], logs: [] };
  const resources = {
    metrics: field(payload, 'resourceMetrics', 'resource_metrics'),
    traces: field(payload, 'resourceSpans', 'resource_spans'),
    logs: field(payload, 'resourceLogs', 'resource_logs')
  };
  const present = Object.entries(resources).filter(([, value]) => Array.isArray(value));
  if (!present.length) throw new Error('No resourceMetrics, resourceSpans, or resourceLogs array was found.');
  if (expectedSignal && (present.length !== 1 || present[0][0] !== expectedSignal))
    throw new Error('This endpoint expects only ' + expectedSignal + ' OTLP data.');

  for (const resource of list(resources.metrics)) {
    const service = serviceName(resource?.resource);
    for (const scope of list(field(resource, 'scopeMetrics', 'scope_metrics'))) {
      for (const metric of list(scope?.metrics)) {
        const points = list(metric?.gauge?.dataPoints ?? metric?.gauge?.data_points ??
          metric?.sum?.dataPoints ?? metric?.sum?.data_points ??
          metric?.histogram?.dataPoints ?? metric?.histogram?.data_points);
        for (const point of points) incoming.metrics.push({
          service, name: safeText(metric?.name || 'unnamed metric'),
          value: metricValue(point), unit: safeText(metric?.unit || '', 24),
          time: timestamp(field(point, 'timeUnixNano', 'time_unix_nano'))
        });
      }
    }
  }
  for (const resource of list(resources.traces)) {
    const service = serviceName(resource?.resource);
    for (const scope of list(field(resource, 'scopeSpans', 'scope_spans'))) {
      for (const span of list(scope?.spans)) incoming.traces.push({
        service, name: safeText(span?.name || 'unnamed span'),
        durationMs: durationMs(field(span, 'startTimeUnixNano', 'start_time_unix_nano'), field(span, 'endTimeUnixNano', 'end_time_unix_nano')),
        status: safeText(span?.status?.message || span?.status?.code || 'OK', 36),
        time: timestamp(field(span, 'startTimeUnixNano', 'start_time_unix_nano'))
      });
    }
  }
  for (const resource of list(resources.logs)) {
    const service = serviceName(resource?.resource);
    for (const scope of list(field(resource, 'scopeLogs', 'scope_logs'))) {
      for (const log of list(field(scope, 'logRecords', 'log_records'))) incoming.logs.push({
        service, severity: safeText(log?.severityText || log?.severity_text || 'INFO', 24),
        message: safeText(textValue(log?.body), 140),
        time: timestamp(field(log, 'timeUnixNano', 'time_unix_nano'))
      });
    }
  }
  const count = Object.values(incoming).reduce((sum, values) => sum + values.length, 0);
  if (count > MAX_BATCH_ITEMS) throw new Error('Batch exceeds ' + MAX_BATCH_ITEMS + ' telemetry items.');
  if (!count) throw new Error('The OTLP envelope contains no supported metrics, spans, or log records.');
  return incoming;
}
function importOtlp(payload, expectedSignal, origin = 'otlp') {
  const incoming = flattenOtlp(payload, expectedSignal);
  const accepted = {};
  for (const kind of Object.keys(rows)) {
    accepted[kind] = incoming[kind].length;
    totals[kind] += accepted[kind];
    incoming[kind].forEach(row => { row.origin = origin; });
    rows[kind].unshift(...incoming[kind].reverse());
    rows[kind].length = Math.min(rows[kind].length, MAX_RETAINED);
  }
  lastReceivedAt = new Date().toISOString();
  return accepted;
}
function snapshot() {
  return { receiver: 'OTLP/HTTP JSON', storage: 'memory only', totals: { ...totals },
    lastReceivedAt, metrics: rows.metrics.slice(0, 40), traces: rows.traces.slice(0, 40),
    logs: rows.logs.slice(0, 40) };
}
function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}
function readJson(request) {
  return new Promise((resolve, reject) => {
    let length = 0, tooLarge = false;
    const chunks = [];
    request.on('data', chunk => {
      length += chunk.length;
      if (length > MAX_BODY_BYTES) tooLarge = true;
      else chunks.push(chunk);
    });
    request.on('end', () => {
      if (tooLarge) return reject(Object.assign(new Error('Telemetry payload exceeds 1 MiB.'), { status: 413 }));
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('Invalid JSON payload.'), { status: 400 })); }
    });
    request.on('error', reject);
  });
}
function loopback(request) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress);
}
async function endpointReachable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
    return { reachable: true, httpStatus: response.status };
  } catch { return { reachable: false, httpStatus: null }; }
}
async function stackStatus() {
  const [collector, grafana] = await Promise.all([
    endpointReachable('http://127.0.0.1:4318/'),
    endpointReachable('http://127.0.0.1:3000/api/health')
  ]);
  return {
    checkedAt: new Date().toISOString(),
    collector: { ...collector, endpoint: '127.0.0.1:4318' },
    grafana: { ...grafana, endpoint: '127.0.0.1:3000', healthy: grafana.httpStatus === 200 },
    note: 'Reachability only; this does not prove that MySQL telemetry was delivered.'
  };
}
function collectorSample() {
  const now = BigInt(Date.now()) * 1000000n;
  const resource = { attributes: [{ key: 'service.name', value: { stringValue: 'mysql-telemetry-synthetic' } }] };
  return {
    metrics: { resourceMetrics: [{ resource, scopeMetrics: [{ scope: { name: 'webdemo.collector.probe' }, metrics: [
      { name: 'mysql_telemetry_demo_connections', gauge: { dataPoints: [{ asInt: '18', timeUnixNano: String(now) }] } }
    ] }] }] },
    traces: { resourceSpans: [{ resource, scopeSpans: [{ scope: { name: 'webdemo.collector.probe' }, spans: [
      { traceId: randomBytes(16).toString('hex'), spanId: randomBytes(8).toString('hex'),
        name: 'COM_QUERY synthetic demo', startTimeUnixNano: String(now - 18000000n),
        endTimeUnixNano: String(now), status: { code: 1 } }
    ] }] }] },
    logs: { resourceLogs: [{ resource, scopeLogs: [{ scope: { name: 'webdemo.collector.probe' }, logRecords: [
      { timeUnixNano: String(now), severityText: 'INFO', body: { stringValue: 'Synthetic web demo log; not exported by MySQL.' } }
    ] }] }] }
  };
}
async function sendCollectorSample() {
  const payloads = collectorSample();
  const accepted = {};
  for (const [signal, payload] of Object.entries(payloads)) {
    const response = await fetch('http://127.0.0.1:4318/v1/' + signal, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(3000)
    });
    accepted[signal] = response.status;
    if (!response.ok) throw Object.assign(new Error('Collector rejected ' + signal + ' with HTTP ' + response.status + '.'), { status: 502 });
  }
  return { accepted, serviceName: 'mysql-telemetry-synthetic', metricName: 'mysql_telemetry_demo_connections',
    note: 'Synthetic data accepted by the Collector; verify indexing in Grafana Explore.' };
}
async function handleTelemetryRequest(request, response) {
  const path = request.url?.split('?')[0];
  const expected = { '/v1/metrics': 'metrics', '/v1/traces': 'traces', '/v1/logs': 'logs' }[path];
  if (!expected && path !== '/api/telemetry/snapshot' && path !== '/api/telemetry/import' && path !== '/api/telemetry/stack-status' && path !== '/api/telemetry/send-sample-to-collector') return false;
  if (!loopback(request)) { sendJson(response, 403, { error: 'The demo receiver accepts local requests only.' }); return true; }
  if (path === '/api/telemetry/send-sample-to-collector') {
    if (request.method !== 'POST') { sendJson(response, 405, { error: 'Method not allowed.' }); return true; }
    if (Date.now() - lastCollectorSampleAt < 5000) {
      sendJson(response, 429, { error: 'Wait five seconds before sending another sample.' }); return true;
    }
    lastCollectorSampleAt = Date.now();
    try { sendJson(response, 200, await sendCollectorSample()); }
    catch (error) { sendJson(response, error.status || 503, { error: error.message }); }
    return true;
  }
  if (path === '/api/telemetry/stack-status') {
    if (request.method !== 'GET') sendJson(response, 405, { error: 'Method not allowed.' });
    else sendJson(response, 200, await stackStatus());
    return true;
  }
  if (path === '/api/telemetry/snapshot') {
    if (request.method !== 'GET') sendJson(response, 405, { error: 'Method not allowed.' });
    else sendJson(response, 200, snapshot());
    return true;
  }
  if (request.method !== 'POST') { sendJson(response, 405, { error: 'Method not allowed.' }); return true; }
  if (!/^application\/(?:json|[\w.-]+\+json)(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
    sendJson(response, 415, { error: 'Use OTLP/HTTP JSON (application/json). Protobuf is not supported by this demo receiver.' });
    return true;
  }
  try {
    const origin = expected ? 'otlp' : request.headers['x-demo-origin'] === 'sample' ? 'sample' : 'file import';
    const accepted = importOtlp(await readJson(request), expected, origin);
    sendJson(response, 200, expected ? { partialSuccess: {} } : { accepted, snapshot: snapshot() });
  } catch (error) { sendJson(response, error.status || 400, { error: error.message }); }
  return true;
}
module.exports = { handleTelemetryRequest, importOtlp, snapshot, flattenOtlp };
