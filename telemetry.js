const telemetryDemo = (() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let pollTimer = null;

  function samplePayload() {
    const now = BigInt(Date.now()) * 1000000n;
    const start = now - 18000000n;
    const resource = { attributes:[{key:'service.name',value:{stringValue:'mysql-9.7-demo'}}] };
    return {
      resourceMetrics:[{resource,scopeMetrics:[{scope:{name:'mysql.telemetry.demo'},metrics:[
        {name:'mysql.connections.current',unit:'{connection}',gauge:{dataPoints:[{asInt:'18',timeUnixNano:String(now)}]}},
        {name:'mysql.queries.total',unit:'{query}',sum:{dataPoints:[{asInt:'1240',timeUnixNano:String(now)}],aggregationTemporality:2,isMonotonic:true}}
      ]}]}],
      resourceSpans:[{resource,scopeSpans:[{scope:{name:'mysql.telemetry.demo'},spans:[{
        traceId:'f6c3950a3b7a4cb5ac173d42e16a9342',spanId:'7d87b5e728e3c934',
        name:'COM_QUERY',startTimeUnixNano:String(start),endTimeUnixNano:String(now),status:{code:1}
      }]}]}],
      resourceLogs:[{resource,scopeLogs:[{scope:{name:'mysql.telemetry.demo'},logRecords:[{
        timeUnixNano:String(now),severityText:'INFO',body:{stringValue:'Illustrative sample log; Community logging export is not implied.'}
      }]}]}]
    };
  }

  function listItems(items, kind) {
    if (!items?.length) return '<p class="telemetry-empty">No '+kind+' received yet.</p>';
    return items.slice(0,8).map(item => {
      const title = kind==='metrics' ? item.name : kind==='traces' ? item.name : item.severity;
      const detail = kind==='metrics' ? (item.value == null ? 'no numeric value' : item.value+' '+item.unit) :
        kind==='traces' ? (item.durationMs == null ? 'duration unavailable' : item.durationMs.toFixed(2)+' ms') : item.message;
      return '<div class="telemetry-row"><div><strong>'+escapeHtml(title)+'</strong><small>'+escapeHtml(item.service)+' · '+escapeHtml(item.origin)+'</small></div><span>'+escapeHtml(detail)+'</span><time>'+escapeHtml(item.time)+'</time></div>';
    }).join('');
  }

  function updateView(data, status) {
    const panel = document.getElementById('telemetry-live');
    if (!panel) return;
    panel.innerHTML = `<div class="telemetry-summary"><div><span>METRICS</span><strong>${data.totals.metrics}</strong></div><div><span>TRACES</span><strong>${data.totals.traces}</strong></div><div><span>LOGS</span><strong>${data.totals.logs}</strong></div><div><span>LAST IMPORT</span><strong class="telemetry-last">${escapeHtml(data.lastReceivedAt ? new Date(data.lastReceivedAt).toLocaleTimeString() : 'Waiting')}</strong></div></div>
      <p class="caption-note">${escapeHtml(status || 'Receiver is ready. Values stay in memory and disappear when the Node server restarts.')}</p>
      <div class="telemetry-feeds"><article><h3>Metrics</h3>${listItems(data.metrics,'metrics')}</article><article><h3>Traces</h3>${listItems(data.traces,'traces')}</article><article><h3>Logs</h3>${listItems(data.logs,'logs')}</article></div>`;
  }

  async function refresh(status) {
    try {
      const response = await fetch('/api/telemetry/snapshot', {cache:'no-store'});
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Receiver unavailable');
      updateView(body, status);
    } catch (error) {
      const panel = document.getElementById('telemetry-live');
      if (panel) panel.textContent = 'Telemetry receiver unavailable: '+error.message+'. Start this web app with node server.js.';
    }
  }

  async function importPayload(payload, origin) {
    const response = await fetch('/api/telemetry/import', {
      method:'POST',headers:{'Content-Type':'application/json','X-Demo-Origin':origin},
      body:JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Import failed');
    updateView(body.snapshot, 'Imported '+Object.values(body.accepted).reduce((sum,n)=>sum+n,0)+' '+origin+' item(s). Sample and file imports are labeled in the feed.');
  }

  async function refreshStack() {
    const panel = document.getElementById('telemetry-stack-status');
    if (!panel) return;
    try {
      const response = await fetch('/api/telemetry/stack-status', { cache:'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Status check failed');
      panel.innerHTML = `<div class="telemetry-status-item"><span class="telemetry-dot ${data.collector.reachable?'is-up':'is-down'}"></span><div><strong>Collector · :4318</strong><small>${data.collector.reachable?'Endpoint reachable':'Endpoint unavailable'}</small></div></div>
        <div class="telemetry-status-item"><span class="telemetry-dot ${data.grafana.healthy?'is-up':'is-down'}"></span><div><strong>Grafana · :3000</strong><small>${data.grafana.healthy?'Health check OK':'Health check unavailable'}</small></div></div>
        <p class="caption-note">Local endpoint checks only. They do not prove MySQL has exported data or that Grafana has indexed it.</p>`;
    } catch (error) { panel.textContent = 'Could not check local stack endpoints: '+error.message; }
  }

  async function sendCollectorSample() {
    const status = document.getElementById('telemetry-collector-result');
    if (status) status.textContent = 'Sending synthetic OTLP data to the Collector…';
    try {
      const response = await fetch('/api/telemetry/send-sample-to-collector', { method:'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Collector did not accept the sample');
      if (status) status.textContent = 'Collector accepted synthetic metrics, traces, and logs. In Grafana Explore, search for service.name = '+data.serviceName+' or metric '+data.metricName+'. Allow a short indexing delay.';
      refreshStack();
    } catch (error) { if (status) status.textContent = 'Sample failed: '+error.message; }
  }

  function render() {
    clearInterval(pollTimer);
    setTimeout(() => { refresh(); refreshStack(); }, 0);
    pollTimer = setInterval(() => {
      if (document.getElementById('telemetry-live')) { refresh(); refreshStack(); }
      else clearInterval(pollTimer);
    }, 10000);
    return telemetryPage.render();
  }

  function handleClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    if (target.closest('[data-telemetry-collector-sample]')) { sendCollectorSample(); return true; }
    if (target.closest('[data-telemetry-stack-refresh]')) { refreshStack(); return true; }
    if (target.closest('[data-telemetry-sample]')) {
      importPayload(samplePayload(),'sample').catch(error => updateError(error.message));
      return true;
    }
    if (target.closest('[data-telemetry-refresh]')) { refresh(); return true; }
    return false;
  }
  function updateError(message) {
    const panel = document.getElementById('telemetry-live');
    if (panel) panel.textContent = 'Import failed: '+message;
  }
  async function handleChange(event) {
    if (event.target?.id !== 'telemetryFile') return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { updateError('Choose an OTLP JSON file smaller than 1 MiB.'); return; }
    try { await importPayload(JSON.parse(await file.text()), 'file import'); }
    catch (error) { updateError(error.message); }
    event.target.value = '';
  }
  return { render, refresh, handleClick, handleChange };
})();
