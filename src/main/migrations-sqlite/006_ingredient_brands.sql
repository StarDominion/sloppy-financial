CREATE TABLE IF NOT EXISTS ingredient_brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);
