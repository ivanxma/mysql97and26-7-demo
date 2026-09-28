// Static, deck-aligned explanation of this repository's Collector + Grafana stack.
// Live endpoint status and sample actions are handled by telemetry.js.
const telemetryPage = {
  render() {
    return `<div class="telemetry-page page-stack">
      <section class="editorial-hero">
        <div class="eyebrow">MYSQL 9.7 · OPENTELEMETRY · GRAFANA</div>
        <h1>Two ways to collect. One place to observe.</h1>
        <p>The running Docker stack accepts MySQL telemetry on Collector port 4318, forwards it to Grafana LGTM, and presents it in Grafana on port 3000. The alternative MySQL receiver polls the database; it is not enabled in the current Collector YAML.</p>
        <div class="hero-actions"><button class="button-red" data-scroll="telemetry-stack">Inspect this stack ↓</button><button class="text-link" data-scroll="telemetry-compare">Compare polling and push ↓</button></div>
        <div class="hero-rail"><span>MYSQL COMPONENT</span><b>→</b><span>OTLP :4318</span><b>→</b><span>COLLECTOR</span><b>→</b><span>LGTM / GRAFANA :3000</span></div>
      </section>

      <section class="story-section" id="telemetry-stack">
        <div class="section-label">01 · THE CONFIGURED DOCKER STACK</div>
        <h2>Collector forwards OTLP to Grafana LGTM.</h2>
        <p class="section-intro">The mounted <a href="collector/otel-collector.yaml" download>collector/otel-collector.yaml</a> defines an OTLP/HTTP receiver, batch processor, debug exporter, and <code>otlp_http/lgtm</code> exporter to <code>http://lgtm:4318</code>. The <a href="collector/docker-compose.yml" download>Compose file</a> runs the Contrib Collector and <code>grafana/otel-lgtm</code>.</p>
        <div id="telemetry-stack-status" class="telemetry-stack-status" aria-live="polite">Checking local endpoints…</div>
        <div class="code-panel"><div class="code-panel-head"><span>Start or check this stack · from the project root</span></div><pre><code>cd collector
docker-compose up -d
docker-compose ps
docker-compose logs --tail=50 collector</code></pre></div>
        <p class="caption-note">At inspection, <code>collector-collector-1</code> publishes 4318 and <code>collector-lgtm-1</code> publishes Grafana 3000. This machine uses standalone <code>docker-compose</code>; <code>up -d</code> is for a stopped stack. The web app checks endpoints only and never starts or stops Docker.</p>
      </section>

      <section class="story-section" id="telemetry-compare">
        <div class="section-label">02 · COLLECTION MODEL</div>
        <h2>The initiator and protocol change.</h2>
        <div class="telemetry-lanes">
          <div><span class="telemetry-lane-tag blue">POLL · ALTERNATIVE</span><strong>Collector MySQL receiver <em>⇄</em> MySQL :3306</strong><p>Collector initiates SQL reads of status and InnoDB data at a configured interval. This needs a MySQL login and a <code>mysql</code> receiver in Collector Contrib.</p></div>
          <div><span class="telemetry-lane-tag red">PUSH · CONFIGURED PATH</span><strong>MySQL component <em>→</em> OTLP/HTTP :4318 <em>→</em> Collector</strong><p>MySQL emits instrumented traces and metrics. The Collector forwards them to LGTM; Grafana Explore reads the stored signals.</p></div>
        </div>
        <div class="telemetry-table-wrap"><table class="telemetry-compare"><thead><tr><th>Dimension</th><th>Polling receiver</th><th>MySQL component push</th></tr></thead><tbody>
          <tr><th>Who initiates?</th><td>Collector connects to MySQL</td><td>MySQL connects to Collector</td></tr>
          <tr><th>Transport</th><td>MySQL protocol on 3306</td><td>OTLP/HTTP on 4318</td></tr>
          <tr><th>Typical signals</th><td>Server metrics; optional query-sample logs</td><td>Native spans and metrics; logs need a supported provider</td></tr>
          <tr><th>Configuration</th><td><code>mysql</code> receiver, credentials, <code>collection_interval</code></td><td><code>component_telemetry</code>, enable switches, export endpoints</td></tr>
          <tr><th>Current stack</th><td>Not enabled in the mounted YAML</td><td>OTLP receiver and LGTM forwarding are configured</td></tr>
        </tbody></table></div>
        <p class="caption-note">Polling does not turn status queries into MySQL's native trace spans. The Contrib MySQL receiver is separate from the OTLP receiver in the same Collector distribution.</p>
      </section>

      <section class="story-section">
        <div class="section-label">03 · OPTIONAL POLLING PATH</div>
        <h2>To poll, add a MySQL receiver to Collector Contrib.</h2>
        <p class="section-intro">The current <code>collector/otel-collector.yaml</code> has only <code>receivers: otlp</code>. This example is instructional and has not been applied to the running stack. Give the monitoring user only the permissions needed for the selected measurements; query samples additionally need Performance Schema access.</p>
        <div class="code-panel"><div class="code-panel-head"><span>Illustrative Collector Contrib addition</span></div><pre><code>receivers:
  mysql:
    endpoint: mysql.example:3306
    username: otel
    password: &#36;{env:MYSQL_PASSWORD}
    collection_interval: 10s

service:
  pipelines:
    metrics:
      receivers: [mysql]
      processors: [batch]
      exporters: [otlp_http/lgtm, debug]</code></pre></div>
        <p class="caption-note">The Collector must be able to reach MySQL on port 3306. A container's <code>localhost</code> is the container itself, not the macOS host.</p>
      </section>

      <section class="story-section" id="telemetry-setup">
        <div class="section-label">04 · MYSQL COMPONENT PUSH PATH</div>
        <h2>Install the component and target the running Collector.</h2>
        <p class="section-intro">Use a test MySQL 9.7 server and an account permitted to install components and persist global variables. This example uses OTLP/HTTP JSON at <code>127.0.0.1:4318</code> when MySQL runs on this host. If MySQL runs elsewhere, replace that address with a reachable Collector host.</p>
        <div class="code-panel"><div class="code-panel-head"><span>MySQL SQL · traces and metrics</span></div><pre><code>INSTALL COMPONENT 'file://component_telemetry';
SELECT component_urn FROM mysql.component
WHERE component_urn = 'file://component_telemetry';

SET PERSIST_ONLY telemetry.otel_exporter_otlp_traces_protocol = 'http/json';
SET PERSIST_ONLY telemetry.otel_exporter_otlp_traces_endpoint =
  'http://127.0.0.1:4318/v1/traces';
SET PERSIST_ONLY telemetry.otel_exporter_otlp_metrics_protocol = 'http/json';
SET PERSIST_ONLY telemetry.otel_exporter_otlp_metrics_endpoint =
  'http://127.0.0.1:4318/v1/metrics';
SET PERSIST_ONLY telemetry.query_text_enabled = OFF;
SET PERSIST_ONLY telemetry.metrics_enabled = ON;
SET PERSIST_ONLY telemetry.trace_enabled = ON;

-- Restart mysqld for non-dynamic settings, then run test queries.</code></pre></div>
        <p class="caption-note">The Collector also accepts OTLP/HTTP protobuf; JSON is shown to make the two demo paths comparable. Enable query text only after reviewing privacy implications.</p>
        <div class="code-panel telemetry-verify"><div class="code-panel-head"><span>Verify MySQL export destinations · output supplied for this demo</span></div><pre><code>mysql&gt; SHOW GLOBAL VARIABLES LIKE 'tel%endp%';
+-----------------------------------------------+----------------------------------+
| Variable_name                                 | Value                            |
+-----------------------------------------------+----------------------------------+
| telemetry.otel_exporter_otlp_logs_endpoint    | http://127.0.0.1:4318/v1/logs    |
| telemetry.otel_exporter_otlp_metrics_endpoint | http://127.0.0.1:4318/v1/metrics |
| telemetry.otel_exporter_otlp_traces_endpoint  | http://127.0.0.1:4318/v1/traces  |
+-----------------------------------------------+----------------------------------+
3 rows in set (0.003 sec)</code></pre></div>
        <p class="caption-note">All three URLs target the host-published Collector port 4318, which forwards to the LGTM container. These are configured destinations, not proof that each signal is enabled or has arrived in Grafana. If MySQL runs in a container, <code>127.0.0.1</code> points to that MySQL container, so use a reachable Collector address instead.</p>
      </section>

      <section class="story-section">
        <div class="section-label">05 · SIGNAL CONTROLS</div>
        <h2>Collection switches and export endpoints are distinct.</h2>
        <div class="telemetry-table-wrap"><table class="telemetry-compare"><thead><tr><th>Signal</th><th>Collection control</th><th>Export control</th></tr></thead><tbody>
          <tr><th>Traces</th><td><code>telemetry.trace_enabled</code>; <code>telemetry.query_text_enabled</code></td><td><code>telemetry.otel_exporter_otlp_traces_protocol</code> and <code>..._endpoint</code></td></tr>
          <tr><th>Metrics</th><td><code>telemetry.metrics_enabled</code>; <code>telemetry.metrics_reader_frequency_1/2/3</code></td><td><code>telemetry.otel_exporter_otlp_metrics_protocol</code> and <code>..._endpoint</code></td></tr>
          <tr><th>Logs</th><td><code>telemetry.log_enabled</code></td><td><code>telemetry.otel_exporter_otlp_logs_protocol</code> and <code>..._endpoint</code></td></tr>
        </tbody></table></div>
        <p class="caption-note">Log export requires MySQL Enterprise, HeatWave, or a custom logging component. The Community logging interface and <code>log_enabled</code> variable alone do not export records.</p>
        <div class="code-panel telemetry-verify"><div class="code-panel-head"><span>Verify effective switches · illustrative result</span></div><pre><code>SHOW GLOBAL VARIABLES LIKE '%tele%enable%';
telemetry.log_enabled         OFF
telemetry.metrics_enabled     ON
telemetry.query_text_enabled  OFF
telemetry.trace_enabled       ON</code></pre></div>
        <p class="caption-note">These values show collection settings, not whether the Collector received data. Confirm delivery in Grafana and Collector output.</p>
      </section>

      <section class="story-section" id="telemetry-demo">
        <div class="section-label">06 · OBSERVE THE RUNNING STACK</div>
        <h2>Follow each signal into Grafana Explore.</h2>
        <p class="section-intro">The Compose stack sends Collector output to LGTM's Prometheus, Tempo, and Loki backends. Grafana on <code>127.0.0.1:3000</code> reads those data sources. Choose a recent time range and allow for export and indexing delay.</p>
        <div class="telemetry-observe-grid"><div><span>METRICS</span><h3>Prometheus</h3><p>Use Explore's metric browser and search for a MySQL metric name. For the synthetic test below, search <code>mysql_telemetry_demo_connections</code>.</p></div><div><span>TRACES</span><h3>Tempo</h3><p>Search recent traces by service. The synthetic test uses <code>service.name = mysql-telemetry-synthetic</code>; a real MySQL export will have its own resource attributes.</p></div><div><span>LOGS</span><h3>Loki</h3><p>Logs appear only if sent to the pipeline. A synthetic test log does not demonstrate MySQL Community log export.</p></div></div>
        <div class="telemetry-actions"><button class="button-red" data-telemetry-collector-sample>Send synthetic OTLP to Collector ▶</button><a class="telemetry-grafana-link" href="http://127.0.0.1:3000/explore" target="_blank" rel="noopener noreferrer">Open Grafana Explore ↗</a><button class="text-link" data-telemetry-stack-refresh>Check endpoints ↻</button></div>
        <p id="telemetry-collector-result" class="caption-note" aria-live="polite">The button sends a fixed, clearly labeled sample through the running Collector. It does not query MySQL.</p>
      </section>

      <section class="story-section">
        <div class="section-label">07 · SEPARATE WEB RECEIVER LAB</div>
        <h2>This page's local receiver is not the Grafana pipeline.</h2>
        <p class="section-intro">The Node app also has a bounded, in-memory OTLP/HTTP JSON receiver on its own port. Use it to inspect payload shape or import a JSON file. Items here do not flow into the Collector or Grafana; Collector data does not appear here. The sample log is illustrative.</p>
        <div class="telemetry-actions"><button class="button-red" data-telemetry-sample>Import sample to web receiver ▶</button><label class="telemetry-upload">Import OTLP JSON file<input type="file" id="telemetryFile" accept=".json,application/json" /></label><button class="text-link" data-telemetry-refresh>Refresh web receiver ↻</button></div>
        <div id="telemetry-live" aria-live="polite"><p class="telemetry-empty">Connecting to the local web receiver…</p></div>
      </section>

      <section class="story-section">
        <div class="section-label">08 · TROUBLESHOOT BY HOP</div><h2>A green port check is only the first check.</h2>
        <div class="editorial-list numbered"><div><b>MySQL</b><span>Confirm <code>mysql.component</code>, <code>SHOW GLOBAL VARIABLES LIKE '%tele%enable%'</code>, the export URLs, and the restart. Run test queries after enabling traces.</span></div><div><b>Collector</b><span>Check <code>docker-compose logs --tail=50 collector</code> in the <code>collector</code> directory. The mounted YAML has OTLP pipelines and an <code>otlp_http/lgtm</code> exporter.</span></div><div><b>Grafana</b><span>Open Explore, select Prometheus, Tempo, or Loki, and widen the time range. A successful OTLP response is not proof that a signal has been indexed.</span></div><div><b>Boundary</b><span>The polling MySQL receiver is not enabled by the current YAML. MySQL log export needs an additional supported provider.</span></div></div>
      </section>
      <div class="reference-line"><span>PRIMARY SOURCES</span><a href="https://dev.mysql.com/doc/refman/9.7/en/telemetry.html" target="_blank" rel="noopener noreferrer">MySQL telemetry ↗</a><a href="https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/mysqlreceiver" target="_blank" rel="noopener noreferrer">MySQL receiver ↗</a><a href="https://github.com/grafana/docker-otel-lgtm" target="_blank" rel="noopener noreferrer">Grafana LGTM ↗</a></div>
    </div>`;
  }
};
