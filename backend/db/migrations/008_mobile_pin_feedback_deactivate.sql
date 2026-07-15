-- Mobile app PIN (hashed), separate from password
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_reset_otp VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_reset_expiry TIMESTAMPTZ;

-- Customer feedback: product, seller, or whole business
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('product', 'seller', 'business')),
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    title VARCHAR(200) DEFAULT '',
    comment TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_target ON feedback(target_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id, created_at DESC);
