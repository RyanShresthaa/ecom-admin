-- Repair products.stock vs warehouse_stock desync.
-- Soft-delete used to set products.stock = 0 without clearing warehouse_stock, so
-- Inventory showed 0 (low stock) while warehouses still held units. Adding stock
-- then synced the SUM and jumped to a surprising total.

-- 1) Soft-deleted / unpublished products that were force-zeroed: clear hidden warehouse qty
UPDATE warehouse_stock ws
SET quantity = 0,
    updated_at = NOW()
FROM products p
WHERE ws.product_id = p.id
  AND p.publish = false
  AND COALESCE(p.stock, 0) = 0
  AND ws.quantity <> 0;

-- 2) Re-aggregate sellable stock from warehouse rows (source of truth)
UPDATE products p
SET stock = sub.s,
    updated_at = NOW()
FROM (
    SELECT product_id AS pid, COALESCE(SUM(quantity), 0)::integer AS s
    FROM warehouse_stock
    GROUP BY product_id
) sub
WHERE p.id = sub.pid
  AND COALESCE(p.stock, 0) <> sub.s;

-- 3) Products with no warehouse rows: keep stock as-is but seed default warehouse to match
INSERT INTO warehouse_stock (warehouse_id, product_id, quantity)
SELECT w.id, p.id, GREATEST(COALESCE(p.stock, 0)::integer, 0)
FROM products p
CROSS JOIN (
    SELECT id FROM warehouses WHERE is_default = true ORDER BY id LIMIT 1
) w
WHERE NOT EXISTS (
    SELECT 1 FROM warehouse_stock e WHERE e.product_id = p.id
);
