-- Customer saved payment methods (card/bank metadata only — never full PAN/CVV/account).
CREATE TABLE IF NOT EXISTS payment_methods (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('card', 'bank')),
    brand           VARCHAR(40),
    last4           VARCHAR(4) NOT NULL,
    exp_month       SMALLINT,
    exp_year        SMALLINT,
    bank_name       VARCHAR(120),
    account_type    VARCHAR(20),
    billing_name    VARCHAR(200),
    billing_zip     VARCHAR(20),
    routing_last4   VARCHAR(4),
    is_default      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
