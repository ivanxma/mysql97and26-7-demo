mysql -t -uroot << EOL


grant pii_read to root@'localhost';

USE card_masking_demo;
SET ROLE NONE;

SELECT CURRENT_ROLE(), card_number, card_expiry
FROM payment_tx;

SET ROLE 'pii_read';
SELECT CURRENT_ROLE(), card_number, card_expiry
FROM payment_tx;

EOL
