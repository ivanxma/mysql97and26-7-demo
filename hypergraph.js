const hypergraphSteps = [
  {
    label:'Prepare', title:'Use one server and one fixed dataset',
    intro:'Install MySQL 9.7 Community and load the official Sakila sample database on a disposable server. Keep schema, indexes, and data unchanged between passes.',
    blocks:[
      {label:'Verify the server',code:'SELECT VERSION(), @@optimizer_switch;'},
      {label:'Load Sakila in the mysql client',code:'SOURCE /path/sakila-schema.sql;\nSOURCE /path/sakila-data.sql;'}
    ],
    outcome:'Confirm version 9.7 and hypergraph_optimizer=off. Download the Sakila archive from the official MySQL sample-database page.'
  },
  {
    label:'Query', title:'Create one six-table reporting query',
    intro:'This view joins film, category, inventory, rental, and payment data. It is deliberately the same query for both optimizer passes.',
    blocks:[{label:'Create the lab view',code:`CREATE OR REPLACE VIEW sakila.hypergraph_demo AS
SELECT f.film_id, f.title, COUNT(*) AS rentals
FROM sakila.film f
JOIN sakila.film_category fc ON fc.film_id = f.film_id
JOIN sakila.category c ON c.category_id = fc.category_id
JOIN sakila.inventory i ON i.film_id = f.film_id
JOIN sakila.rental r ON r.inventory_id = i.inventory_id
JOIN sakila.payment p ON p.rental_id = r.rental_id
WHERE c.name = 'Action'
GROUP BY f.film_id, f.title;`}],
    outcome:'The view is ready. Sakila is small: the lab demonstrates plan inspection and fair measurement, not a guaranteed speedup.'
  },
  {
    label:'Classic', title:'Capture the classic plan and baseline',
    intro:'Disable Hypergraph for this session. EXPLAIN ANALYZE executes the query and reports actual iterator timing; measure repeated un-explained SELECT runs separately.',
    blocks:[{label:'Run the baseline',code:`SET SESSION optimizer_switch='hypergraph_optimizer=off';
EXPLAIN ANALYZE
SELECT * FROM sakila.hypergraph_demo
ORDER BY rentals DESC, film_id LIMIT 20;

-- Repeat the same SELECT at least five times for timing:
SELECT * FROM sakila.hypergraph_demo
ORDER BY rentals DESC, film_id LIMIT 20;`}],
    outcome:'Save the plan, result rows, and median runtime. Record join order, method, actual rows, loops, and sort or temporary-table work.'
  },
  {
    label:'Hypergraph', title:'Change only the optimizer',
    intro:'Keep the same server session, data, view, and SELECT. Enabling the switch at session scope avoids changing unrelated application connections.',
    blocks:[{label:'Run the comparison',code:`SET SESSION optimizer_switch='hypergraph_optimizer=on';
EXPLAIN ANALYZE
SELECT * FROM sakila.hypergraph_demo
ORDER BY rentals DESC, film_id LIMIT 20;

-- Repeat the identical SELECT at least five times:
SELECT * FROM sakila.hypergraph_demo
ORDER BY rentals DESC, film_id LIMIT 20;`}],
    outcome:'Save a second plan and median runtime. If the build does not support Hypergraph, check the server version and build configuration.'
  },
  {
    label:'Decide', title:'Explain any difference and reset',
    intro:'Compare actual work, not just estimated cost. A faster query should have the same result and a defensible plan change, such as fewer repeated probes or less sorting.',
    blocks:[{label:'Reset the session',code:`SET SESSION optimizer_switch='hypergraph_optimizer=off';
SELECT @@optimizer_switch;`}],
    outcome:'Use the calculator below for your observed medians. Test production-like data before a global change; a slower or unchanged result is valid evidence.'
  }
];

const hypergraphDemo = (() => {
  let activeStep = 0;
  const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function stepPanel() {
    const step=hypergraphSteps[activeStep];
    return `<div class="csa-step-head"><span class="step-count">STEP ${activeStep+1} / ${hypergraphSteps.length} · SAKILA LAB</span><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.intro)}</p></div>
      <div class="csa-step-code hypergraph-step-code">${step.blocks.map((block,i)=>`<div class="code-panel"><div class="code-panel-head"><span>${escapeHtml(block.label)}</span><button data-hypergraph-copy="${i}" aria-label="Copy ${escapeHtml(block.label)} SQL">Copy</button></div><pre><code>${escapeHtml(block.code)}</code></pre></div>`).join('')}</div>
      <div class="csa-expected"><strong>WHAT TO LOOK FOR</strong><span>${escapeHtml(step.outcome)}</span></div>
      <div class="step-controls"><button data-hypergraph-prev ${activeStep===0?'disabled':''}>← Previous</button><span>${activeStep+1} of ${hypergraphSteps.length}</span><button data-hypergraph-next ${activeStep===hypergraphSteps.length-1?'disabled':''}>Next step →</button></div>`;
  }

  function render() {
    return `<div class="hypergraph-page page-stack">
      <section class="editorial-hero hypergraph-hero"><div class="eyebrow">MYSQL 9.7 LTS · COMMUNITY · QUERY PERFORMANCE</div><h1>Hypergraph Optimizer</h1><p>A different way to search join plans. See why join order, join method, and row order can change runtime; inspect published evidence; then run a controlled comparison on Sakila.</p><div class="hero-actions"><button class="button-red" data-scroll="hypergraph-lab">Start the Sakila demo <span aria-hidden="true">↓</span></button><a class="text-link" href="outputs/hypergraph-optimizer-deep-dive-oracle-style.pptx" download>Download the deep-dive PPT <span aria-hidden="true">↗</span></a></div><div class="hero-rail"><span>BACKGROUND</span><b>→</b><span>WHY HYPERGRAPH</span><b>→</b><span>BENCHMARKS</span><b>→</b><span>DEMO</span></div></section>

      <section class="story-section"><div class="section-label">01 · BACKGROUND</div><h2>The same SQL can have many valid plans.</h2><p class="section-intro">The optimizer chooses an access path, join order, and join method before the executor reads rows. Those choices decide how much work happens before the same correct answer is returned.</p><div class="process-line mechanism"><div><span>SQL</span><strong>One SELECT</strong><small>Tables and predicates</small></div><b>→</b><div><span>OPTIMIZER</span><strong>Search plans</strong><small>Estimate work</small></div><b>→</b><div><span>EXECUTOR</span><strong>Read + join</strong><small>Actual work</small></div><b>→</b><div><span>RESULT</span><strong>Same rows</strong><small>Different latency</small></div></div></section>

      <section class="story-section"><div class="section-label">02 · THE CHALLENGE</div><h2>Complex joins can hide better plans.</h2><div class="editorial-list numbered"><div><b>01 / Join shapes</b><span>Legal join orders multiply as more tables and predicates enter the query.</span></div><div><b>02 / Useful row order</b><span>A locally cheap path can force a costly sort later for ORDER BY, GROUP BY, or DISTINCT.</span></div><div><b>03 / Join method</b><span>Many repeated index probes may cost more than scanning and hashing once.</span></div></div></section>

      <section class="story-section"><div class="section-label">03 · WHY HYPERGRAPH</div><h2>It keeps more useful alternatives in the plan search.</h2><p class="section-intro">The classic optimizer mainly explores left-deep joins. Hypergraph models tables and predicates as a graph, enumerates legal connected subplans—including bushy joins—and compares access paths, hash versus nested-loop joins, and useful output orders in one costed search.</p><div class="hypergraph-model"><div><span>01</span><strong>Model</strong><small>Tables are nodes; join predicates are edges.</small></div><div><span>02</span><strong>Enumerate</strong><small>Keep legal connected subplans.</small></div><div><span>03</span><strong>Cost</strong><small>Compare join methods and interesting orders.</small></div><div><span>04</span><strong>Select</strong><small>Execute the lowest estimated-cost route.</small></div></div><p class="takeaway-line">A slightly costlier early path may win overall if it avoids a later sort or reduces rows before the remaining joins.</p></section>

      <section class="story-section"><div class="section-label">04 · CLASSIC VS HYPERGRAPH</div><h2>Where the search can lead to a better plan.</h2><div class="comparison-wrap"><table class="comparison-table"><thead><tr><th>Decision</th><th>Classic join optimizer</th><th>Hypergraph optimizer</th></tr></thead><tbody><tr><th>Join shape</th><td>Mostly left-deep plans</td><td>Connected partitions; bushy plans possible</td></tr><tr><th>Join method</th><td>Indexed nested loops often favored</td><td>Cost-based hash versus nested-loop comparison</td></tr><tr><th>Row order</th><td>Often refined late</td><td>Interesting orders retained during search</td></tr><tr><th>MySQL 9.7 Community</th><td>Default</td><td>Available, but opt-in</td></tr></tbody></table></div><p class="caption-note">A different plan is not proof of faster execution. Use actual rows, loops, sorts, and repeated latency measurements.</p></section>

      <section class="story-section"><div class="section-label">05 · PUBLISHED BENCHMARK</div><h2>Oracle saw broad gains—and real regressions.</h2><p class="section-intro">In Oracle’s TPC-DS scale-factor-1 run, approximately 1 GB of data fit in memory. The numbers below describe that published run, not this web demo or the Sakila lab.</p><div class="benchmark-band"><div><strong>77<span>/101</span></strong><small>query variants faster</small></div><div><strong>22.45<span>%</span></strong><small>geometric-mean runtime improvement</small></div><div><strong>24<span>/101</span></strong><small>query variants slower</small></div></div><p class="caption-note">19 improved by at least 50%; 14 regressed by at least 50%. Cardinality estimates can still produce a worse plan. <a href="https://blogs.oracle.com/mysql/the-hypergraph-optimizer-is-now-available-in-mysql-9-7-community-edition" target="_blank" rel="noopener noreferrer">Oracle MySQL Optimizer Team benchmark ↗</a></p></section>

      <section class="story-section"><div class="section-label">06 · WHY ONE QUERY GOT FASTER</div><h2>An early hash join changed the work done downstream.</h2><p class="section-intro">Oracle’s published eight-table reporting example used the same SQL, schema, and data. Only the optimizer choice changed.</p><div class="plan-comparison"><div><span>CLASSIC PLAN</span><strong>≈451 ms</strong><p>Scan archived orders, then follow a long nested-loop chain with repeated lookups.</p></div><div class="plan-divider" aria-hidden="true">→</div><div><span>HYPERGRAPH PLAN</span><strong>≈122 ms</strong><p>Use a date-range scan and early hash join, reducing rows before later lookups; a covering category lookup also helps.</p></div></div><p class="takeaway-line">The faster plan does less repeated work. This is a published example, not a promised 3.7× gain for another dataset.</p><p class="source-line"><a href="https://blogs.oracle.com/mysql/smarter-join-planning-with-the-hypergraph-optimizer" target="_blank" rel="noopener noreferrer">Read Oracle’s query and plan breakdown ↗</a></p></section>

      <section class="story-section" id="hypergraph-lab"><div class="section-label">07 · STEP-BY-STEP DEMO</div><h2>Run a controlled Sakila comparison.</h2><p class="section-intro">The web page does not execute these statements. Run them on a disposable MySQL 9.7 Community server and use the same data and client setup for both passes.</p><div class="step-tabs" role="tablist" aria-label="Hypergraph demo steps">${hypergraphSteps.map((step,i)=>`<button role="tab" data-hypergraph-step="${i}" aria-selected="${i===activeStep}" class="${i===activeStep?'selected':''}"><span>${String(i+1).padStart(2,'0')}</span>${escapeHtml(step.label)}</button>`).join('')}</div><div class="csa-step-panel" id="hypergraph-step-panel">${stepPanel()}</div></section>

      <section class="story-section"><div class="section-label">08 · COMPARE YOUR RESULTS</div><h2>Enter your measured median runtimes.</h2><div class="measurement-grid"><label>Classic optimizer · milliseconds<input type="number" min="0" step="0.01" inputmode="decimal" id="classicMedian" placeholder="Measured median"></label><label>Hypergraph optimizer · milliseconds<input type="number" min="0" step="0.01" inputmode="decimal" id="hypergraphMedian" placeholder="Measured median"></label><div class="measurement-result" id="hypergraphResult" aria-live="polite">Enter both measured medians to compare them.</div></div><p class="caption-note">The calculator uses only your entries. Compare result correctness, p95 latency, CPU, join order, actual rows and loops, and sorting before deciding to enable the optimizer more broadly.</p></section>

      <div class="reference-line"><span>OFFICIAL SOURCES</span><a href="https://blogs.oracle.com/mysql/the-hypergraph-optimizer-is-now-available-in-mysql-9-7-community-edition" target="_blank" rel="noopener noreferrer">Optimizer team ↗</a><a href="https://blogs.oracle.com/mysql/smarter-join-planning-with-the-hypergraph-optimizer" target="_blank" rel="noopener noreferrer">Plan example ↗</a><a href="https://dev.mysql.com/doc/refman/9.7/en/explain.html" target="_blank" rel="noopener noreferrer">EXPLAIN ANALYZE ↗</a><a href="https://dev.mysql.com/doc/sakila/en/sakila-installation.html" target="_blank" rel="noopener noreferrer">Sakila setup ↗</a></div>
    </div>`;
  }

  function selectStep(index) {
    if(index<0||index>=hypergraphSteps.length) return;
    activeStep=index;
    document.querySelectorAll('[data-hypergraph-step]').forEach(button=>{const selected=Number(button.dataset.hypergraphStep)===index;button.classList.toggle('selected',selected);button.setAttribute('aria-selected',String(selected));});
    const panel=document.getElementById('hypergraph-step-panel');
    if(panel) panel.innerHTML=stepPanel();
    document.getElementById('hypergraph-lab')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function updateMeasurement() {
    const classic=Number(document.getElementById('classicMedian')?.value);
    const hypergraph=Number(document.getElementById('hypergraphMedian')?.value);
    const result=document.getElementById('hypergraphResult');
    if(!result) return;
    if(!Number.isFinite(classic)||!Number.isFinite(hypergraph)||classic<=0||hypergraph<=0){result.textContent='Enter both measured medians to compare them.';return;}
    const reduction=Math.abs((classic-hypergraph)/classic*100).toFixed(1);
    if(hypergraph<classic) result.textContent=`Hypergraph runtime was ${reduction}% lower in your runs (${classic} ms → ${hypergraph} ms; ${(classic/hypergraph).toFixed(2)}× speedup).`;
    else if(hypergraph>classic) result.textContent=`Hypergraph runtime was ${reduction}% higher in your runs (${classic} ms → ${hypergraph} ms).`;
    else result.textContent=`Both medians were ${classic} ms. No runtime difference measured.`;
  }

  function handleClick(event) {
    const target=event.target;
    if(!(target instanceof Element)) return false;
    const step=target.closest('[data-hypergraph-step]');
    if(step){selectStep(Number(step.dataset.hypergraphStep));return true;}
    if(target.closest('[data-hypergraph-prev]')){selectStep(activeStep-1);return true;}
    if(target.closest('[data-hypergraph-next]')){selectStep(activeStep+1);return true;}
    const copy=target.closest('[data-hypergraph-copy]');
    if(copy){
      const code=hypergraphSteps[activeStep].blocks[Number(copy.dataset.hypergraphCopy)]?.code;
      if(!code) return true;
      if(navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(()=>{copy.textContent='Copied';setTimeout(()=>{if(copy.isConnected)copy.textContent='Copy';},1500);}).catch(()=>{copy.textContent='Select code to copy';});
      else copy.textContent='Select code to copy';
      return true;
    }
    return false;
  }

  function handleInput(event){if(event.target?.matches?.('#classicMedian, #hypergraphMedian')) updateMeasurement();}
  return {render,handleClick,handleInput};
})();
