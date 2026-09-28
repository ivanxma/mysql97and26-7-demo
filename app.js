const content = document.getElementById('content');
const crumb = document.getElementById('crumbTitle');
const sidebar = document.getElementById('sidebar');
const mobileMenu = document.getElementById('mobileMenu');

const pageNames = { overview:'Overview', '97':'MySQL 9.7 LTS', '26':'MySQL 26.7', csa:'Change Stream Applier', masking:'Dynamic masking', duality:'JSON Duality', demos:'Feature library', ha97:'Replication & HA', telemetry:'Telemetry', hypergraph:'Hypergraph optimizer', threadpool:'Thread Pool', grstack:'GR communication stack', undo:'InnoDB undo', pqc:'Post-quantum TLS', upgrade:'Upgrade readiness' };
const link = (page, label, klass='text-link') => `<button class="${klass}" data-page-link="${page}">${label} <span aria-hidden="true">→</span></button>`;
const featureRow = (page, tag, title, description) => `<button data-page-link="${page}"><span>${tag}</span><strong>${title}</strong><small>${description}</small><b aria-hidden="true">→</b></button>`;

function overview() {
  return `<div class="page-stack">
    <section class="editorial-hero"><div class="eyebrow">MYSQL RELEASE STORY · 2026</div><h1>Two releases. Two jobs. A broader feature story.</h1><p>MySQL 9.7 is the latest LTS release, a stable release with bug fixes. Its Community story has four feature pillars. MySQL 26.7 is the first YY.M.P calendar-versioned Innovation release: six highlighted changes to evaluate. Enterprise masking is a separate edition-specific capability across both releases.</p><div class="hero-actions">${link('97','Explore 9.7 LTS','button-red')}${link('26','Explore 26.7 Innovation')}</div><div class="hero-rail"><span>9.7 · LTS FOUNDATION</span><b aria-hidden="true">→</b><span>26.7 · INNOVATION HORIZON</span><b aria-hidden="true">→</b><span>ENTERPRISE · MASKING</span></div></section>
    <section class="story-section"><div class="section-label">RELEASE MAP · FROM THE DECK</div><h2>Know which release owns which change.</h2><div class="release-map"><article><div class="release-map-head"><span>01 / APRIL 2026</span><strong>MySQL 9.7 LTS</strong><small>Latest LTS release · bug fixes</small></div><p>Four Community pillars: replication &amp; HA, telemetry, JSON Duality write support, and the hypergraph optimizer.</p>${link('97','See all 9.7 features')}</article><article><div class="release-map-head"><span>02 / JULY 2026</span><strong>MySQL 26.7 Innovation</strong><small>First CalVer release · YY.M.P</small></div><p>Six highlights: CSA, Thread Pool, Group Replication stack, InnoDB undo, PQC TLS, and upgrade operations.</p>${link('26','See all 26.7 features')}</article></div></section>
    <section class="story-section"><div class="section-label">MYSQL 9.7 · COMMUNITY</div><h2>The LTS foundation has four pillars.</h2><div class="feature-lines">${featureRow('ha97','01 / HA','Replication & HA','Applier metrics, GR flow control, resource manager, and primary election.')}${featureRow('telemetry','02 / SIGNALS','Telemetry','Polling versus push, OTLP Collector, and Grafana observation.')}${featureRow('duality','03 / DATA','JSON Duality Views','Document-shaped reads and 9.7 Community DML over relational data.')}${featureRow('hypergraph','04 / SQL','Hypergraph optimizer','Plan anatomy, published benchmarks, and a guided Sakila comparison.')}</div></section>
    <section class="story-section"><div class="section-label">MYSQL 26.7 · INNOVATION</div><h2>Six changes to evaluate.</h2><div class="feature-lines">${featureRow('csa','01 / REPLICATION','Change Stream Applier','Optional per-channel alternative to MTA, with a guided benchmark.')}${featureRow('threadpool','02 / CONCURRENCY','Thread Pool Community','Compare thread scheduling under connection pressure.')}${featureRow('grstack','03 / HA','GR MYSQL stack default','Review the new communication-stack default and topology impact.')}${featureRow('undo','04 / STORAGE','InnoDB undo truncation','Progress moves to the tablespace header.')}${featureRow('pqc','05 / SECURITY','Post-quantum TLS','Negotiate PQC-capable TLS 1.3 with OpenSSL 3.5+.')}${featureRow('upgrade','06 / OPERATIONS','Upgrade readiness','Check the supported path and rehearse the 26.7 upgrade.')}</div></section>
    <section class="notice-band"><strong>Enterprise track</strong><span>Dynamic data masking policies require MySQL Enterprise Edition and the policy component; they are not part of the Community feature list. ${link('masking','Open masking walkthrough')}</span></section>
    <section class="resource-strip"><div><span class="section-label">FOLLOW THE DECK</span><h2>9.7 is the floor. 26.7 is the horizon.</h2></div><div class="resource-actions">${link('demos','Open every deep dive')}</div></section>
  </div>`;
}

function release97() {
  return `<div class="page-stack"><section class="editorial-hero compact"><div class="eyebrow">MYSQL 9.7 · LONG-TERM SUPPORT · APRIL 2026</div><h1>The stable floor for the next MySQL chapter.</h1><p>MySQL 9.7 is the latest LTS release, a stable release with bug fixes. Its Community story spans availability, observability, the application data model, and query planning—not just replication. Select a pillar for its own implementation and evaluation guide.</p><div class="hero-actions">${link('duality','Start with JSON Duality','button-red')}${link('26','Continue to 26.7')}</div></section><section class="story-section"><div class="section-label">FOUR COMMUNITY PILLARS</div><h2>What 9.7 brings into focus.</h2><div class="feature-lines">${featureRow('ha97','01 / REPLICATION','Replication & HA','Applier metrics, GR flow-control statistics, resource management, and primary-election work.')}${featureRow('telemetry','02 / OBSERVABILITY','Telemetry','Compare polling with component push; follow Collector data into Grafana.')}${featureRow('duality','03 / APPLICATION','JSON Duality Views DML','INSERT, UPDATE, DELETE and auto-increment propagation for document-shaped views.')}${featureRow('hypergraph','04 / PERFORMANCE','Hypergraph optimizer','Why plans change, published results, and a five-step Sakila lab.')}</div></section><section class="story-section"><div class="section-label">RELEASE ROLE</div><h2>LTS and Innovation are different choices.</h2><div class="compare-banner"><div><span>MYSQL 9.7 LTS</span><h3>Stable feature set</h3><p>A long-term support foundation for production planning and measured adoption.</p></div><div class="compare-arrow" aria-hidden="true">→</div><div><span>MYSQL 26.7 INNOVATION</span><h3>New feature stream</h3><p>First calendar-version release and the home of CSA and five more highlighted changes.</p></div></div></section><div class="reference-line"><span>OFFICIAL REFERENCE</span><a href="https://dev.mysql.com/doc/relnotes/mysql/9.7/en/news-9-7-0.html" target="_blank" rel="noopener noreferrer">MySQL 9.7 release notes ↗</a></div></div>`;
}

function release26() {
  return `<div class="page-stack"><section class="editorial-hero compact"><div class="eyebrow">MYSQL 26.7 · INNOVATION · JULY 2026</div><h1>The first calendar-versioned MySQL release.</h1><p>26.7 begins YY.M.P versioning after 9.7. It is an Innovation release, not a renaming of the LTS line. The deck highlights six changes across replication, concurrency, HA, storage, TLS, and upgrade operations.</p><div class="hero-actions">${link('csa','Walk through CSA','button-red')}${link('97','Compare with 9.7 LTS')}</div></section><section class="story-section"><div class="section-label">SIX FEATURE DEEP DIVES</div><h2>Pick the operational question you need to answer.</h2><div class="feature-lines">${featureRow('csa','01 / REPLICATION','Change Stream Applier','Opt-in per-channel applier, MTA comparison, setup, benchmark, and rollback.')}${featureRow('threadpool','02 / CONCURRENCY','Thread Pool Community','Benchmark scheduling, connection load, and latency before enabling.')}${featureRow('grstack','03 / GROUP REPLICATION','MYSQL stack default','Inspect the new communication default and rehearse group behavior.')}${featureRow('undo','04 / INNODB','Undo truncation progress','Understand the tablespace-header change and post-upgrade validation.')}${featureRow('pqc','05 / TLS','Post-quantum cryptography','Check OpenSSL 3.5+, negotiated algorithms, and safe enforcement.')}${featureRow('upgrade','06 / OPERATIONS','Upgrade readiness','Validate the path, run prechecks, and rehearse the upgrade.')}</div></section><section class="notice-band"><strong>Alongside the release</strong><span>Enterprise dynamic masking policy is a separate edition-specific path. ${link('masking','View policy, role and outcome demo')}</span></section><div class="reference-line"><span>OFFICIAL REFERENCE</span><a href="https://dev.mysql.com/doc/relnotes/mysql/26.7/en/news-26-7-0.html" target="_blank" rel="noopener noreferrer">MySQL 26.7 release notes ↗</a></div></div>`;
}

function duality() {
  return `<div class="page-stack"><section class="editorial-hero compact"><div class="eyebrow">MYSQL 9.7 · APPLICATION MODEL · JSON DUALITY</div><h1>One data model. A document-shaped application view.</h1><p>A JSON Duality View projects related relational tables as hierarchical JSON without a second stored copy. In 9.7 Community, views gain INSERT, UPDATE, and DELETE support plus auto-increment propagation. The data remains relational; the application can work with a document shape.</p><div class="hero-actions"><button class="button-red" data-scroll="duality-run">View the SQL <span aria-hidden="true">↓</span></button>${link('97','Back to 9.7')}</div></section>
    <section class="story-section"><div class="section-label">THE DATA PATH</div><h2>Relational facts become an API-shaped document.</h2><div class="process-line"><div><span>01</span><strong>demo_customers</strong><small>Root table</small></div><b>→</b><div><span>02</span><strong>demo_orders</strong><small>Child table</small></div><b>→</b><div><span>03</span><strong>JSON Duality View</strong><small>Virtual mapping</small></div><b>→</b><div><span>04</span><strong>JSON document</strong><small>Read by app</small></div></div></section>
    <section class="story-section"><div class="section-label">9.7 COMMUNITY WRITE PATH</div><h2>Read and write the same aggregate.</h2><div class="editorial-list"><div><b>01 · Define</b><span>Choose a stable root identity and map child tables into one aggregate view.</span></div><div><b>02 · Validate</b><span>The server checks the document, annotations, and etag before mapping changes to rows.</span></div><div><b>03 · Execute</b><span>INSERT, UPDATE, or DELETE is applied atomically to underlying tables; generated identifiers can flow back.</span></div><div><b>04 · Check fit</b><span>Best for bounded business aggregates such as customer/order, catalog, or entitlement records—not append-only streams or documents without stable identity.</span></div></div><p class="caption-note">Review statement limitations before adoption; bulk LOAD DATA, INSERT SELECT, REPLACE, multi-document UPDATE, and ON DUPLICATE KEY UPDATE are not general substitutes for supported duality DML.</p></section>
    <section class="story-section" id="duality-run"><div class="section-label">OPTIONAL LOCAL EXECUTION</div><h2>Create the view and read Maya’s orders.</h2><p class="section-intro">The SQL below demonstrates the view using a local MySQL 26.7 server, which includes the 9.7 capability. The bundled server is currently unable to start on this machine; the page does not claim a connection until a query succeeds.</p><div class="dual-grid"><div class="code-panel"><div class="code-panel-head"><span>JSON_DUALITY.sql</span><span>MYSQL 26.7 RUNTIME</span></div><pre><code>CREATE OR REPLACE JSON DUALITY VIEW customer_orders_dv AS
SELECT JSON_DUALITY_OBJECT(
  '_id': customer_id,
  'customer_name': name,
  'tier': tier,
  'orders': (
    SELECT JSON_ARRAYAGG(JSON_DUALITY_OBJECT(
      'order_id': order_id,
      'product': product,
      'amount': amount
    )) FROM demo_orders
    WHERE demo_orders.customer_id = demo_customers.customer_id)
) FROM demo_customers;

SELECT data FROM customer_orders_dv
WHERE JSON_EXTRACT(data, '$._id') = 101;</code></pre><button class="button-red" id="executeDuality">Execute locally <span aria-hidden="true">▶</span></button></div><div class="result-panel"><div class="code-panel-head"><span>RESULT.JSON</span><span id="outputMeta">NOT RUN</span></div><pre id="queryOutput" aria-live="polite">Run the query to see the live JSON result. No result is simulated.</pre></div></div><p class="source-line"><a href="https://dev.mysql.com/doc/refman/9.7/en/json-duality-views.html" target="_blank" rel="noopener noreferrer">MySQL 9.7 JSON Duality documentation ↗</a></p></section></div>`;
}

function demos() {
  return `<div class="page-stack"><section class="editorial-hero compact"><div class="eyebrow">FEATURE LIBRARY · THE PPT IN DEMO FORM</div><h1>One release map. Eleven focused paths.</h1><p>Follow the presentation flow: four 9.7 Community pillars, six 26.7 Innovation highlights, then Enterprise masking. Each feature has its own context and evaluation steps. The telemetry page can send a synthetic Collector sample and import local OTLP/HTTP JSON; JSON Duality has an optional local database action. Other guides are instructional.</p></section><section class="story-section"><div class="section-label">MYSQL 9.7 LTS · COMMUNITY</div><h2>Four foundation pillars.</h2><div class="feature-lines">${featureRow('ha97','01 / HA','Replication & HA','Measure apply, group flow control, and failover behavior.')}${featureRow('telemetry','02 / SIGNALS','Telemetry','Compare polling and push, configure OTLP, observe in Grafana.')}${featureRow('duality','03 / DATA','JSON Duality Views','Model and query a customer aggregate; review 9.7 DML support.')}${featureRow('hypergraph','04 / SQL','Hypergraph optimizer','Understand the plan, inspect benchmarks, and follow the Sakila lab.')}</div></section><section class="story-section"><div class="section-label">MYSQL 26.7 · INNOVATION</div><h2>Six changes to test.</h2><div class="feature-lines">${featureRow('csa','01 / REPLICATION','Change Stream Applier','Five-step benchmark, configuration, monitoring, rollback.')}${featureRow('threadpool','02 / CONCURRENCY','Thread Pool','Benchmark high-connection behavior.')}${featureRow('grstack','03 / HA','GR MYSQL stack','Rehearse the default communication stack.')}${featureRow('undo','04 / STORAGE','InnoDB undo','Verify truncation and recovery after upgrade.')}${featureRow('pqc','05 / TLS','Post-quantum TLS','Verify actual TLS negotiation before enforcement.')}${featureRow('upgrade','06 / OPERATIONS','Upgrade readiness','Precheck, stage, validate.')}</div></section><section class="story-section"><div class="section-label">MYSQL ENTERPRISE · BOTH RELEASES</div><h2>Separate edition path.</h2><div class="feature-lines">${featureRow('masking','POLICY / ROLE','Dynamic data masking','Install the policy component, assign a column policy, and compare role outcomes.')}</div></section></div>`;
}

const pages = {overview,'97':release97,'26':release26,csa:()=>csaDemo.render(),masking:()=>maskingDemo.render(),duality,demos,...Object.fromEntries(Object.keys(featureGuides).map(key=>[key,()=>renderFeatureGuide(key)])),hypergraph:()=>hypergraphDemo.render(),telemetry:()=>telemetryDemo.render()};
let currentPage = '';

function render(page, pushHash=true) {
  if (!pages[page]) page='overview';
  if (currentPage===page && content.children.length) return;
  currentPage=page;
  content.innerHTML=pages[page]();
  crumb.textContent=pageNames[page].toUpperCase();
  document.querySelectorAll('.nav-item').forEach(button=>{const active=button.dataset.page===page;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');});
  document.body.classList.toggle('masking-theme',page==='masking');
  sidebar.classList.remove('open');
  mobileMenu.setAttribute('aria-expanded','false');
  if (pushHash && location.hash!==`#${page}`) history.replaceState(null,'',`#${page}`);
  window.scrollTo({top:0,behavior:'auto'});
}

async function executeDuality() {
  const button=document.getElementById('executeDuality');
  const output=document.getElementById('queryOutput');
  const meta=document.getElementById('outputMeta');
  if(!button) return;
  button.disabled=true; button.textContent='Running…'; meta.textContent='QUERYING LOCAL SERVER';
  output.textContent='Waiting for MySQL…';
  try {
    const response=await fetch('/api/json-duality-run',{method:'POST'});
    const body=await response.json();
    if(!response.ok) throw new Error(body.error||'Query failed');
    output.textContent=JSON.stringify(body.document,null,2);
    meta.textContent=`LIVE · ${body.elapsedMs} MS`;
  } catch(error) {
    output.textContent=`Local execution unavailable: ${error.message}\n\nStart a compatible MySQL 26.7 server and try again.`;
    meta.textContent='NOT CONNECTED';
  } finally { button.disabled=false; button.innerHTML='Run again <span aria-hidden="true">↻</span>'; }
}

function updateThreadPoolScorecard() {
  const ids=['tpDefaultTps','tpPoolTps','tpDefaultP95','tpPoolP95'];
  const fields=ids.map(id=>document.getElementById(id));
  const result=document.getElementById('tpResult');
  if(!result) return;
  const values=fields.map(field=>Number(field?.value));
  if(fields.some((field,i)=>!field?.value||!Number.isFinite(values[i])||values[i]<=0)) {
    result.textContent='Enter your measured throughput and p95 values. No result is simulated.';
    return;
  }
  const [defaultTps,poolTps,defaultP95,poolP95]=values;
  const tpsChange=((poolTps-defaultTps)/defaultTps*100).toFixed(1);
  const p95Change=((poolP95-defaultP95)/defaultP95*100).toFixed(1);
  result.textContent=`Your Thread Pool run: TPS ${Number(tpsChange)>=0?'+':''}${tpsChange}% and p95 latency ${Number(p95Change)>=0?'+':''}${p95Change}% versus default. ${poolTps>defaultTps&&poolP95<=defaultP95?'Both measured signals improved.':'Review the trade-off, errors, and target SLA before deciding.'}`;
}

document.addEventListener('click',event=>{
  if(csaDemo.handleClick(event) || maskingDemo.handleClick(event) || hypergraphDemo.handleClick(event) || telemetryDemo.handleClick(event)) return;
  const nav=event.target.closest('[data-page], [data-page-link]');
  if(nav){render(nav.dataset.page||nav.dataset.pageLink);return;}
  const scroll=event.target.closest('[data-scroll]');
  if(scroll){document.getElementById(scroll.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(event.target.closest('#executeDuality')) executeDuality();
});
document.addEventListener('input',event=>{csaDemo.handleInput(event);hypergraphDemo.handleInput(event);if(event.target?.matches?.('#tpDefaultTps, #tpPoolTps, #tpDefaultP95, #tpPoolP95'))updateThreadPoolScorecard();});
document.addEventListener('change',event=>telemetryDemo.handleChange(event));

mobileMenu.addEventListener('click',()=>{const open=sidebar.classList.toggle('open');mobileMenu.setAttribute('aria-expanded',String(open));});
window.addEventListener('hashchange',()=>render(location.hash.slice(1),false));
render(location.hash.slice(1)||'overview',false);
