-- Full schema for SQLite (represents final state of all MySQL migrations)

CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'personal' CHECK(type IN ('personal', 'corporate')),
  last_used_at TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notes_profile ON notes(profile_id);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK(schedule_type IN ('once', 'cron')),
  scheduled_at TEXT NULL,
  cron_expr TEXT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reminders_profile ON reminders(profile_id);

CREATE TABLE IF NOT EXISTS automatic_bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NULL,
  frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'monthly', 'yearly')),
  due_day INTEGER NOT NULL,
  due_dates TEXT NULL,
  generation_days TEXT NULL,
  next_due_date TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_automatic_bills_profile ON automatic_bills(profile_id);

CREATE TABLE IF NOT EXISTS bill_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  automatic_bill_id INTEGER NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('paid', 'unpaid')),
  paid_date TEXT NULL,
  document_path TEXT NULL,
  document_original_name TEXT NULL,
  document_storage_key TEXT NULL,
  document_md5_hash TEXT NULL,
  owed_by_contact_id INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (automatic_bill_id) REFERENCES automatic_bills(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_bill_records_profile ON bill_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_bill_records_md5 ON bill_records(document_md5_hash);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#007acc',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tags_profile ON tags(profile_id);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_contacts_profile ON contacts(profile_id);

-- Add FK for bill_records.owed_by_contact_id after contacts table exists
-- SQLite does not support ADD CONSTRAINT, so it is defined in the CREATE TABLE above implicitly
-- We skip the explicit FK constraint here. It is handled via application logic

CREATE TABLE IF NOT EXISTS owed_amounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL,
  bill_record_id INTEGER NULL,
  amount REAL NOT NULL,
  reason TEXT NULL,
  is_paid INTEGER DEFAULT 0,
  paid_date TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_record_id) REFERENCES bill_records(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_owed_amounts_profile ON owed_amounts(profile_id);

CREATE TABLE IF NOT EXISTS tax_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  document_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_key TEXT NULL,
  md5_hash TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tax_documents_profile ON tax_documents(profile_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_md5 ON tax_documents(md5_hash);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK(category IN ('employment_income','freelance_income','investment_income','rental_income','pay_back','reimbursement','gift','refund','other')),
  description TEXT NULL,
  payment_date TEXT NOT NULL,
  reference TEXT NULL,
  document_path TEXT NULL,
  document_storage_key TEXT NULL,
  document_original_name TEXT NULL,
  document_md5_hash TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_payments_profile ON payments(profile_id);
CREATE INDEX IF NOT EXISTS idx_payments_contact ON payments(contact_id);
CREATE INDEX IF NOT EXISTS idx_payments_category ON payments(category);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  contact_id INTEGER NULL,
  invoice_number TEXT NULL,
  amount REAL NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','paid','overdue','cancelled')),
  issue_date TEXT NOT NULL,
  due_date TEXT NULL,
  paid_date TEXT NULL,
  document_path TEXT NULL,
  document_storage_key TEXT NULL,
  document_original_name TEXT NULL,
  document_md5_hash TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_profile ON invoices(profile_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contact ON invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_dates ON invoices(issue_date, due_date);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'withdrawal' CHECK(type IN ('deposit', 'withdrawal')),
  amount REAL NOT NULL,
  description TEXT NULL,
  transaction_date TEXT NOT NULL,
  reference TEXT NULL,
  bill_record_id INTEGER NULL,
  document_path TEXT NULL,
  document_storage_key TEXT NULL,
  document_original_name TEXT NULL,
  document_md5_hash TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_record_id) REFERENCES bill_records(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_profile ON transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_bill ON transactions(bill_record_id);

CREATE TABLE IF NOT EXISTS tag_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  substring TEXT NOT NULL,
  tag TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'substring' CHECK(match_type IN ('substring', 'full_string', 'regex')),
  toggle_transaction INTEGER NOT NULL DEFAULT 0,
  replace_description TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tag_rules_profile ON tag_rules(profile_id);

-- Junction tables
CREATE TABLE IF NOT EXISTS bill_records_tags (
  bill_record_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (bill_record_id, tag_id),
  FOREIGN KEY (bill_record_id) REFERENCES bill_records(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS automatic_bills_tags (
  automatic_bill_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (automatic_bill_id, tag_id),
  FOREIGN KEY (automatic_bill_id) REFERENCES automatic_bills(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tax_document_tags (
  tax_document_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (tax_document_id, tag_id),
  FOREIGN KEY (tax_document_id) REFERENCES tax_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_tags (
  payment_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (payment_id, tag_id),
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoice_tags (
  invoice_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (invoice_id, tag_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (transaction_id, tag_id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
