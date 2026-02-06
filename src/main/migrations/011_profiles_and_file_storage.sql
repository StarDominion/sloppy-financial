-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('personal', 'corporate') NOT NULL DEFAULT 'personal',
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert a default profile and migrate existing data
INSERT INTO profiles (name, type) VALUES ('Default', 'personal');
SET @default_profile_id = LAST_INSERT_ID();

-- Add profile_id to all tables
ALTER TABLE notes ADD COLUMN profile_id INT NULL;
ALTER TABLE reminders ADD COLUMN profile_id INT NULL;
ALTER TABLE automatic_bills ADD COLUMN profile_id INT NULL;
ALTER TABLE bill_records ADD COLUMN profile_id INT NULL;
ALTER TABLE contacts ADD COLUMN profile_id INT NULL;
ALTER TABLE tags ADD COLUMN profile_id INT NULL;
ALTER TABLE owed_amounts ADD COLUMN profile_id INT NULL;
ALTER TABLE tax_documents ADD COLUMN profile_id INT NULL;

-- Assign existing data to the default profile
UPDATE notes SET profile_id = @default_profile_id WHERE profile_id IS NULL;
UPDATE reminders SET profile_id = @default_profile_id WHERE profile_id IS NULL;
UPDATE automatic_bills SET profile_id = @default_profile_id WHERE profile_id IS NULL;
UPDATE bill_records SET profile_id = @default_profile_id WHERE profile_id IS NULL;
UPDATE contacts SET profile_id = @default_profile_id WHERE profile_id IS NULL;
UPDATE tags SET profile_id = @default_profile_id WHERE profile_id IS NULL;
UPDATE owed_amounts SET profile_id = @default_profile_id WHERE profile_id IS NULL;
UPDATE tax_documents SET profile_id = @default_profile_id WHERE profile_id IS NULL;

-- Make profile_id NOT NULL after backfill
ALTER TABLE notes MODIFY COLUMN profile_id INT NOT NULL;
ALTER TABLE reminders MODIFY COLUMN profile_id INT NOT NULL;
ALTER TABLE automatic_bills MODIFY COLUMN profile_id INT NOT NULL;
ALTER TABLE bill_records MODIFY COLUMN profile_id INT NOT NULL;
ALTER TABLE contacts MODIFY COLUMN profile_id INT NOT NULL;
ALTER TABLE tags MODIFY COLUMN profile_id INT NOT NULL;
ALTER TABLE owed_amounts MODIFY COLUMN profile_id INT NOT NULL;
ALTER TABLE tax_documents MODIFY COLUMN profile_id INT NOT NULL;

-- Add foreign keys
ALTER TABLE notes ADD CONSTRAINT fk_notes_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE reminders ADD CONSTRAINT fk_reminders_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE automatic_bills ADD CONSTRAINT fk_automatic_bills_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE bill_records ADD CONSTRAINT fk_bill_records_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE contacts ADD CONSTRAINT fk_contacts_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE tags ADD CONSTRAINT fk_tags_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE owed_amounts ADD CONSTRAINT fk_owed_amounts_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE tax_documents ADD CONSTRAINT fk_tax_documents_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add indexes for profile_id
ALTER TABLE notes ADD INDEX idx_notes_profile (profile_id);
ALTER TABLE reminders ADD INDEX idx_reminders_profile (profile_id);
ALTER TABLE automatic_bills ADD INDEX idx_automatic_bills_profile (profile_id);
ALTER TABLE bill_records ADD INDEX idx_bill_records_profile (profile_id);
ALTER TABLE contacts ADD INDEX idx_contacts_profile (profile_id);
ALTER TABLE tags ADD INDEX idx_tags_profile (profile_id);
ALTER TABLE owed_amounts ADD INDEX idx_owed_amounts_profile (profile_id);
ALTER TABLE tax_documents ADD INDEX idx_tax_documents_profile (profile_id);

-- File storage improvements: add original_name, storage_key, md5_hash to bill_records
ALTER TABLE bill_records ADD COLUMN document_original_name VARCHAR(255) NULL;
ALTER TABLE bill_records ADD COLUMN document_storage_key VARCHAR(255) NULL;
ALTER TABLE bill_records ADD COLUMN document_md5_hash VARCHAR(32) NULL;

-- File storage improvements for tax_documents
ALTER TABLE tax_documents ADD COLUMN storage_key VARCHAR(255) NULL;
ALTER TABLE tax_documents ADD COLUMN md5_hash VARCHAR(32) NULL;

-- Migrate existing document_path data to storage_key for bill_records
UPDATE bill_records SET document_storage_key = document_path WHERE document_path IS NOT NULL AND document_path != '';

-- Migrate existing document_path data to storage_key for tax_documents
UPDATE tax_documents SET storage_key = document_path WHERE document_path IS NOT NULL AND document_path != '';

-- Add index for md5 hash lookups (duplicate detection)
ALTER TABLE bill_records ADD INDEX idx_bill_records_md5 (document_md5_hash);
ALTER TABLE tax_documents ADD INDEX idx_tax_documents_md5 (md5_hash);
