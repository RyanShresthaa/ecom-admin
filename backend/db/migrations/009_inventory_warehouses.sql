-- Multi-warehouse inventory: locations, per-location stock, immutable movement log.
-- `products.stock` remains the sellable aggregate (SUM of warehouse_stock) kept in sync by the app.

CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO warehouses (code, name, is_default)
VALUES ('MAIN', 'Main fulfillment center', true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS warehouse_stock (
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (warehouse_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product ON warehouse_stock(product_id);

-- Backfill: create default-warehouse rows only where missing (safe on re-run)
INSERT INTO warehouse_stock (warehouse_id, product_id, quantity)
SELECT w.id, p.id, GREATEST(COALESCE(p.stock, 0)::integer, 0)
FROM products p
CROSS JOIN (SELECT id FROM warehouses WHERE is_default = true ORDER BY id LIMIT 1) w
WHERE NOT EXISTS (
    SELECT 1 FROM warehouse_stock e WHERE e.product_id = p.id AND e.warehouse_id = w.id
);

-- Recompute aggregate stock from warehouse rows for all products that have rows
UPDATE products p
SET stock = sub.s,
    updated_at = NOW()
FROM (
    SELECT ws.product_id AS pid, COALESCE(SUM(ws.quantity), 0)::integer AS s
    FROM warehouse_stock ws
    GROUP BY ws.product_id
) sub
WHERE p.id = sub.pid;

CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    delta INTEGER NOT NULL,
    balance_after INTEGER,
    movement_type VARCHAR(40) NOT NULL,
    from_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    to_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    note TEXT NOT NULL DEFAULT '',
    meta JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user ON stock_movements(user_id, created_at DESC);
