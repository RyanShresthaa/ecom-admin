-- Seller ownership & low stock
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;

-- Order line details (legacy DBs may lack order_id)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS line_total NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amt NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_amt NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS shop_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO shop_settings (key, value) VALUES
    ('tax_percent', '13'::jsonb),
    ('flat_shipping_fee', '100'::jsonb),
    ('free_shipping_min', '1000'::jsonb),
    ('currency', '"INR"'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    discount_value NUMERIC(12, 2) NOT NULL,
    min_order_amt NUMERIC(12, 2) NOT NULL DEFAULT 0,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS order_returns (
    id SERIAL PRIMARY KEY,
    order_row_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'requested',
    admin_note TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL DEFAULT '',
    entity_id INTEGER,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
