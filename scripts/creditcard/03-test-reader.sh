mysql -t -u payment_analyst -pWelcome1! << EOL



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
    p.card_expiry
FROM payment_tx AS p
JOIN customer AS c ON c.customer_id = p.customer_id
ORDER BY p.payment_id;

EOL
