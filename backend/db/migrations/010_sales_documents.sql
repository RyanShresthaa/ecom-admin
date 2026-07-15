-- Multi-line orders: drop mistaken UNIQUE on order_id (one checkout = many rows sharing order_id).
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_id_key;
CREATE INDEX IF NOT EXISTS idx_orders_order_id_group ON orders(order_id);

-- Atomic document numbers per year (INV / QUO / CRN)
CREATE TABLE IF NOT EXISTS doc_counters (
    doc_type VARCHAR(10) NOT NULL,
    y SMALLINT NOT NULL,
    last_n INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (doc_type, y)
);

-- B2B / proforma quotations
CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    quote_number VARCHAR(40) NOT NULL UNIQUE,
    customer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired', 'void')),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    valid_until TIMESTAMPTZ,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tax_amt NUMERIC(14, 2) NOT NULL DEFAULT 0,
    shipping_amt NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_amt NUMERIC(14, 2) NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    html_preview TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_lines (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    line_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    product_snapshot JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_lines_q ON quotation_lines(quotation_id);

-- Formal sales invoices (revisioned; order group = orders.order_id string)
CREATE TABLE IF NOT EXISTS sales_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(40) NOT NULL UNIQUE,
    order_id VARCHAR(100) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'issued', 'void')),
    revision INTEGER NOT NULL DEFAULT 1,
    supersedes_id INTEGER REFERENCES sales_invoices(id) ON DELETE SET NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tax_amt NUMERIC(14, 2) NOT NULL DEFAULT 0,
    shipping_amt NUMERIC(14, 2) NOT NULL DEFAULT 0,
    coupon_discount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    coupon_code VARCHAR(100),
    total_amt NUMERIC(14, 2) NOT NULL DEFAULT 0,
    html_body TEXT NOT NULL DEFAULT '',
    issued_at TIMESTAMPTZ,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_order ON sales_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_user ON sales_invoices(user_id);

-- Credit notes / return invoices (link to formal invoice + return)
CREATE TABLE IF NOT EXISTS credit_notes (
    id SERIAL PRIMARY KEY,
    credit_number VARCHAR(40) NOT NULL UNIQUE,
    sales_invoice_id INTEGER REFERENCES sales_invoices(id) ON DELETE SET NULL,
    order_return_id INTEGER UNIQUE REFERENCES order_returns(id) ON DELETE SET NULL,
    order_id VARCHAR(100) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    reason TEXT NOT NULL DEFAULT '',
    html_body TEXT NOT NULL DEFAULT '',
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_order ON credit_notes(order_id);
