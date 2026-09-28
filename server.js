const http = require('http');
const { spawn } = require('child_process');
const { readFile } = require('fs/promises');
const { extname, join, normalize } = require('path');
const { handleTelemetryRequest } = require('./telemetry_server');

const port = Number(process.env.PORT || 4173);
const mysql = process.env.MYSQL_BIN || 'mysql';
const root = __dirname;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };

const setupAndRead = `
CREATE DATABASE IF NOT EXISTS innovation_lab;
USE innovation_lab;
CREATE TABLE IF NOT EXISTS demo_customers (customer_id INT PRIMARY KEY, name VARCHAR(100) NOT NULL, tier VARCHAR(20) NOT NULL);
CREATE TABLE IF NOT EXISTS demo_orders (order_id INT PRIMARY KEY, customer_id INT NOT NULL, product VARCHAR(100) NOT NULL, amount DECIMAL(10,2) NOT NULL, FOREIGN KEY (customer_id) REFERENCES demo_customers(customer_id));
INSERT INTO demo_customers (customer_id, name, tier) VALUES (101, 'Maya Chen', 'Gold') ON DUPLICATE KEY UPDATE name = VALUES(name), tier = VALUES(tier);
INSERT INTO demo_orders (order_id, customer_id, product, amount) VALUES (501, 101, 'Trail runner', 129.00), (502, 101, 'Merino socks', 18.00) ON DUPLICATE KEY UPDATE product = VALUES(product), amount = VALUES(amount);
CREATE OR REPLACE JSON DUALITY VIEW customer_orders_dv AS
SELECT JSON_DUALITY_OBJECT(
  '_id': customer_id,
  'customer_name': name,
  'tier': tier,
  'orders': (SELECT JSON_ARRAYAGG(JSON_DUALITY_OBJECT('order_id': order_id, 'product': product, 'amount': amount)) FROM demo_orders WHERE demo_orders.customer_id = demo_customers.customer_id)
) FROM demo_customers;
SELECT data FROM customer_orders_dv WHERE JSON_EXTRACT(data, '$._id') = 101;`;

function sendJson(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(body)); }
function runDemo() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(mysql, ['-uroot', '-h', '127.0.0.1', '-P', '3306', '--batch', '--skip-column-names', '-e', setupAndRead]);
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => reject(new Error(`Could not start mysql: ${error.message}`)));
    child.on('close', code => {
      if (code !== 0) return reject(new Error(stderr.trim() || `mysql exited with code ${code}`));
      try { resolve({ document: JSON.parse(stdout.trim().split('\n').pop()), elapsedMs: Date.now() - started }); }
      catch { reject(new Error(`Unexpected MySQL result: ${stdout.trim()}`)); }
    });
  });
}

http.createServer(async (request, response) => {
  if (await handleTelemetryRequest(request, response)) return;
  if (request.method === 'POST' && request.url === '/api/json-duality-run') {
    try { sendJson(response, 200, await runDemo()); } catch (error) { sendJson(response, 500, { error: error.message }); }
    return;
  }
  if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
  const requestPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const file = normalize(join(root, requestPath));
  if (!file.startsWith(root)) { response.writeHead(403); response.end(); return; }
  try { const data = await readFile(file); response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }); response.end(data); }
  catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, () => console.log(`MySQL Innovation Lab: http://127.0.0.1:${port}`));
