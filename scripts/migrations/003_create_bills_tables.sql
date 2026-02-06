
CREATE TABLE IF NOT EXISTS automatic_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    frequency VARCHAR(50) NOT NULL COMMENT 'monthly, yearly, weekly',
    due_day INT NOT NULL COMMENT 'Day of month for monthly, day of year/week, etc. For simplicity, we assume monthly for now usually',
    next_due_date DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bill_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    automatic_bill_id INT,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATETIME NOT NULL,
    status VARCHAR(50) DEFAULT 'unpaid' COMMENT 'paid, unpaid',
    paid_date DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automatic_bill_id) REFERENCES automatic_bills(id) ON DELETE SET NULL
);
