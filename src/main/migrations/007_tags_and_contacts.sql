-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#007acc',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for bill_records and tags
CREATE TABLE IF NOT EXISTS bill_records_tags (
  bill_record_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (bill_record_id, tag_id),
  FOREIGN KEY (bill_record_id) REFERENCES bill_records(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Create junction table for automatic_bills and tags
CREATE TABLE IF NOT EXISTS automatic_bills_tags (
  automatic_bill_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (automatic_bill_id, tag_id),
  FOREIGN KEY (automatic_bill_id) REFERENCES automatic_bills(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
