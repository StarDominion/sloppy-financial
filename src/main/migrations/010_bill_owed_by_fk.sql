-- Add foreign key constraint for owed_by_contact_id
ALTER TABLE bill_records ADD CONSTRAINT fk_bill_owed_by_contact 
  FOREIGN KEY (owed_by_contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
