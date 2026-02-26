-- Add owed_to_contact_id to bill_records for tracking who the bill is paid to
ALTER TABLE bill_records ADD COLUMN owed_to_contact_id INT NULL;
