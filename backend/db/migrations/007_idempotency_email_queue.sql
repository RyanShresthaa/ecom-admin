-- Idempotent checkout (prevent duplicate orders on double-submit)
CREATE TABLE IF NOT EXISTS checkout_idempotency (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(128) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    response_body JSONB,
    http_status INTEGER DEFAULT 200,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_checkout_idempotency_expires ON checkout_idempotency(expires_at);

-- Outbound email queue (SMTP work off the request path)
CREATE TABLE IF NOT EXISTS email_queue (
    id SERIAL PRIMARY KEY,
    send_to VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html TEXT,
    text TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, created_at);
