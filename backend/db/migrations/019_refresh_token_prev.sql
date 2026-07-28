-- Refresh rotation grace for multi-tab races (previous token accepted briefly after rotate).
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_prev TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_prev_until TIMESTAMPTZ;
