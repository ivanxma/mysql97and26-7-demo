const csaSteps = [
  {
    label:'Preflight', title:'Confirm the channel is eligible', who:'SOURCE + REPLICA',
    intro:'Begin with an existing, healthy replication channel named channel_1. The 26.7 replica can receive changes from a 9.7 source when these requirements are met.',
    checks:['Source uses row-based binary logging and GTID mode ON.','Replica channel uses auto-position, GTID_ONLY, REQUIRE_ROW_FORMAT, and no delay.','Confirm the baseline applier is MTA version 1.'],
    blocks:[
      {label:'On the source',code:`SELECT @@version, @@binlog_format, @@gtid_mode;`},
      {label:'On the replica',code:`SHOW REPLICA STATUS FOR CHANNEL 'channel_1'\\G

SELECT CHANNEL_NAME, APPLIER_VERSION
FROM performance_schema.replication_applier_configuration
WHERE CHANNEL_NAME = 'channel_1';`}
    ],
    outcome:'Expected: ROW and ON on the source; healthy receiver and applier threads; APPLIER_VERSION = 1 for the MTA baseline.'
  },
  {
    label:'Workload', title:'Prepare repeatable concurrent writes', who:'SOURCE + LOAD DRIVER',
    intro:'Use one lab schema and a load driver with sysbench installed. Keep the same tables, threads, and duration in the MTA and CSA passes. Supply credentials through a protected option file or environment-specific secret mechanism.',
    checks:['Create the lab schema on the source.','Use a lab account with the necessary rights on csa_lab.','Prepare eight sysbench tables before either timed pass.'],
    blocks:[
      {label:'On the source',code:`CREATE DATABASE IF NOT EXISTS csa_lab;`},
      {label:'On the load driver',code:`sysbench oltp_write_only --db-driver=mysql \\
  --mysql-host=SOURCE_HOST --mysql-user=BENCH_USER \\
  --mysql-db=csa_lab --tables=8 --table-size=10000 prepare`}
    ],
    outcome:'Expected: eight prepared tables replicate to the replica before timing begins.'
  },
  {
    label:'MTA baseline', title:'Create a backlog, then time MTA drain', who:'REPLICA + LOAD DRIVER',
    intro:'MTA is version 1. Stop only the SQL thread to accumulate relay-log work while the receiver stays active. Run the source load, restart apply, and time catch-up.',
    checks:['Set version 1 with the applier stopped if needed.','Stop only SQL_THREAD, run the write load, then restart SQL_THREAD.','Record drain time, lag, CPU, memory, and any errors. Repeat for normal variation.'],
    blocks:[
      {label:'On the replica',code:`STOP REPLICA FOR CHANNEL 'channel_1';
CHANGE REPLICATION SOURCE TO APPLIER_VERSION = 1
FOR CHANNEL 'channel_1';
START REPLICA FOR CHANNEL 'channel_1';

STOP REPLICA SQL_THREAD FOR CHANNEL 'channel_1';
-- Run the load below while the SQL thread is stopped.
START REPLICA SQL_THREAD FOR CHANNEL 'channel_1';`},
      {label:'On the load driver, between STOP and START',code:`sysbench oltp_write_only --db-driver=mysql \\
  --mysql-host=SOURCE_HOST --mysql-user=BENCH_USER \\
  --mysql-db=csa_lab --tables=8 --threads=16 --time=60 run`}
    ],
    outcome:'Expected: a measured MTA backlog-drain time. Do not interpret a single small run as a performance guarantee.'
  },
  {
    label:'Enable CSA', title:'Switch only this channel to CSA', who:'REPLICA',
    intro:'Stop the applier before changing the implementation or CSA-specific worker and event-memory settings. The 2 GiB memory limit below is an example, not a universal recommendation.',
    checks:['Stop replication for the target channel.','Set APPLIER_VERSION = 2 and the per-channel controls.','Restart the channel and confirm version 2 in Performance Schema.'],
    blocks:[
      {label:'On the replica',code:`STOP REPLICA FOR CHANNEL 'channel_1';

CHANGE REPLICATION SOURCE TO
  APPLIER_VERSION = 2,
  APPLIER_WORKER_COUNT = 8,
  APPLIER_EVENT_MEMORY_LIMIT = 2147483648,
  SOURCE_AUTO_POSITION = 1,
  GTID_ONLY = 1,
  REQUIRE_ROW_FORMAT = 1,
  SOURCE_DELAY = 0
FOR CHANNEL 'channel_1';

START REPLICA FOR CHANNEL 'channel_1';`}
    ],
    outcome:'Expected: APPLIER_VERSION = 2 and APPLIER_WORKER_COUNT = 8 for channel_1.'
  },
  {
    label:'Measure CSA', title:'Repeat, monitor, and decide', who:'REPLICA + LOAD DRIVER',
    intro:'Repeat the same stop → 60-second write load → start sequence. Capture CSA drain time and inspect worker state. Compare several representative runs, not a single headline number.',
    checks:['Repeat the same 16-thread, 60-second sysbench load.','Measure time until the replica catches up.','Inspect channel configuration, workers, lag, errors, CPU, and event-cache use.'],
    blocks:[
      {label:'On the replica · replay the sequence',code:`STOP REPLICA SQL_THREAD FOR CHANNEL 'channel_1';
-- Run the same sysbench command from step 3.
START REPLICA SQL_THREAD FOR CHANNEL 'channel_1';

SHOW REPLICA STATUS FOR CHANNEL 'channel_1'\\G`},
      {label:'Inspect CSA configuration and workers',code:`SELECT CHANNEL_NAME, APPLIER_VERSION,
       APPLIER_WORKER_COUNT, APPLIER_EVENT_MEMORY_LIMIT
FROM performance_schema.replication_applier_configuration;

SELECT CHANNEL_NAME, WORKER_ID, SERVICE_STATE,
       APPLYING_TRANSACTION, LAST_ERROR_NUMBER
FROM performance_schema.replication_applier_status_by_worker;`}
    ],
    outcome:'Decision: keep CSA only when measured backlog drain or steady-state lag improves without unacceptable resource use or errors.'
  }
];

const csaDemo = (() => {
  let activeStep=0;
  const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function tutorialPanel() {
    const step=csaSteps[activeStep];
    return `<div class="csa-step-head"><div><span class="step-count">STEP ${activeStep+1} / ${csaSteps.length} · ${escapeHtml(step.who)}</span><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.intro)}</p></div></div>
      <div class="csa-checklist">${step.checks.map((check,i)=>`<div><span>${String(i+1).padStart(2,'0')}</span><p>${escapeHtml(check)}</p></div>`).join('')}</div>
      <div class="csa-step-code">${step.blocks.map((block,index)=>`<div class="code-panel"><div class="code-panel-head"><span>${escapeHtml(block.label)}</span><button data-csa-copy="${index}">Copy</button></div><pre><code>${escapeHtml(block.code)}</code></pre></div>`).join('')}</div>
      <div class="csa-expected"><strong>WHAT TO LOOK FOR</strong><span>${escapeHtml(step.outcome)}</span></div>
      <div class="step-controls"><button data-csa-prev ${activeStep===0?'disabled':''}>← Previous</button><span>${activeStep+1} of ${csaSteps.length}</span><button data-csa-next ${activeStep===csaSteps.length-1?'disabled':''}>Next step →</button></div>`;
  }

  function render() {
    return `<div class="csa-page page-stack">
      <section class="editorial-hero csa-hero"><div class="eyebrow">MYSQL 26.7 · REPLICATION FEATURE</div><h1>Change Stream Applier</h1><p>A new execution model for parallel replica apply. Understand why it exists, compare it with MTA, then run a controlled backlog-drain evaluation on a row-based GTID channel.</p><div class="hero-actions"><button class="button-red" data-scroll="csa-tutorial">Start the tutorial <span aria-hidden="true">↓</span></button><a class="text-link" href="outputs/change-stream-applier-oracle-style.pptx" download>Download the PowerPoint <span aria-hidden="true">↗</span></a></div><div class="hero-rail"><span>BACKGROUND</span><b>→</b><span>WHY CSA</span><b>→</b><span>IMPLEMENTATION</span><b>→</b><span>DEMO</span></div></section>
      <section class="story-section" id="csa-background"><div class="section-label">01 · BACKGROUND</div><h2>Replication still has to apply every change.</h2><p class="section-intro">The source writes events to its binary log. A replica receives and stores them in relay logs, then its applier executes and commits them. If apply is slower than incoming writes, lag and backlog grow.</p><div class="process-line"><div><span>01</span><strong>Source</strong><small>Binary log</small></div><b>→</b><div><span>02</span><strong>Receiver</strong><small>Transport</small></div><b>→</b><div><span>03</span><strong>Relay log</strong><small>Queued events</small></div><b>→</b><div><span>04</span><strong>Applier</strong><small>Execute + commit</small></div><b>→</b><div><span>05</span><strong>Replica</strong><small>Current data</small></div></div></section>
      <section class="story-section"><div class="section-label">02 · CHALLENGES</div><h2>Backlog recovery exposes applier limits.</h2><div class="editorial-list numbered"><div><b>01 / Bursts</b><span>A replica must drain work accumulated after traffic spikes or interruptions.</span></div><div><b>02 / Queue pressure</b><span>MTA’s coordinator reads transactions and assigns them to worker queues.</span></div><div><b>03 / Commit waiting</b><span>Ordered commits can leave an applied worker waiting for an earlier transaction.</span></div></div></section>
      <section class="story-section"><div class="section-label">03 · WHY CSA</div><h2>Ready transactions move through a worker pool.</h2><p class="section-intro">CSA uses GTID event dependency metadata—<code>last_committed</code> and <code>sequence_number</code>—to schedule transactions whose dependencies are satisfied. When commit order is preserved, apply and commit progression are scheduled separately.</p><div class="process-line mechanism"><div><span>GTID EVENTS</span><strong>Dependencies</strong><small>last_committed / sequence_number</small></div><b>→</b><div><span>SCHEDULER</span><strong>Ready work</strong><small>Dependency-aware</small></div><b>→</b><div><span>WORKERS</span><strong>Parallel apply</strong><small>Channel-specific pool</small></div><b>→</b><div><span>COMMIT</span><strong>Source order</strong><small>When enabled</small></div></div><p class="takeaway-line">A worker that finishes applying a transaction can take another ready one instead of waiting for its commit turn.</p></section>
      <section class="story-section"><div class="section-label">04 · WITH AND WITHOUT CSA</div><h2>Two appliers. Different execution models.</h2><div class="comparison-wrap"><table class="comparison-table"><thead><tr><th>Dimension</th><th>Without CSA · MTA v1</th><th>With CSA · CSA v2</th></tr></thead><tbody><tr><th>Default</th><td>Default for new channels</td><td>Opt in per channel</td></tr><tr><th>Scheduling</th><td>Coordinator assigns work to queues</td><td>Dependency scheduler feeds a worker pool</td></tr><tr><th>Commit order</th><td>A worker may wait for its turn</td><td>Apply worker may take the next ready job</td></tr><tr><th>Workers</th><td><code>replica_parallel_workers</code></td><td><code>APPLIER_WORKER_COUNT</code> per channel</td></tr><tr><th>Event memory</th><td><code>replica_pending_jobs_size_max</code></td><td><code>APPLIER_EVENT_MEMORY_LIMIT</code> per channel</td></tr></tbody></table></div><p class="caption-note">CSA is not guaranteed to be faster for every workload. Measure with your own data and concurrency.</p></section>
      <section class="story-section"><div class="section-label">05 · READINESS</div><h2>Only qualifying GTID channels can use CSA.</h2><div class="requirements-grid"><div><h3>Required</h3><ul><li>MySQL 26.7 replica</li><li>Row-based binary logging on the source</li><li><code>gtid_mode = ON</code></li><li><code>SOURCE_AUTO_POSITION = 1</code></li><li><code>GTID_ONLY = 1</code> and <code>REQUIRE_ROW_FORMAT = 1</code></li><li><code>SOURCE_DELAY = 0</code></li></ul></div><div><h3>Not supported by CSA</h3><ul><li>Statement or mixed binary logs</li><li>File/position replication</li><li>Delayed applier mode</li><li>Assigning GTIDs to anonymous transactions</li><li>Partial-transaction skip counter</li></ul></div></div></section>
      <section class="story-section"><div class="section-label">06 · IMPLEMENTATION</div><h2>Change one channel, then validate it.</h2><div class="editorial-list numbered"><div><b>01 / Qualify</b><span>Check source binlog format, GTIDs, and channel options.</span></div><div><b>02 / Baseline</b><span>Record MTA version, lag, backlog drain, CPU, and memory.</span></div><div><b>03 / Switch</b><span>Stop the applier, set <code>APPLIER_VERSION = 2</code>, then restart.</span></div><div><b>04 / Validate</b><span>Inspect worker status and repeat the same controlled load.</span></div></div></section>
      <section class="story-section csa-tutorial" id="csa-tutorial"><div class="section-label">07 · STEP-BY-STEP DEMO</div><h2>Evaluate CSA against the MTA baseline.</h2><p class="section-intro">This is a guided tutorial, not a live replication connection. Run the commands on your own non-critical topology and enter your measured times below.</p><div class="step-tabs" role="tablist" aria-label="CSA tutorial steps">${csaSteps.map((step,i)=>`<button role="tab" data-csa-step="${i}" aria-selected="${i===activeStep}" class="${i===activeStep?'selected':''}"><span>${String(i+1).padStart(2,'0')}</span>${escapeHtml(step.label)}</button>`).join('')}</div><div class="csa-step-panel" id="csa-step-panel">${tutorialPanel()}</div></section>
      <section class="story-section measure-section"><div class="section-label">08 · COMPARE YOUR RUNS</div><h2>Use observed drain time, not assumed gains.</h2><div class="measurement-grid"><label>Without CSA · MTA seconds<input type="number" min="0" step="0.1" inputmode="decimal" id="mtaTime" placeholder="Enter measured time"></label><label>With CSA · CSA seconds<input type="number" min="0" step="0.1" inputmode="decimal" id="csaTime" placeholder="Enter measured time"></label><div class="measurement-result" id="measurementResult" aria-live="polite">Enter both times to compare the two runs.</div></div><p class="caption-note">For a fair test, repeat both passes with representative writes and compare lag, CPU, memory, and errors alongside time.</p></section>
      <section class="story-section rollback-section"><div class="section-label">09 · ROLLBACK</div><h2>Return the channel to MTA if needed.</h2><div class="code-panel"><div class="code-panel-head"><span>On the replica</span><button data-csa-rollback-copy>Copy</button></div><pre><code>STOP REPLICA FOR CHANNEL 'channel_1';
CHANGE REPLICATION SOURCE TO APPLIER_VERSION = 1
FOR CHANNEL 'channel_1';
START REPLICA FOR CHANNEL 'channel_1';</code></pre></div></section>
      <div class="reference-line"><span>OFFICIAL REFERENCES</span><a href="https://dev.mysql.com/doc/refman/26.7/en/change-stream-applier.html" target="_blank" rel="noopener noreferrer">Overview ↗</a><a href="https://dev.mysql.com/doc/refman/26.7/en/change-stream-applier-configuration.html" target="_blank" rel="noopener noreferrer">Configuration ↗</a><a href="https://dev.mysql.com/doc/refman/26.7/en/change-stream-applier-limitations.html" target="_blank" rel="noopener noreferrer">Limitations ↗</a><a href="https://dev.mysql.com/doc/refman/26.7/en/change-stream-applier-monitoring.html" target="_blank" rel="noopener noreferrer">Monitoring ↗</a></div>
    </div>`;
  }

  function selectStep(index) {
    if(index<0||index>=csaSteps.length) return;
    activeStep=index;
    document.querySelectorAll('[data-csa-step]').forEach(button=>{const active=Number(button.dataset.csaStep)===index;button.classList.toggle('selected',active);button.setAttribute('aria-selected',String(active));});
    const panel=document.getElementById('csa-step-panel');
    if(panel) panel.innerHTML=tutorialPanel();
    document.getElementById('csa-tutorial')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function updateMeasurement() {
    const mta=Number(document.getElementById('mtaTime')?.value);
    const csa=Number(document.getElementById('csaTime')?.value);
    const result=document.getElementById('measurementResult');
    if(!result) return;
    if(!mta||!csa||mta<=0||csa<=0){result.textContent='Enter both times to compare the two runs.';return;}
    const delta=((mta-csa)/mta*100).toFixed(1);
    if(csa<mta) result.textContent=`CSA drain time was ${Math.abs(Number(delta))}% lower in these runs (${mta}s → ${csa}s).`;
    else if(csa>mta) result.textContent=`CSA took ${Math.abs(Number(delta))}% longer in these runs (${mta}s → ${csa}s).`;
    else result.textContent=`Both runs drained in ${mta}s. No time difference measured.`;
  }

  function handleClick(event) {
    const target=event.target;
    if(!(target instanceof Element)) return false;
    const step=target.closest('[data-csa-step]');
    if(step){selectStep(Number(step.dataset.csaStep));return true;}
    if(target.closest('[data-csa-prev]')){selectStep(activeStep-1);return true;}
    if(target.closest('[data-csa-next]')){selectStep(activeStep+1);return true;}
    const copy=target.closest('[data-csa-copy], [data-csa-rollback-copy]');
    if(copy){
      const code=copy.hasAttribute('data-csa-rollback-copy')?"STOP REPLICA FOR CHANNEL 'channel_1';\nCHANGE REPLICATION SOURCE TO APPLIER_VERSION = 1\nFOR CHANNEL 'channel_1';\nSTART REPLICA FOR CHANNEL 'channel_1';":csaSteps[activeStep].blocks[Number(copy.dataset.csaCopy)].code;
      if(navigator.clipboard?.writeText){navigator.clipboard.writeText(code).then(()=>{copy.textContent='Copied';setTimeout(()=>{if(copy.isConnected)copy.textContent='Copy';},1500);}).catch(()=>{copy.textContent='Select code to copy';});}
      else copy.textContent='Select code to copy';
      return true;
    }
    return false;
  }

  function handleInput(event){if(event.target?.matches?.('#mtaTime, #csaTime')) updateMeasurement();}
  return {render,handleClick,handleInput};
})();
