-- Home / Google-style customer reviews shown on the storefront testimonials section.
-- Admin can toggle is_visible to choose which appear publicly.
-- Rows are managed via admin sync / dashboard (no seed inserts).

CREATE TABLE IF NOT EXISTS google_reviews (
    id SERIAL PRIMARY KEY,
    source_key TEXT UNIQUE NOT NULL,
    author_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    rating SMALLINT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    initials TEXT NOT NULL DEFAULT '',
    accent_color TEXT NOT NULL DEFAULT '#8C523A',
    column_index SMALLINT NOT NULL DEFAULT 0 CHECK (column_index >= 0 AND column_index <= 3),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_reviews_visible
    ON google_reviews (is_visible, column_index, sort_order);
