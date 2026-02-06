-- Add owed_by_contact_id to bill_records for optional association
ALTER TABLE bill_records ADD COLUMN owed_by_contact_id INT NULL;
