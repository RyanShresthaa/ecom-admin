-- Admin dashboard parity: order notes + in-app notifications

CREATE TABLE IF NOT EXISTS order_notes (
    id SERIAL PRIMARY KEY,
    order_group_id VARCHAR(100) NOT NULL,
    text TEXT NOT NULL,
    author VARCHAR(200) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_notes_group ON order_notes(order_group_id);

CREATE TABLE IF NOT EXISTS admin_notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(40) NOT NULL DEFAULT 'info',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    href VARCHAR(300) NOT NULL DEFAULT '',
    dedupe_key VARCHAR(120) UNIQUE,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
