-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  type ENUM('deposit','withdrawal','transfer','payment','refund','fee','interest','other') NOT NULL DEFAULT 'other',
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NULL,
  transaction_date DATE NOT NULL,
  reference VARCHAR(255) NULL,
  bill_record_id INT NULL,
  document_path VARCHAR(512) NULL,
  document_storage_key VARCHAR(512) NULL,
  document_original_name VARCHAR(255) NULL,
  document_md5_hash VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_record_id) REFERENCES bill_records(id) ON DELETE SET NULL,
  INDEX idx_transactions_profile (profile_id),
  INDEX idx_transactions_type (type),
  INDEX idx_transactions_date (transaction_date),
  INDEX idx_transactions_bill (bill_record_id)
);

-- Transaction tags junction table
CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (transaction_id, tag_id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
