# MySQL Innovation Lab

Repository: [ivanxma/mysql97and26-7-demo](https://github.com/ivanxma/mysql97and26-7-demo). This `webdemo-2607` directory is a standalone Git repository; its parent workspace and neighboring projects are not part of it. The local `.mysql-embedded/` runtime is excluded from Git.

The web app follows the release and feature flow in [MySQL9.7 and 26.7.pptx](outputs/MySQL9.7%20and%2026.7.pptx), using a consistent Oracle/MySQL visual style. Open it with `node server.js` and visit `http://127.0.0.1:4173`.

The overview separates the two release tracks: MySQL 9.7 LTS (the final sequentially numbered release) and MySQL 26.7 Innovation (the first YY.M.P calendar release). It maps four 9.7 Community pillars—replication and HA, telemetry, JSON Duality DML, and hypergraph optimization—and six 26.7 highlights—CSA, Thread Pool, Group Replication's MYSQL stack default, InnoDB undo truncation, post-quantum TLS, and upgrade readiness. Enterprise masking is presented separately because it needs Enterprise Edition and the policy component.

Each highlighted feature has a dedicated deep-dive page with context, changes, and step-by-step evaluation guidance. The guided interactive pages are:

- **Change Stream Applier:** background, challenges, MTA versus CSA, prerequisites, implementation, and a five-step evaluation tutorial based on the accompanying PowerPoint. The comparison calculator uses times that you enter; it does not query a live replica.
- **Dynamic masking:** complete MySQL Enterprise policy syntax and role-based outcome previews.
- **JSON Duality:** 9.7 Community DML context, write path and limitations, plus a SQL walkthrough with an optional local execution endpoint using a 26.7 runtime.
- **Hypergraph Optimizer:** a deck-aligned deep dive into join-plan search, published Oracle benchmarks and a plan-level example, plus a five-step Sakila SQL lab and a calculator for your own measured runtimes. The page does not execute the lab SQL.
- **Telemetry:** polling-versus-push comparison, MySQL 9.7 component SQL, the configured Collector → Grafana LGTM path, and separate synthetic/local receiver demos.
- **InnoDB undo truncation:** a deck-aligned explanation of the new tablespace-header progress marker, recovery behavior, upgrade prerequisites, a lab-only manual truncation walkthrough, and a recovery/performance measurement checklist.
- **Thread Pool:** background on high-connection contention, exact 26.7 Community plugin startup configuration, verification SQL, a labeled historical Oracle benchmark, a sysbench A/B lab, and a calculator for your own TPS and p95 measurements.

You can open a page directly with a hash such as `#csa`, `#masking`, `#duality`, `#telemetry`, `#hypergraph`, or `#pqc`. The feature library at `#demos` links to all eleven paths. The telemetry page accepts local JSON imports; the optional JSON Duality action is the only guide that executes SQL against a database.

The new 26.7 storage and concurrency pages are available at `#undo` and `#threadpool`. Both link to [the companion deep-dive PowerPoint](outputs/mysql-26-7-undo-thread-pool-deep-dive-oracle-style.pptx). The Thread Pool calculator uses only values you enter; it does not report a live benchmark.

## Embedded MySQL runtime

The demo includes an isolated MySQL Community Server 26.7.0 runtime for Apple Silicon macOS. It is installed under `.mysql-embedded/`, excluded from Git, and does not alter the existing system MySQL installation.

The supplied binary is the macOS 15 build. This machine runs macOS 26.6.2; the current 26.7.0 binary crashes during initialization on this OS, so it cannot yet serve the sample data here. The startup script detects that condition and points to its local error log instead of leaving a partial instance running.

Start it with:

```bash
./scripts/start-embedded-mysql.sh
```

It listens only on `localhost:3306`, uses a project-local data directory, and creates the `innovation_lab.product_catalog` sample table. Connect with:

```bash
.mysql-embedded/mysql-26.7.0-macos15-arm64/bin/mysql -uroot -h 127.0.0.1 -P 3306 innovation_lab
```

Stop it with `./scripts/stop-embedded-mysql.sh`.

## JSON Duality walkthrough

The JSON Duality page includes an optional local database action. It expects the embedded instance provided for the demo at `127.0.0.1:3306`, with `root` and no password. Start the web demo with:

```bash
node server.js
```

Then visit `http://127.0.0.1:4173/#duality` and click **Execute locally**. The server has one fixed endpoint only; it seeds a small customer/order scenario, creates `customer_orders_dv`, and returns Maya Chen's JSON document. The client never accepts arbitrary SQL. The page does not claim a live connection before the request succeeds.

## Change Stream Applier walkthrough

Visit `http://127.0.0.1:4173/#csa`. The page follows the [CSA PowerPoint](outputs/change-stream-applier-oracle-style.pptx): replication background, why MTA can become a bottleneck, CSA scheduling, a with/without comparison, requirements, implementation, and five guided lab steps. The tutorial assumes an existing row-based GTID channel from a source (MySQL 9.7 is supported) to a MySQL 26.7 replica. It uses sysbench for comparable MTA and CSA backlog-drain passes and includes monitoring and rollback SQL.

This is an instructional walkthrough, not a live replication controller. No command on this page changes a MySQL server. See the [MySQL 26.7 CSA reference](https://dev.mysql.com/doc/refman/26.7/en/change-stream-applier.html) for current behavior and limitations.

## Hypergraph Optimizer deep dive

Visit `http://127.0.0.1:4173/#hypergraph`. The page follows the [Hypergraph Optimizer PowerPoint](outputs/hypergraph-optimizer-deep-dive-oracle-style.pptx): background, challenge, why the plan search differs, a classic-versus-Hypergraph comparison, Oracle-published benchmark and plan evidence, and a five-step Sakila tutorial. Download and load the [official Sakila database](https://dev.mysql.com/doc/sakila/en/sakila-installation.html) into a disposable MySQL 9.7 Community server to run the SQL. The page is instructional; its timing calculator uses only values you enter and does not claim a local benchmark result.

## Dynamic data masking walkthrough

Open **Dynamic masking** in the sidebar for an Oracle-inspired, MySQL-branded walkthrough. It connects the payment table, masking policies, `ALTER TABLE ... MODIFY COLUMN ... MASKING POLICY` syntax, and active roles in one diagram. The SQL tabs contain the complete setup sequence; the role switch shows the expected results for a reporting user and an approved processor.

This page is an interactive **preview**, not a live database execution. To run the SQL, use MySQL Enterprise Edition 26.7 with the Dynamic Data Masking Policy component installed by `install_component_object_policy.sql`. Creating policies requires `MANAGE_DATA_MASKING_POLICY`; replace the example user passwords before running the role setup. The bundled Community Server is not sufficient for this Enterprise feature.

See the [MySQL 26.7 policy documentation](https://dev.mysql.com/doc/refman/26.7/en/data-masking-dynamic-policies.html) and [documented column-assignment syntax](https://dev.mysql.com/doc/refman/26.7/en/data-masking-policy-usage.html).

## MySQL 9.7 telemetry: Collector and Grafana

Open http://127.0.0.1:4173/#telemetry after starting this web app with node server.js. The page follows the [polling-versus-push Grafana deep-dive](outputs/mysql-9-7-telemetry-polling-vs-push-grafana-deep-dive-oracle-style.pptx) and the stack in [collector/docker-compose.yml](collector/docker-compose.yml).

### Start the observed Docker stack

From the project root:

~~~bash
cd collector
docker-compose up -d
docker-compose ps
docker-compose logs --tail=50 collector
~~~

This machine has the standalone docker-compose command; docker compose is not installed. At inspection, collector-collector-1 and collector-lgtm-1 were already running, so the app does not restart them. The mounted [collector/otel-collector.yaml](collector/otel-collector.yaml) accepts OTLP/HTTP on host port 4318, batches signals, and forwards traces, metrics, and logs via otlp_http/lgtm to the LGTM container at lgtm:4318. Grafana is available at http://127.0.0.1:3000. The web app reports whether the local endpoints are reachable; that check does not prove data delivery.

### Receiver polling versus component push

The current YAML contains an OTLP receiver, not a MySQL polling receiver. The optional Contrib mysqlreceiver connects to MySQL on port 3306, queries global status and InnoDB data on collection_interval, and needs a monitoring login. It is a separate way to collect periodic server metrics and does not create MySQL's native trace spans. The web page includes an illustrative polling YAML addition, but it is not applied to the running stack.

For the configured push path, MySQL 9.7 component_telemetry sends OTLP/HTTP traces and metrics to the Collector. On a test MySQL server running on the same host, use an account permitted to install components and persist global variables:

~~~sql
INSTALL COMPONENT 'file://component_telemetry';
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
~~~

Restart MySQL for the non-dynamic settings. Then run SHOW GLOBAL VARIABLES LIKE '%tele%enable%'; and a small test workload. If MySQL runs in another container or machine, 127.0.0.1 refers to that MySQL environment, not the host Collector; use a reachable Collector address.

The endpoint check supplied for this demo is:

~~~text
mysql> SHOW GLOBAL VARIABLES LIKE 'tel%endp%';
+-----------------------------------------------+----------------------------------+
| Variable_name                                 | Value                            |
+-----------------------------------------------+----------------------------------+
| telemetry.otel_exporter_otlp_logs_endpoint    | http://127.0.0.1:4318/v1/logs    |
| telemetry.otel_exporter_otlp_metrics_endpoint | http://127.0.0.1:4318/v1/metrics |
| telemetry.otel_exporter_otlp_traces_endpoint  | http://127.0.0.1:4318/v1/traces  |
+-----------------------------------------------+----------------------------------+
3 rows in set (0.003 sec)
~~~

These values verify configured destinations, not delivery. In particular, a logs URL does not enable log collection or provide a MySQL log exporter by itself.

### Observe in Grafana

Open http://127.0.0.1:3000/explore. Select Prometheus for metrics, Tempo for traces, or Loki for logs. Choose a recent time range and allow a short export/indexing delay. The telemetry page has a **Send synthetic OTLP to Collector** button that sends fixed, labeled data through port 4318. Search Prometheus for mysql_telemetry_demo_connections or Tempo for service.name mysql-telemetry-synthetic. This verifies the Collector-to-LGTM demo path, not a MySQL export. The separate **Import sample to web receiver** button writes only to the Node app's bounded in-memory feed; it does not send data to Grafana.

MySQL Community's logging interface alone does not export logs. MySQL log export requires Enterprise Edition, HeatWave, or a custom logging component. The synthetic log is illustrative. The bundled local MySQL runtime cannot currently start on this host, so no live MySQL export was verified.

References: [MySQL telemetry](https://dev.mysql.com/doc/refman/9.7/en/telemetry.html), [OpenTelemetry MySQL receiver](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/mysqlreceiver), [Grafana LGTM](https://github.com/grafana/docker-otel-lgtm).
