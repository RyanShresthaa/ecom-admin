-- Phase 2: catalog depth — SKU / brand / barcode, product variants, soft-delete,
-- cart + order lines keyed by optional variant_id.

-- ---------------------------------------------------------------------------
-- Product identity fields + soft delete
-- ---------------------------------------------------------------------------
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS sku VARCHAR(64),
    ADD COLUMN IF NOT EXISTS barcode VARCHAR(64),
    ADD COLUMN IF NOT EXISTS brand VARCHAR(128),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique
    ON products (sku) WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique
    ON products (barcode) WHERE barcode IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products (deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);

-- ---------------------------------------------------------------------------
-- Variants (size / color for apparel; own SKU, stock, optional price/image)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size VARCHAR(32) NOT NULL DEFAULT '',
    color VARCHAR(64) NOT NULL DEFAULT '',
    sku VARCHAR(64) NOT NULL,
    price NUMERIC(12, 2),          -- NULL = inherit parent products.price
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image TEXT,                    -- optional override image URL
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, size, color),
    UNIQUE (sku)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id);

-- ---------------------------------------------------------------------------
-- Cart: allow same product with different variants
-- ---------------------------------------------------------------------------
ALTER TABLE cart_items
    ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES product_variants(id) ON DELETE CASCADE;

-- Replace unique (user_id, product_id) with (user_id, product_id, variant_id)
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
-- Postgres unique treats NULLs as distinct; use sentinel-friendly unique index
DROP INDEX IF EXISTS cart_items_user_product_variant_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_variant_uidx
    ON cart_items (user_id, product_id, COALESCE(variant_id, 0));

CREATE INDEX IF NOT EXISTS idx_cart_items_variant ON cart_items (variant_id);

-- ---------------------------------------------------------------------------
-- Orders: snapshot which variant was sold
-- ---------------------------------------------------------------------------
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_variant ON orders (variant_id);
