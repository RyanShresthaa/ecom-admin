-- Nepal procurement: suppliers, purchase bills (13% VAT), payment-out, purchase returns.
-- VAT: line taxable value excl. VAT + VAT at line rate (default 13%) = line gross (NPR typical).

INSERT INTO shop_settings (key, value) VALUES
    ('tax_region', '"NP"'::jsonb),
    ('vat_standard_rate', '13'::jsonb),
    ('purchase_default_currency', '"NPR"'::jsonb),
    ('company_vat_pan', '""'::jsonb),
    ('company_legal_name', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(300) NOT NULL,
    vat_pan VARCHAR(50) NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    phone VARCHAR(40) NOT NULL DEFAULT '',
    email VARCHAR(320) NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (name);

CREATE TABLE IF NOT EXISTS purchase_bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(40) NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'received', 'partial_paid', 'paid', 'void')),
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    currency VARCHAR(10) NOT NULL DEFAULT 'NPR',
    company_vat_pan VARCHAR(50) NOT NULL DEFAULT '',
    supplier_snapshot JSONB NOT NULL DEFAULT '{}',
    subtotal_excl_vat NUMERIC(14, 2) NOT NULL DEFAULT 0,
    vat_amt NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_incl_vat NUMERIC(14, 2) NOT NULL DEFAULT 0,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    received_at TIMESTAMPTZ,
    html_body TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_bills_supplier ON purchase_bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_status ON purchase_bills(status);

CREATE TABLE IF NOT EXISTS purchase_bill_lines (
    id SERIAL PRIMARY KEY,
    purchase_bill_id INTEGER NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
    line_no SMALLINT NOT NULL DEFAULT 1,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    description VARCHAR(500) NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price_excl_vat NUMERIC(14, 4) NOT NULL DEFAULT 0,
    line_net_excl_vat NUMERIC(14, 2) NOT NULL DEFAULT 0,
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 13 CHECK (vat_rate >= 0 AND vat_rate <= 100),
    vat_amt NUMERIC(14, 2) NOT NULL DEFAULT 0,
    line_gross_incl_vat NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_bill_lines_bill ON purchase_bill_lines(purchase_bill_id);

CREATE TABLE IF NOT EXISTS purchase_payments (
    id SERIAL PRIMARY KEY,
    purchase_bill_id INTEGER NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    method VARCHAR(40) NOT NULL DEFAULT 'bank',
    reference VARCHAR(120) NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_payments_bill ON purchase_payments(purchase_bill_id);

CREATE TABLE IF NOT EXISTS purchase_returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(40) NOT NULL UNIQUE,
    purchase_bill_id INTEGER NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'approved', 'void')),
    reason TEXT NOT NULL DEFAULT '',
    subtotal_excl_vat NUMERIC(14, 2) NOT NULL DEFAULT 0,
    vat_amt NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_incl_vat NUMERIC(14, 2) NOT NULL DEFAULT 0,
    html_body TEXT NOT NULL DEFAULT '',
    approved_at TIMESTAMPTZ,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_bill ON purchase_returns(purchase_bill_id);

CREATE TABLE IF NOT EXISTS purchase_return_lines (
    id SERIAL PRIMARY KEY,
    purchase_return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    purchase_bill_line_id INTEGER NOT NULL REFERENCES purchase_bill_lines(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    line_net_excl_vat NUMERIC(14, 2) NOT NULL DEFAULT 0,
    vat_amt NUMERIC(14, 2) NOT NULL DEFAULT 0,
    line_gross_incl_vat NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_return_lines_ret ON purchase_return_lines(purchase_return_id);
