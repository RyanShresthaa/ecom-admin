-- Auto NPR ↔ USD conversion settings (catalog prices stay in base currency).

INSERT INTO shop_settings (key, value, updated_at) VALUES
    ('price_base_currency', '"NPR"'::jsonb, NOW()),
    ('usd_npr_rate', '133'::jsonb, NOW())
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
