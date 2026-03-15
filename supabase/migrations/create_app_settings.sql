-- App settings key-value store for configurable options (backup email, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on app_settings"
  ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Seed the default backup email (update with your actual email)
-- INSERT INTO app_settings (key, value) VALUES ('backup_email', 'your@email.com')
--   ON CONFLICT (key) DO NOTHING;
