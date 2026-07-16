-- Phase 1: offline refund ledger (full + partial).
-- Gateway money movement (Stripe) is NOT wired yet — provider stays "manual".
-- Stripe / local wallets can attach provider_refund_id later without schema changes.

CREATE TABLE IF NOT EXISTS payment_refunds (
    id SERIAL PRIMARY KEY,
    order_row_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_id VARCHAR(80) NOT NULL DEFAULT '',
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'NPR',
    reason TEXT NOT NULL DEFAULT '',
    -- manual = staff offline refund (Phase 1). stripe = reserved for later.
    provider VARCHAR(32) NOT NULL DEFAULT 'manual',
    provider_refund_id VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'completed'
        CHECK (status IN ('pending', 'completed', 'failed')),
    stock_restored BOOLEAN NOT NULL DEFAULT false,
    credit_note_id INTEGER REFERENCES credit_notes(id) ON DELETE SET NULL,
    order_return_id INTEGER REFERENCES order_returns(id) ON DELETE SET NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_order_row ON payment_refunds(order_row_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_order_group ON payment_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_created ON payment_refunds(created_at DESC);
