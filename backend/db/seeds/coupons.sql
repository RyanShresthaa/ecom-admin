-- Optional: apply with `npm run db:seed:coupons` (preferred) or psql.
-- Idempotent coupon defaults for local / staging storefronts.

INSERT INTO coupons (code, discount_type, discount_value, min_order_amt, max_uses, active)
VALUES
    ('MATINA', 'percent', 10, 0, NULL, true),
    ('NEPAL', 'fixed', 500, 2000, NULL, true),
    ('WELCOME', 'percent', 15, 3000, 100, true)
ON CONFLICT (code) DO UPDATE SET
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    min_order_amt = EXCLUDED.min_order_amt,
    max_uses = EXCLUDED.max_uses,
    active = true,
    updated_at = NOW();
