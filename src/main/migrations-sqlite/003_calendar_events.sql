CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  start_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  color TEXT NULL DEFAULT '#4a9eff',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_profile ON calendar_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
