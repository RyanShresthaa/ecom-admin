-- Phase 4: guest cart + TTL + product full-text search.
-- No SMTP / SMS changes.

-- ---------------------------------------------------------------------------
-- Guest cart ownership + expiry
-- ---------------------------------------------------------------------------
ALTER TABLE cart_items
    ALTER COLUMN user_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS guest_id UUID,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- One owner: logged-in user XOR guest
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_owner_chk;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_owner_chk
    CHECK (
        (user_id IS NOT NULL AND guest_id IS NULL)
        OR (user_id IS NULL AND guest_id IS NOT NULL)
    );

DROP INDEX IF EXISTS cart_items_user_product_variant_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_variant_uidx
    ON cart_items (user_id, product_id, COALESCE(variant_id, 0))
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_guest_product_variant_uidx
    ON cart_items (guest_id, product_id, COALESCE(variant_id, 0))
    WHERE guest_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cart_items_guest
    ON cart_items (guest_id)
    WHERE guest_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cart_items_expires
    ON cart_items (expires_at)
    WHERE expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Product full-text search
-- ---------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_tsv tsvector;

UPDATE products SET search_tsv =
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(sku, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(brand, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
WHERE search_tsv IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_search_tsv ON products USING GIN (search_tsv);

CREATE OR REPLACE FUNCTION products_search_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.sku, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.brand, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_search_tsv ON products;
CREATE TRIGGER trg_products_search_tsv
  BEFORE INSERT OR UPDATE OF name, sku, brand, description ON products
  FOR EACH ROW EXECUTE PROCEDURE products_search_tsv_trigger();
