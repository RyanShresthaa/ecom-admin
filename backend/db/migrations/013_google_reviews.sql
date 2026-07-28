-- Home / Google-style customer reviews shown on the storefront testimonials section.
-- Admin can toggle is_visible to choose which appear publicly.

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

-- Seed the existing homepage testimonials (idempotent via source_key)
INSERT INTO google_reviews
    (source_key, author_name, role, body, rating, initials, accent_color, column_index, sort_order, is_visible)
VALUES
    ('sarah-collector', 'Sarah', 'Collector',
     'The singing bowl I ordered is absolutely stunning. You can feel the craftsmanship in every detail — it resonates beautifully.',
     5, 'SA', '#8C523A', 0, 0, true),
    ('james-gift', 'James', 'Gift Buyer',
     'Ordered a pashmina shawl for my wife and it arrived in perfect condition. The quality is unlike anything you find locally.',
     5, 'JM', '#A6674E', 0, 1, true),
    ('priya-designer', 'Priya', 'Interior Designer',
     'I use Matina Crafts pieces for my client projects. The handwoven textiles add an authentic warmth that factory products simply cannot replicate.',
     5, 'PR', '#C2836B', 0, 2, true),
    ('daniel-returning', 'Daniel', 'Returning Customer',
     'Third purchase from Matina Crafts and every single item has exceeded my expectations. The attention to packaging is wonderful too.',
     5, 'DN', '#BCA893', 0, 3, true),
    ('anita-art', 'Anita', 'Art Enthusiast',
     'The thangka painting I received is museum-quality. It''s clear that real artisans put their heart into this work.',
     5, 'AN', '#A6674E', 1, 0, true),
    ('michael-traveler', 'Michael', 'Traveler',
     'I visited Nepal last year and was looking for authentic souvenirs online. Matina Crafts is the real deal — genuine products, fair prices.',
     5, 'MC', '#8C523A', 1, 1, true),
    ('emily-yoga', 'Emily', 'Yoga Instructor',
     'My meditation space is now complete with the handcrafted incense holder and singing bowl. Delivery was faster than expected!',
     5, 'EM', '#BCA893', 1, 2, true),
    ('rohan-first', 'Rohan', 'First-time Buyer',
     'Was hesitant ordering handicrafts online but the product photos were accurate and the quality was superb. Will definitely order again.',
     4, 'RH', '#C2836B', 1, 3, true),
    ('clara-decorator', 'Clara', 'Home Decorator',
     'The brass statues are exquisitely detailed. Each piece tells a story and adds so much character to our living room.',
     5, 'CL', '#C2836B', 2, 0, true),
    ('arun-corporate', 'Arun', 'Corporate Gifting',
     'We ordered 50 handmade lokta paper notebooks for our team retreat. Everyone was thrilled — truly unique corporate gifts.',
     5, 'AR', '#BCA893', 2, 1, true),
    ('sophie-blogger', 'Sophie', 'Blogger',
     'Featured Matina Crafts on my blog and my readers loved the selection. The felt products are colorful, soft, and beautifully made.',
     5, 'SP', '#8C523A', 2, 2, true),
    ('kenji-collector', 'Kenji', 'Collector',
     'The wooden mask I ordered is a masterpiece. Hand-carved with incredible precision — it''s now the centerpiece of my collection.',
     5, 'KJ', '#A6674E', 2, 3, true),
    ('laura-repeat', 'Laura', 'Repeat Customer',
     'I keep coming back for the cashmere scarves. The warmth and softness are unmatched. My friends always ask where I shop!',
     5, 'LA', '#BCA893', 3, 0, true),
    ('bikash-diaspora', 'Bikash', 'Diaspora',
     'Living abroad, Matina Crafts lets me stay connected to Nepali culture. The dhaka topi and mala I ordered were perfect.',
     5, 'BK', '#C2836B', 3, 1, true),
    ('natasha-gift', 'Natasha', 'Gift Buyer',
     'Sent a handmade jewelry box to my mother overseas. She cried happy tears — the craftsmanship spoke louder than any card.',
     5, 'NT', '#A6674E', 3, 2, true),
    ('thomas-minimalist', 'Thomas', 'Minimalist',
     'Quality over quantity. One beautifully hand-carved item from Matina Crafts has more soul than a shelf full of mass-produced decor.',
     5, 'TH', '#8C523A', 3, 3, true)
ON CONFLICT (source_key) DO NOTHING;
