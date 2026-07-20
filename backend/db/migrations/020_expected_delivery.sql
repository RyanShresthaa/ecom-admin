-- Admin-scheduled expected delivery datetime (set after order is Confirmed).

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS expected_delivery_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_expected_delivery
    ON orders (expected_delivery_at)
    WHERE expected_delivery_at IS NOT NULL;
