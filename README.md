# MySQL Innovation Lab

An interactive web demo of MySQL 9.7 LTS, MySQL 26.7 Innovation, and Enterprise dynamic data masking. The overview groups the 9.7 Community features into replication and HA, telemetry, JSON Duality, and hypergraph optimization. It also covers six 26.7 highlights: Change Stream Applier, Thread Pool, Group Replication's MYSQL communication stack, InnoDB undo truncation, post-quantum TLS, and upgrade readiness.

## Run the web demo

From this directory, start the web server:

```bash
node server.js
```

Open <http://127.0.0.1:4173>. Use the sidebar to browse the release overviews and feature guides, or open the [feature library](http://127.0.0.1:4173/#demos) to see all eleven paths. You can link directly to a guide with its URL hash, such as `#csa`, `#duality`, `#telemetry`, or `#threadpool`.

Most guides are instructional. The Change Stream Applier, Hypergraph Optimizer, and Thread Pool pages include calculators that use values you enter. Dynamic masking shows role-based outcome previews. The telemetry page can send a labeled synthetic sample to a local Collector or import JSON into the web receiver. The JSON Duality page has an optional action that runs SQL against a local MySQL server.

## Optional JSON Duality execution

The **Execute locally** button on `#duality` expects a compatible MySQL 26.7 server at `127.0.0.1:3306`, accessible as `root` without a password. It creates sample customer and order rows, creates a JSON Duality View, and reads a sample document. The page reports a live result only when the query succeeds.

If you have the optional local MySQL runtime in `.mysql-embedded/`, start it with `./scripts/start-embedded-mysql.sh` and stop it with `./scripts/stop-embedded-mysql.sh`. The local execution action requires a running compatible server.

## Optional telemetry stack

To use the Collector and Grafana with the telemetry guide, start the local stack:

```bash
cd collector
docker-compose up -d
```

Then open [the telemetry guide](http://127.0.0.1:4173/#telemetry) and [Grafana](http://127.0.0.1:3000). The guide's **Send synthetic OTLP to Collector** action checks the demo path through the Collector. Its **Import sample to web receiver** action updates only the web app's in-memory feed. The [MySQL Native OpenTelemetry dashboard](collector/Grafana-dashboard/mysql-native-otel-grafana-dashboard.json) can be imported into Grafana for real MySQL telemetry; it may show no data until a MySQL server exports matching signals.
