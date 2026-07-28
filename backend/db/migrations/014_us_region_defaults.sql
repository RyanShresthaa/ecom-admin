-- Default store locale to United States (admin can switch to Nepal in Settings).

INSERT INTO shop_settings (key, value, updated_at) VALUES
    ('region_mode', '"us"'::jsonb, NOW()),
    ('currency', '"USD"'::jsonb, NOW()),
    ('tax_percent', '0'::jsonb, NOW()),
    ('tax_region', '"United States"'::jsonb, NOW()),
    ('vat_standard_rate', '0'::jsonb, NOW()),
    ('purchase_default_currency', '"USD"'::jsonb, NOW()),
    ('admin_timezone', '"America/New_York"'::jsonb, NOW()),
    ('flat_shipping_fee', '5.99'::jsonb, NOW()),
    ('free_shipping_min', '75'::jsonb, NOW()),
    ('admin_tax_rules', '[{"id":1,"label":"Sales tax (none / remitted separately)","rate":0,"region":"United States"}]'::jsonb, NOW())
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
