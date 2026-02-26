CREATE TABLE IF NOT EXISTS calendar_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  start_time DATETIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  color VARCHAR(20) NULL DEFAULT '#4a9eff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_calendar_events_profile (profile_id),
  INDEX idx_calendar_events_start (start_time)
);
