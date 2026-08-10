-- Customer return resolution: refund vs replacement (exchange / damaged)
ALTER TABLE order_returns
  ADD COLUMN IF NOT EXISTS resolution VARCHAR(30) NOT NULL DEFAULT 'refund';

-- Backfill any legacy rows
UPDATE order_returns
SET resolution = 'refund'
WHERE resolution IS NULL OR TRIM(resolution) = '';

CREATE INDEX IF NOT EXISTS idx_order_returns_order_row
  ON order_returns (order_row_id);

CREATE INDEX IF NOT EXISTS idx_order_returns_user_status
  ON order_returns (user_id, status);
