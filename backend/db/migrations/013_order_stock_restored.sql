-- Track whether inventory was restored for this order line (return/refund/cancel).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_restored BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_return_states
  ON orders (delivery_status, payment_status);
