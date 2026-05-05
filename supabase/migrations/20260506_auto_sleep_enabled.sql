ALTER TABLE babies
  ADD COLUMN IF NOT EXISTS auto_sleep_enabled boolean NOT NULL DEFAULT true;
