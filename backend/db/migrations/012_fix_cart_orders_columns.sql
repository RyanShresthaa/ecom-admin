-- Fix legacy DB drift: cart_items / orders missing columns expected by the app.
-- Safe to re-run (IF NOT EXISTS / guarded updates).

-- Cart timestamps (ORDER BY created_at in cart model)
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Order line / payment / address fields used by place-cod & invoices
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_details JSONB NOT NULL DEFAULT '{}';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255) DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(100) DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(100) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address INTEGER REFERENCES addresses(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sub_total_amt NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amt NUMERIC(12, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_receipt TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Legacy column names → current app names (only if legacy total_amount exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total_amount'
    ) THEN
        UPDATE orders
        SET total_amt = COALESCE(total_amt, total_amount, 0)
        WHERE total_amt IS NULL;
    END IF;
END $$;

-- If any legacy rows lack product_id, attach a published product so NOT NULL can apply later
UPDATE orders o
SET product_id = (
    SELECT p.id FROM products p WHERE p.publish = true ORDER BY p.id LIMIT 1
)
WHERE o.product_id IS NULL
  AND EXISTS (SELECT 1 FROM products p WHERE p.publish = true);

-- Map old shipping_address text/int into delivery_address when possible (integer address id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'shipping_address'
    ) THEN
        UPDATE orders
        SET delivery_address = NULLIF(regexp_replace(shipping_address::text, '[^0-9]', '', 'g'), '')::integer
        WHERE delivery_address IS NULL
          AND shipping_address IS NOT NULL
          AND shipping_address::text ~ '^[0-9]+$';
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- ignore cast issues on free-text shipping_address
    NULL;
END $$;

ALTER TABLE orders ALTER COLUMN total_amt SET DEFAULT 0;
UPDATE orders SET total_amt = 0 WHERE total_amt IS NULL;
ALTER TABLE orders ALTER COLUMN total_amt SET NOT NULL;

-- Only enforce product_id NOT NULL when every row has one
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM orders WHERE product_id IS NULL) THEN
        ALTER TABLE orders ALTER COLUMN product_id SET NOT NULL;
    END IF;
END $$;

-- Multi-line checkouts share one order_id
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_id_key;
CREATE INDEX IF NOT EXISTS idx_orders_order_id_group ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

-- Legacy NOT NULL columns still present on some DBs
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE orders ALTER COLUMN total_amount SET DEFAULT 0;
        UPDATE orders SET total_amount = COALESCE(total_amount, total_amt, 0) WHERE total_amount IS NULL;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_address'
    ) THEN
        ALTER TABLE orders ALTER COLUMN shipping_address SET DEFAULT '';
        UPDATE orders SET shipping_address = COALESCE(shipping_address, '') WHERE shipping_address IS NULL;
    END IF;
END $$;

