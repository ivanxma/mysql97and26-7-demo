const maskingSql = {
  install: {
    label: 'Prerequisites',
    note: 'Requires MySQL Enterprise Edition, the Dynamic Data Masking Policy component, and an account with MANAGE_DATA_MASKING_POLICY. Run SOURCE from the component script directory.',
    sql: `-- In the mysql client, from the Enterprise server's share directory:
SOURCE install_component_object_policy.sql;

SELECT VERSION();
SELECT component_urn FROM mysql.component
WHERE component_urn LIKE '%object_policy%';
SHOW TABLES FROM mysql LIKE 'column_masking_policies';
SHOW GRANTS FOR CURRENT_USER();`
  },
  table: {
    label: 'Table',
    note: 'The sample uses test card numbers. The later ALTER statements repeat the exact column types and NOT NULL attributes.',
    sql: `CREATE DATABASE IF NOT EXISTS card_masking_demo;
USE card_masking_demo;

CREATE TABLE payment_tx (
  payment_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  card_number CHAR(16) NOT NULL,
  card_expiry CHAR(5) NOT NULL
);

INSERT INTO payment_tx
  (payment_id, amount, card_number, card_expiry)
VALUES
  (101, 129.99, '4111111111111111', '12/28'),
  (102, 49.50, '5555555555554444', '07/27');`
  },
  roles: {
    label: 'Users & roles',
    note: 'Replace the example passwords. Both roles may SELECT the table; only pii_read satisfies the policy gate.',
    sql: `CREATE ROLE 'payments_read';
CREATE ROLE 'pii_read';

CREATE USER 'payment_analyst'@'localhost'
  IDENTIFIED BY 'Example_ChangeMe_1!';
CREATE USER 'card_admin'@'localhost'
  IDENTIFIED BY 'Example_ChangeMe_2!';

GRANT SELECT ON card_masking_demo.payment_tx
  TO 'payments_read';
GRANT SELECT ON card_masking_demo.payment_tx
  TO 'pii_read';

GRANT 'payments_read' TO 'payment_analyst'@'localhost';
SET DEFAULT ROLE 'payments_read'
  TO 'payment_analyst'@'localhost';
GRANT 'pii_read' TO 'card_admin'@'localhost';
SET DEFAULT ROLE 'pii_read'
  TO 'card_admin'@'localhost';`
  },
  policies: {
    label: 'Policies',
    note: 'CURRENT_ROLE_IN checks the active role when a protected column is read.',
    sql: `CREATE MASKING POLICY card_pan_by_pii_role(pan_col)
CASE WHEN CURRENT_ROLE_IN('pii_read')
     THEN pan_col
     ELSE CONCAT('************', RIGHT(pan_col, 4))
END;

CREATE MASKING POLICY card_expiry_by_pii_role(expiry_col)
CASE WHEN CURRENT_ROLE_IN('pii_read')
     THEN expiry_col
     ELSE '**/**'
END;`
  },
  apply: {
    label: 'Attach & verify',
    note: 'The documented form for assigning a policy to an existing column is MODIFY COLUMN … MASKING POLICY.',
    sql: `ALTER TABLE card_masking_demo.payment_tx
  MODIFY COLUMN card_number CHAR(16) NOT NULL
  MASKING POLICY card_pan_by_pii_role;

ALTER TABLE card_masking_demo.payment_tx
  MODIFY COLUMN card_expiry CHAR(5) NOT NULL
  MASKING POLICY card_expiry_by_pii_role;

SHOW CREATE MASKING POLICY card_pan_by_pii_role;
SHOW CREATE MASKING POLICY card_expiry_by_pii_role;
SHOW CREATE TABLE card_masking_demo.payment_tx;`
  },
  query: {
    label: 'Read as user',
    note: 'Run the same SELECT separately as payment_analyst and card_admin. The active role changes the visible value.',
    sql: `SELECT CURRENT_USER(), CURRENT_ROLE();

SELECT payment_id, amount, card_number, card_expiry
FROM card_masking_demo.payment_tx
ORDER BY payment_id;`
  }
};

const maskingCases = {
  analyst: {
    user: 'payment_analyst', role: 'payments_read', status: 'MASKED VIEW',
    heading: 'Reporting sees useful rows without the card details.',
    explanation: 'payments_read grants SELECT, but CURRENT_ROLE_IN(\'pii_read\') is false. The policy returns a masked PAN and expiry.',
    steps: ['Connect as payment_analyst.', 'Confirm CURRENT_ROLE() includes payments_read.', 'Run the shared SELECT.', 'Check that PAN and expiry are masked.'],
    rows: [['101', '129.99', '************1111', '**/**'], ['102', '49.50', '************4444', '**/**']]
  },
  admin: {
    user: 'card_admin', role: 'pii_read', status: 'CLEAR VIEW',
    heading: 'Approved processing sees the source values.',
    explanation: 'pii_read is active and has SELECT. The same policy returns the original PAN and expiry for this session.',
    steps: ['Connect as card_admin.', 'Confirm CURRENT_ROLE() includes pii_read.', 'Run the same SELECT.', 'Check that the original values are visible.'],
    rows: [['101', '129.99', '4111111111111111', '12/28'], ['102', '49.50', '5555555555554444', '07/27']]
  }
};

const maskingDemo = (() => {
  let activeSql = 'install';
  let activeCase = 'analyst';
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

  function resultMarkup(kind) {
    const selected = maskingCases[kind];
    return `<div class="masking-case-head"><div><span class="masking-mini-label">${escapeHtml(selected.status)}</span><h3>${escapeHtml(selected.heading)}</h3><p>${escapeHtml(selected.explanation)}</p></div><div class="masking-active-role"><small>ACTIVE ROLE</small><strong>${escapeHtml(selected.role)}</strong></div></div>
      <div class="masking-case-grid"><ol class="masking-case-steps">${selected.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
      <div class="masking-result-table-wrap"><table class="masking-result-table"><caption>Outcome preview for ${escapeHtml(selected.user)}</caption><thead><tr><th>payment_id</th><th>amount</th><th>card_number</th><th>card_expiry</th></tr></thead><tbody>${selected.rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }

  function render() {
    const entry = maskingSql[activeSql];
    return `<div class="masking-page">
      <section class="masking-hero"><div class="masking-hero-copy"><div class="masking-eyebrow">MYSQL ENTERPRISE · DYNAMIC DATA MASKING</div><h1>The same query.<br><em>The right view for each role.</em></h1><p>Attach a policy to the payment table’s sensitive columns. A reporting role sees masked card data; an approved processing role sees the original values.</p><div class="masking-hero-actions"><button class="masking-primary" data-mask-jump="outcomes">Compare role outcomes <span>↓</span></button><a href="outputs/credit-card-data-masking-oracle-style.pptx" download>Download the walkthrough <span>↗</span></a></div></div><div class="masking-hero-example" aria-label="Masked and clear card number example"><div><small>payments_read</small><strong>************1111</strong><span>MASKED</span></div><div class="masking-divider">↕</div><div><small>pii_read</small><strong>4111111111111111</strong><span>CLEAR</span></div></div></section>
      <section class="masking-prerequisites"><div><span class="masking-kicker">BEFORE YOU BEGIN</span><h2>Enterprise Edition and the policy component are required.</h2><p>Run <code>install_component_object_policy.sql</code>. It installs <code>component_object_policy</code> and creates <code>mysql.column_masking_policies</code>. Policy DDL also requires <code>MANAGE_DATA_MASKING_POLICY</code>.</p></div><button class="masking-text-link" data-mask-tab="install">See install syntax <span>→</span></button></section>
      <section class="masking-section"><div class="masking-section-head"><div><span class="masking-kicker">HOW THE PARTS CONNECT</span><h2>A column points to a policy; the policy checks the active role.</h2></div></div><div class="masking-flow"><div><span>01 · TABLE</span><strong>payment_tx</strong><small>card_number<br>card_expiry</small></div><b>→</b><div><span>02 · ALTER TABLE</span><strong>MODIFY COLUMN</strong><small>MASKING POLICY<br>on each column</small></div><b>→</b><div><span>03 · POLICY</span><strong>card_pan_by_pii_role</strong><small>card_expiry_by_pii_role<br>CURRENT_ROLE_IN('pii_read')</small></div><b>→</b><div><span>04 · ROLE</span><strong>pii_read</strong><small>clear values<br>other roles: masked</small></div></div></section>
      <section class="masking-section masking-sql-section" id="maskingSqlSection"><div class="masking-section-head"><div><span class="masking-kicker">COMPLETE SQL</span><h2>Build the example in sequence.</h2></div><span class="masking-section-aside">DOCUMENTED MYSQL 26.7 SYNTAX</span></div><div class="masking-sql-shell"><div class="masking-tabs" role="tablist" aria-label="Masking setup steps">${Object.entries(maskingSql).map(([key, step]) => `<button role="tab" data-mask-tab="${key}" aria-selected="${key === activeSql}" class="${key === activeSql ? 'selected' : ''}">${escapeHtml(step.label)}</button>`).join('')}</div><div class="masking-code-head"><span>${escapeHtml(entry.label.toUpperCase())}.SQL</span><button data-mask-copy="true">Copy SQL</button></div><pre class="masking-code" id="maskingCode"><code>${escapeHtml(entry.sql)}</code></pre><p class="masking-sql-note" id="maskingSqlNote">${escapeHtml(entry.note)}</p></div></section>
      <section class="masking-section masking-outcomes" id="maskingOutcomes"><div class="masking-section-head"><div><span class="masking-kicker">USER + ACTIVE ROLE → RESULT</span><h2>Run the same SELECT in two user sessions.</h2></div></div><div class="masking-role-switch" role="group" aria-label="Preview a user role"><button data-mask-role="analyst" aria-pressed="${activeCase === 'analyst'}" class="${activeCase === 'analyst' ? 'selected' : ''}"><span>Reporting user</span><strong>payment_analyst · payments_read</strong></button><button data-mask-role="admin" aria-pressed="${activeCase === 'admin'}" class="${activeCase === 'admin' ? 'selected' : ''}"><span>Approved processor</span><strong>card_admin · pii_read</strong></button></div><div class="masking-case" id="maskingCase" aria-live="polite">${resultMarkup(activeCase)}</div><p class="masking-preview-note">Outcome preview uses test rows from the SQL above. Run the commands on a configured MySQL Enterprise server to verify the live result.</p></section>
      <div class="masking-docs"><span>REFERENCE</span><a href="https://dev.mysql.com/doc/refman/26.7/en/data-masking-dynamic-policies.html" target="_blank" rel="noopener noreferrer">MySQL Enterprise dynamic masking ↗</a><a href="https://dev.mysql.com/doc/refman/26.7/en/data-masking-policy-usage.html" target="_blank" rel="noopener noreferrer">Policy application syntax ↗</a></div>
    </div>`;
  }

  function chooseSql(key) {
    if (!maskingSql[key]) return;
    activeSql = key;
    document.querySelectorAll('[data-mask-tab]').forEach(button => {
      const selected = button.dataset.maskTab === key;
      button.classList.toggle('selected', selected);
      if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(selected));
    });
    const code = document.querySelector('#maskingCode code');
    if (code) code.textContent = maskingSql[key].sql;
    document.querySelector('.masking-code-head span').textContent = `${maskingSql[key].label.toUpperCase()}.SQL`;
    document.getElementById('maskingSqlNote').textContent = maskingSql[key].note;
    document.getElementById('maskingSqlSection')?.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function handleClick(event) {
    const tab = event.target.closest('[data-mask-tab]');
    if (tab) { chooseSql(tab.dataset.maskTab); return true; }
    const role = event.target.closest('[data-mask-role]');
    if (role) {
      activeCase = role.dataset.maskRole;
      document.querySelectorAll('[data-mask-role]').forEach(button => {
        const selected = button.dataset.maskRole === activeCase;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      document.getElementById('maskingCase').innerHTML = resultMarkup(activeCase);
      return true;
    }
    const copy = event.target.closest('[data-mask-copy]');
    if (copy) {
      navigator.clipboard.writeText(maskingSql[activeSql].sql).then(() => {
        copy.textContent = 'Copied';
        setTimeout(() => { if (copy.isConnected) copy.textContent = 'Copy SQL'; }, 1500);
      }).catch(() => { copy.textContent = 'Select SQL to copy'; });
      return true;
    }
    const jump = event.target.closest('[data-mask-jump]');
    if (jump) { document.getElementById('maskingOutcomes')?.scrollIntoView({behavior:'smooth',block:'start'}); return true; }
    return false;
  }

  return { render, handleClick };
})();
