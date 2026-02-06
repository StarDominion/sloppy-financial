-- Create tag_rules table for storing reusable tag matching rules
CREATE TABLE IF NOT EXISTS tag_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  substring VARCHAR(255) NOT NULL,
  tag VARCHAR(100) NOT NULL,
  replace_description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_profile_id (profile_id)
);
