-- Back-in-stock waitlist for customer "Notify me" alerts
CREATE TABLE IF NOT EXISTS stock_waitlist (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES product_variants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS stock_waitlist_unique_pending
    ON stock_waitlist (product_id, (COALESCE(variant_id, 0)), lower(email))
    WHERE notified_at IS NULL;

CREATE INDEX IF NOT EXISTS stock_waitlist_product_idx
    ON stock_waitlist (product_id)
    WHERE notified_at IS NULL;
