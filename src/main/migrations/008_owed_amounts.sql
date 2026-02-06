-- Create owed_amounts table
CREATE TABLE IF NOT EXISTS owed_amounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  contact_id INT NOT NULL,
  bill_record_id INT,
  amount DECIMAL(10, 2) NOT NULL,
  reason VARCHAR(500),
  is_paid BOOLEAN DEFAULT FALSE,
  paid_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_record_id) REFERENCES bill_records(id) ON DELETE SET NULL
);
