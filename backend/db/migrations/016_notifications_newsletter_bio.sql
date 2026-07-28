-- Optional features: profile bio, newsletter, notification read state.

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    source VARCHAR(50) NOT NULL DEFAULT 'footer',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers (email);

-- Persists which derived admin notifications each admin has marked read.
CREATE TABLE IF NOT EXISTS admin_notification_reads (
    admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_key TEXT NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (admin_user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS idx_admin_notif_reads_admin
    ON admin_notification_reads (admin_user_id, read_at DESC);
