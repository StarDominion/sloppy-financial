-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  contact_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category ENUM('employment_income','freelance_income','investment_income','rental_income','pay_back','reimbursement','gift','refund','other') NOT NULL DEFAULT 'other',
  description TEXT NULL,
  payment_date DATE NOT NULL,
  reference VARCHAR(255) NULL,
  document_path VARCHAR(512) NULL,
  document_storage_key VARCHAR(512) NULL,
  document_original_name VARCHAR(255) NULL,
  document_md5_hash VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT,
  INDEX idx_payments_profile (profile_id),
  INDEX idx_payments_contact (contact_id),
  INDEX idx_payments_category (category),
  INDEX idx_payments_date (payment_date)
);

-- Payment tags junction table
CREATE TABLE IF NOT EXISTS payment_tags (
  payment_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (payment_id, tag_id),
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  contact_id INT NULL,
  invoice_number VARCHAR(100) NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NULL,
  status ENUM('draft','sent','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL,
  due_date DATE NULL,
  paid_date DATE NULL,
  document_path VARCHAR(512) NULL,
  document_storage_key VARCHAR(512) NULL,
  document_original_name VARCHAR(255) NULL,
  document_md5_hash VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  INDEX idx_invoices_profile (profile_id),
  INDEX idx_invoices_contact (contact_id),
  INDEX idx_invoices_status (status),
  INDEX idx_invoices_dates (issue_date, due_date)
);

-- Invoice tags junction table
CREATE TABLE IF NOT EXISTS invoice_tags (
  invoice_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (invoice_id, tag_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
