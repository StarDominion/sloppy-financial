-- Add match_type and toggle_transaction fields to tag_rules
ALTER TABLE tag_rules
ADD COLUMN match_type ENUM('substring', 'full_string', 'regex') NOT NULL DEFAULT 'substring' AFTER tag,
ADD COLUMN toggle_transaction BOOLEAN NOT NULL DEFAULT FALSE AFTER match_type;
