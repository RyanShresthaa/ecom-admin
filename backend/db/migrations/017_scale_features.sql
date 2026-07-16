-- 017_scale_features.sql
-- Marketplace / scale foundations: flags, MFA, FX, loyalty, recommendations,
-- stock reservations, seller payouts, push device registry (FCM stub later).

-- ---------------------------------------------------------------------------
-- 1) Feature flags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_flags (
    key VARCHAR(100) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT false,
    description TEXT NOT NULL DEFAULT '',
    meta JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags (key, enabled, description) VALUES
    ('mfa', false, 'TOTP multi-factor authentication on login'),
    ('loyalty_points', false, 'Earn/redeem loyalty points'),
    ('multi_currency', false, 'FX display / convert helpers'),
    ('stock_reservations', false, 'Hold stock during checkout'),
    ('seller_payouts', false, 'Seller commission + payouts'),
    ('push_notifications', false, 'FCM push (stub until configured)'),
    ('product_recommendations', false, 'Related / co-purchase recommendations')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) MFA (TOTP)
-- ---------------------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS mfa_totp_secret TEXT,
    ADD COLUMN IF NOT EXISTS mfa_backup_codes JSONB NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS mfa_challenges (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user ON mfa_challenges(user_id);

-- ---------------------------------------------------------------------------
-- 3) FX rates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fx_rates (
    base_currency VARCHAR(10) NOT NULL,
    quote_currency VARCHAR(10) NOT NULL,
    rate NUMERIC(18, 8) NOT NULL CHECK (rate > 0),
    source VARCHAR(40) NOT NULL DEFAULT 'manual',
    as_of TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (base_currency, quote_currency)
);

INSERT INTO fx_rates (base_currency, quote_currency, rate, source) VALUES
    ('NPR', 'INR', 0.62500000, 'manual'),
    ('NPR', 'USD', 0.00750000, 'manual'),
    ('INR', 'NPR', 1.60000000, 'manual'),
    ('USD', 'NPR', 133.00000000, 'manual')
ON CONFLICT (base_currency, quote_currency) DO NOTHING;

INSERT INTO shop_settings (key, value) VALUES
    ('supported_currencies', '["NPR","INR","USD"]'::jsonb),
    ('fx_display_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4) Loyalty
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_accounts (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason VARCHAR(40) NOT NULL,
    order_id VARCHAR(80),
    meta JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_user ON loyalty_ledger(user_id, created_at DESC);

INSERT INTO shop_settings (key, value) VALUES
    ('loyalty_earn_per_currency_unit', '1'::jsonb),
    ('loyalty_redeem_value', '0.01'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5) Recommendations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_related (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    related_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL DEFAULT 0,
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    PRIMARY KEY (product_id, related_product_id),
    CHECK (product_id <> related_product_id)
);
CREATE INDEX IF NOT EXISTS idx_product_related_rank ON product_related(product_id, rank);

-- ---------------------------------------------------------------------------
-- 6) Stock reservations
-- ---------------------------------------------------------------------------
ALTER TABLE warehouse_stock
    ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0);

DO $$ BEGIN
  ALTER TABLE warehouse_stock
    ADD CONSTRAINT warehouse_stock_reserved_lte_qty
    CHECK (reserved_quantity <= quantity);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS stock_reservations (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    checkout_key VARCHAR(100),
    order_id VARCHAR(80),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'committed', 'released', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_active
    ON stock_reservations(warehouse_id, product_id)
    WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- 7) Seller payouts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seller_commission_rules (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 10
        CHECK (rate_percent >= 0 AND rate_percent <= 100),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_commission_global
    ON seller_commission_rules ((1))
    WHERE seller_id IS NULL AND active;

CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_commission_seller
    ON seller_commission_rules (seller_id)
    WHERE seller_id IS NOT NULL AND active;

INSERT INTO seller_commission_rules (seller_id, rate_percent, active)
SELECT NULL, 10, true
WHERE NOT EXISTS (SELECT 1 FROM seller_commission_rules WHERE seller_id IS NULL AND active);

CREATE TABLE IF NOT EXISTS seller_earnings (
    id BIGSERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_row_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    order_id VARCHAR(80) NOT NULL DEFAULT '',
    gross_amt NUMERIC(14, 2) NOT NULL,
    commission_amt NUMERIC(14, 2) NOT NULL,
    net_amt NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NPR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'available', 'paid', 'reversed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seller_earnings_seller ON seller_earnings(seller_id, status);

CREATE TABLE IF NOT EXISTS seller_payouts (
    id BIGSERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'NPR',
    provider VARCHAR(32) NOT NULL DEFAULT 'manual',
    provider_payout_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed')),
    meta JSONB NOT NULL DEFAULT '{}',
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 8) Push device tokens (FCM send stubbed in app)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL DEFAULT 'unknown'
        CHECK (platform IN ('android', 'ios', 'web', 'unknown')),
    provider VARCHAR(20) NOT NULL DEFAULT 'fcm',
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, token)
);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

CREATE TABLE IF NOT EXISTS push_notification_log (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    device_token_id BIGINT REFERENCES device_tokens(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    payload JSONB NOT NULL DEFAULT '{}',
    provider VARCHAR(20) NOT NULL DEFAULT 'fcm',
    status VARCHAR(20) NOT NULL DEFAULT 'stubbed'
        CHECK (status IN ('stubbed', 'queued', 'sent', 'failed')),
    provider_message_id VARCHAR(255),
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
