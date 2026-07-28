-- Pending Stripe checkouts (line items live here; session metadata only stores id)
CREATE TABLE IF NOT EXISTS pending_checkouts (
    id SERIAL PRIMARY KEY,
    stripe_session_id VARCHAR(255) UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_id INTEGER NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
    coupon_code VARCHAR(50),
    list_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
    order_group_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_checkouts_user ON pending_checkouts (user_id);
CREATE INDEX IF NOT EXISTS idx_pending_checkouts_status ON pending_checkouts (status);
