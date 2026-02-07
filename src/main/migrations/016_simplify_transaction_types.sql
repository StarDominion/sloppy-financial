-- Simplify transaction types to only deposit and withdrawal
-- Map existing types to the new simplified types
UPDATE transactions SET type = 'deposit' WHERE type IN ('refund', 'interest');
UPDATE transactions SET type = 'withdrawal' WHERE type IN ('transfer', 'payment', 'fee', 'other');

-- Alter the type column to only allow deposit and withdrawal
ALTER TABLE transactions MODIFY COLUMN type ENUM('deposit', 'withdrawal') NOT NULL DEFAULT 'withdrawal';
