-- Customer-facing blog posts (admin CMS)
CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(320) NOT NULL UNIQUE,
    excerpt TEXT NOT NULL DEFAULT '',
    cover_image TEXT,
    body TEXT NOT NULL DEFAULT '',
    published BOOLEAN NOT NULL DEFAULT false,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts (published, published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts (slug);
