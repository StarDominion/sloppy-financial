ALTER TABLE automatic_bills ADD COLUMN due_dates VARCHAR(255) NULL;
-- We will migrate existing data: convert due_day to due_dates string
UPDATE automatic_bills SET due_dates = CAST(due_day AS CHAR);
