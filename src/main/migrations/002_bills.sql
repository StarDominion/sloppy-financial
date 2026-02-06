CREATE TABLE IF NOT EXISTS automatic_bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  frequency ENUM('weekly', 'monthly', 'yearly') NOT NULL,
  due_day INT NOT NULL,
  next_due_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bill_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  automatic_bill_id INT NULL,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('paid', 'unpaid') NOT NULL DEFAULT 'unpaid',
  paid_date DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (automatic_bill_id) REFERENCES automatic_bills(id) ON DELETE SET NULL
);
