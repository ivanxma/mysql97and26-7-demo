CREATE DATABASE IF NOT EXISTS innovation_lab;
USE innovation_lab;

CREATE TABLE IF NOT EXISTS product_catalog (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL
);

INSERT IGNORE INTO product_catalog (id, title, description) VALUES
  (1, 'Vector search starter', 'A practical starting point for semantic product discovery.'),
  (2, 'HeatWave analytics', 'Fast analytical queries alongside operational MySQL data.'),
  (3, 'InnoDB Cluster', 'High availability with automatic failover for MySQL workloads.'),
  (4, 'JSON and relational', 'Flexible documents stored beside relational business data.'),
  (5, 'Performance Schema', 'Built-in observability for diagnosing database activity.');

-- MySQL 26.7 JSON Duality View walkthrough
CREATE TABLE IF NOT EXISTS demo_customers (
  customer_id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_orders (
  order_id INT PRIMARY KEY,
  customer_id INT NOT NULL,
  product VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES demo_customers(customer_id)
);

INSERT INTO demo_customers (customer_id, name, tier) VALUES
  (101, 'Maya Chen', 'Gold')
ON DUPLICATE KEY UPDATE name = VALUES(name), tier = VALUES(tier);

INSERT INTO demo_orders (order_id, customer_id, product, amount) VALUES
  (501, 101, 'Trail runner', 129.00),
  (502, 101, 'Merino socks', 18.00)
ON DUPLICATE KEY UPDATE product = VALUES(product), amount = VALUES(amount);

CREATE OR REPLACE JSON DUALITY VIEW customer_orders_dv AS
SELECT JSON_DUALITY_OBJECT(
  '_id': customer_id,
  'customer_name': name,
  'tier': tier,
  'orders': (
    SELECT JSON_ARRAYAGG(JSON_DUALITY_OBJECT(
      'order_id': order_id,
      'product': product,
      'amount': amount
    ))
    FROM demo_orders
    WHERE demo_orders.customer_id = demo_customers.customer_id
  )
)
FROM demo_customers;
