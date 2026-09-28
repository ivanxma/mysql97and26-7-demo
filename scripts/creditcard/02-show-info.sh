mysql -t -uroot << EOL


USE card_masking_demo;
-- Least-privilege permissions.
GRANT SELECT ON card_masking_demo.customer   TO 'payments_read';
GRANT SELECT ON card_masking_demo.payment_tx TO 'payments_read';

-- Admins can read and process payment records.
GRANT SELECT, INSERT, UPDATE ON card_masking_demo.customer   TO 'pii_read';
GRANT SELECT, INSERT, UPDATE ON card_masking_demo.payment_tx TO 'pii_read';


-- Optional administrator verification while still connected as setup admin:
SHOW CREATE MASKING POLICY card_pan_by_pii_role;
SHOW CREATE MASKING POLICY card_expiry_by_pii_role;
SHOW CREATE TABLE payment_tx;
EOL
