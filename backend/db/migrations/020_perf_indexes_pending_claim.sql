-- Performance indexes + pending checkout claim status
-- Enables atomic Stripe finalize claim and faster catalog/search paths.

ALTER TABLE pending_checkouts
    DROP CONSTRAINT IF EXISTS pending_checkouts_status_check;

ALTER TABLE pending_checkouts
    ADD CONSTRAINT pending_checkouts_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'expired', 'failed'));

CREATE INDEX IF NOT EXISTS idx_products_publish_created
    ON products (publish, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_publish_price
    ON products (publish, price);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
    ON orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_delivery_status
    ON orders (delivery_status);

-- Trigram search (no-op if extension unavailable — CREATE EXTENSION may need superuser)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'pg_trgm not available (insufficient privilege); skipping trigram indexes';
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_trgm skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        CREATE INDEX IF NOT EXISTS idx_products_name_trgm
            ON products USING gin (name gin_trgm_ops);
        CREATE INDEX IF NOT EXISTS idx_products_description_trgm
            ON products USING gin (description gin_trgm_ops);
    END IF;
END $$;
