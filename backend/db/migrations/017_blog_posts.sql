-- Blog posts (admin-managed journal). Content is created in admin (no seed inserts).

CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(200) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    category VARCHAR(120) NOT NULL DEFAULT '',
    image VARCHAR(500) NOT NULL DEFAULT '',
    learn_section_title VARCHAR(255) NOT NULL DEFAULT '',
    learn_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    conclusion TEXT NOT NULL DEFAULT '',
    published BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at
    ON blog_posts (published, published_at DESC);
