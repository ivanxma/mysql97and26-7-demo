mysql -t -u card_admin -pWelcome1! <<EOL

-- pii_read is the default active role for this account.
SELECT CURRENT_USER(), CURRENT_ROLE();

USE card_masking_demo;

SELECT
    p.payment_id,
    c.customer_name,
    p.order_reference,
    p.payment_date,
    p.amount,
    p.payment_status,
    p.card_brand,
    p.card_number,
    p.card_expiry,
    p.card_token
FROM payment_tx AS p
JOIN customer AS c ON c.customer_id = p.customer_id
ORDER BY p.payment_id;

-- A normal processing action: settle authorised payments.
START TRANSACTION;

SELECT payment_id, order_reference, amount, card_number, card_expiry
FROM payment_tx
WHERE payment_status = 'AUTHORISED'
FOR UPDATE;

UPDATE payment_tx
SET payment_status = 'SETTLED'
WHERE payment_status = 'AUTHORISED';

COMMIT;

-- Daily operational reconciliation.
SELECT
    DATE(payment_date) AS payment_day,
    currency_code,
    payment_status,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount
FROM payment_tx
GROUP BY DATE(payment_date), currency_code, payment_status
ORDER BY payment_day, payment_status;

EOL
