-- Phase 3: fulfillment — tracking fields, shipping zones/rates (Nepal-friendly).

-- ---------------------------------------------------------------------------
-- Order tracking / timestamps (copied onto every line in an order group)
-- ---------------------------------------------------------------------------
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS carrier VARCHAR(100),
    ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_tracking
    ON orders (tracking_number)
    WHERE tracking_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders (delivery_status);

-- ---------------------------------------------------------------------------
-- Shipping zones (match address city / state(district) / country)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    match_type VARCHAR(20) NOT NULL
        CHECK (match_type IN ('city', 'state', 'country', 'default')),
    match_value VARCHAR(120) NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_zones_match
    ON shipping_zones (match_type, lower(match_value));

CREATE TABLE IF NOT EXISTS shipping_rates (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
    rate NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
    free_min NUMERIC(12, 2),
    currency VARCHAR(10) NOT NULL DEFAULT 'NPR',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_rates_zone ON shipping_rates (zone_id);

-- Seed a small Nepal matrix once (skip if zones already exist)
DO $$
DECLARE
    z_valley INT;
    z_pokhara INT;
    z_np INT;
    z_default INT;
BEGIN
    IF EXISTS (SELECT 1 FROM shipping_zones LIMIT 1) THEN
        RETURN;
    END IF;

    INSERT INTO shipping_zones (name, match_type, match_value, priority)
    VALUES ('Kathmandu Valley', 'city', 'Kathmandu', 10)
    RETURNING id INTO z_valley;
    INSERT INTO shipping_rates (zone_id, rate, free_min, currency)
    VALUES (z_valley, 80, 2000, 'NPR');

    INSERT INTO shipping_zones (name, match_type, match_value, priority)
    VALUES ('Kathmandu Valley', 'city', 'Lalitpur', 10)
    RETURNING id INTO z_valley;
    INSERT INTO shipping_rates (zone_id, rate, free_min, currency)
    VALUES (z_valley, 80, 2000, 'NPR');

    INSERT INTO shipping_zones (name, match_type, match_value, priority)
    VALUES ('Kathmandu Valley', 'city', 'Bhaktapur', 10)
    RETURNING id INTO z_valley;
    INSERT INTO shipping_rates (zone_id, rate, free_min, currency)
    VALUES (z_valley, 80, 2000, 'NPR');

    INSERT INTO shipping_zones (name, match_type, match_value, priority)
    VALUES ('Pokhara', 'city', 'Pokhara', 20)
    RETURNING id INTO z_pokhara;
    INSERT INTO shipping_rates (zone_id, rate, free_min, currency)
    VALUES (z_pokhara, 120, 2500, 'NPR');

    INSERT INTO shipping_zones (name, match_type, match_value, priority)
    VALUES ('Nepal (default)', 'country', 'Nepal', 800)
    RETURNING id INTO z_np;
    INSERT INTO shipping_rates (zone_id, rate, free_min, currency)
    VALUES (z_np, 150, 3000, 'NPR');

    INSERT INTO shipping_zones (name, match_type, match_value, priority)
    VALUES ('Nepal (default)', 'country', 'NP', 800)
    RETURNING id INTO z_np;
    INSERT INTO shipping_rates (zone_id, rate, free_min, currency)
    VALUES (z_np, 150, 3000, 'NPR');

    INSERT INTO shipping_zones (name, match_type, match_value, priority)
    VALUES ('Fallback', 'default', '', 1000)
    RETURNING id INTO z_default;
    INSERT INTO shipping_rates (zone_id, rate, free_min, currency)
    VALUES (z_default, 200, NULL, 'NPR');
END $$;
