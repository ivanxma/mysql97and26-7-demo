mysql -uroot << EOL

drop database if exists card_masking_demo;
CREATE DATABASE if not exists card_masking_demo;
USE card_masking_demo;

CREATE ROLE if not exists 'payments_read';
CREATE ROLE if not exists 'pii_read';

DROP USER if exists 'payment_analyst'@'localhost';
DROP USER if exists 'card_admin'@'localhost';
CREATE USER 'payment_analyst'@'localhost'
  IDENTIFIED BY 'Welcome1!';

CREATE USER 'card_admin'@'localhost'
  IDENTIFIED BY 'Welcome1!';

GRANT 'payments_read' TO 'payment_analyst'@'localhost';
SET DEFAULT ROLE 'payments_read' TO 'payment_analyst'@'localhost';

GRANT 'payments_read', 'pii_read' TO 'card_admin'@'localhost';
SET DEFAULT ROLE 'pii_read' TO 'card_admin'@'localhost';

drop table if exists payment_tx;
drop table if exists customer;

-- Customer master data: no payment card fields live here.
CREATE TABLE if not exists customer (
    customer_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    customer_name   VARCHAR(100) NOT NULL,
    email           VARCHAR(254) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id),
    UNIQUE KEY uq_customer_email (email)
) ENGINE = InnoDB;


-- Payment data. card_number contains digits only in this demo.
-- card_token represents the preferred production integration value.
CREATE TABLE if not exists payment_tx (
    payment_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    customer_id      BIGINT UNSIGNED NOT NULL,
    order_reference  VARCHAR(40) NOT NULL,
    payment_date     DATETIME NOT NULL,
    amount           DECIMAL(10,2) NOT NULL,
    currency_code    CHAR(3) NOT NULL DEFAULT 'GBP',
    payment_status   ENUM('AUTHORISED', 'SETTLED', 'DECLINED', 'REFUNDED')
                     NOT NULL DEFAULT 'AUTHORISED',
    payment_method   VARCHAR(20) NOT NULL DEFAULT 'CARD',
    card_brand       VARCHAR(20) NOT NULL,
    card_number      CHAR(16) NOT NULL,
    card_expiry      CHAR(5) NOT NULL,
    card_token       VARCHAR(128) NOT NULL,
    PRIMARY KEY (payment_id),
    CONSTRAINT fk_payment_customer
      FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
    CONSTRAINT chk_amount_positive
      CHECK (amount > 0)
) ENGINE = InnoDB;


INSERT INTO customer (customer_name, email) VALUES
  ('Ava Thompson',  'ava.thompson@example.test'),
  ('Noah Williams', 'noah.williams@example.test'),
  ('Mia Patel',     'mia.patel@example.test');

-- Test card data only; these are not real customer PANs.
INSERT INTO payment_tx
    (customer_id, order_reference, payment_date, amount, currency_code,
     payment_status, payment_method, card_brand, card_number, card_expiry,
     card_token)
VALUES
  (1, 'ORD-10001', '2026-09-20 09:15:00', 129.99, 'GBP',
   'AUTHORISED', 'CARD', 'VISA',
   '4111111111111111', '12/28', 'tok_demo_ava_001'),

  (2, 'ORD-10002', '2026-09-20 10:40:00',  49.50, 'GBP',
   'AUTHORISED', 'CARD', 'MASTERCARD',
   '5555555555554444', '07/27', 'tok_demo_noah_002'),

  (3, 'ORD-10003', '2026-09-21 14:05:00', 220.00, 'GBP',
   'DECLINED', 'CARD', 'VISA',
   '4000056655665556', '03/29', 'tok_demo_mia_003');


-- Only sessions with pii_read as an ACTIVE role see clear values.
-- This server rejected mask_ssn() in a policy, so these use
-- deterministic built-in expressions instead.

CREATE MASKING POLICY if not exists card_pan_by_pii_role(pan_col)
  CASE WHEN CURRENT_ROLE_IN('pii_read')
       THEN pan_col
       ELSE CONCAT('************', RIGHT(pan_col, 4))
  END;

CREATE MASKING POLICY if not exists card_expiry_by_pii_role(expiry_col)
  CASE WHEN CURRENT_ROLE_IN('pii_read')
       THEN expiry_col
       ELSE '**/**'
  END;


-- Attach policies to the sensitive base-table columns.
ALTER TABLE payment_tx
  ALTER COLUMN card_number SET MASKING POLICY card_pan_by_pii_role,
  ALTER COLUMN card_expiry  SET MASKING POLICY card_expiry_by_pii_role;


-- Least-privilege permissions.
GRANT SELECT ON card_masking_demo.customer   TO 'payments_read';
GRANT SELECT ON card_masking_demo.payment_tx TO 'payments_read';

-- Admins can read and process payment records.
GRANT SELECT, INSERT, UPDATE ON card_masking_demo.customer   TO 'pii_read';
GRANT SELECT, INSERT, UPDATE ON card_masking_demo.payment_tx TO 'pii_read';

EOL
