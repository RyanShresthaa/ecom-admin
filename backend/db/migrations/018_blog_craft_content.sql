-- Replace SaaS filler journal posts with Matina Crafts / handmade Nepal content.
-- Idempotent: matches either legacy SaaS slugs or already-renamed craft slugs.

UPDATE blog_posts SET
  slug = 'hands-behind-every-piece',
  title = 'The Hands Behind Every Piece',
  subtitle = 'Why we source directly from Nepali artisans',
  content = 'Every Matina Crafts product begins with a maker — often a family workshop in the Kathmandu Valley or the hills beyond. We work with artisans who practice techniques passed down for generations: weaving, metalwork, carving, and natural dyeing. Buying from us means supporting fair wages and keeping these crafts alive.',
  category = 'Artisans',
  learn_section_title = 'What fair craft looks like:',
  learn_items = '[
    {"title":"Direct relationships","description":"We buy from makers and cooperatives we know, not anonymous wholesale middlemen."},
    {"title":"Fair pay","description":"Prices reflect skilled labor time — not race-to-the-bottom factory rates."},
    {"title":"Small batches","description":"Limited runs mean quality control and less waste than mass production."},
    {"title":"Living traditions","description":"Orders help younger makers stay in the craft instead of leaving for other work."}
  ]'::jsonb,
  conclusion = 'When you choose a handmade piece, you are choosing a story — and a livelihood — not just an object on a shelf.',
  published_at = '2024-03-12T12:00:00Z',
  updated_at = NOW()
WHERE slug IN ('empowering-entrepreneurs-success-unveiled', 'hands-behind-every-piece');

UPDATE blog_posts SET
  slug = 'natural-materials-honest-wear',
  title = 'Natural Materials, Honest Wear',
  subtitle = 'Cotton, wool, brass, and wood chosen for lasting beauty',
  content = 'We favor materials that age well: breathable cottons, soft wool, solid brass, and responsibly sourced wood. Synthetic shortcuts may look identical in a photo, but they do not feel the same in the hand — or last the same way in a real home.',
  category = 'Materials',
  learn_section_title = 'What we look for:',
  learn_items = '[
    {"title":"Touch and drape","description":"Fabrics should feel good against skin and soften with use, not pill or smell chemical."},
    {"title":"Finish quality","description":"Edges, joins, and hardware tell you whether a piece was rushed or carefully finished."},
    {"title":"Color from nature","description":"Many of our dyes and finishes come from plant and mineral sources with subtle variation."},
    {"title":"Repairability","description":"Solid materials can be polished, restitched, or refinished — throwaway plastic cannot."}
  ]'::jsonb,
  conclusion = 'Craftsmanship shows up in the details you live with every day — not only in the unboxing moment.',
  published_at = '2024-04-02T12:00:00Z',
  updated_at = NOW()
WHERE slug IN ('thriving-in-a-dynamic-startup-landscape', 'natural-materials-honest-wear');

UPDATE blog_posts SET
  slug = 'from-kathmandu-to-your-door',
  title = 'From Kathmandu Workshop to Your Door',
  subtitle = 'How a Matina order travels to the US',
  content = 'After an order is confirmed, pieces are checked, packed with care, and shipped toward US delivery. Handmade goods take time — both to make and to move — so we share honest windows rather than overnight promises we cannot keep.',
  category = 'Shipping',
  learn_section_title = 'What to expect:',
  learn_items = '[
    {"title":"Quality check","description":"Each item is inspected before packing so damage in transit is less likely."},
    {"title":"Protective packing","description":"Fragile crafts get cushioning suited to brass, ceramics, and textiles."},
    {"title":"Standard shipping","description":"Most US orders arrive in about 7–14 business days once they leave Nepal."},
    {"title":"Tracking updates","description":"You receive order confirmation and status updates as fulfillment progresses."}
  ]'::jsonb,
  conclusion = 'Patience is part of handmade commerce — and worth it when the piece arrives ready for years of use.',
  published_at = '2024-05-18T12:00:00Z',
  updated_at = NOW()
WHERE slug IN ('strategies-propelling-tech-startups-to-success', 'from-kathmandu-to-your-door');

UPDATE blog_posts SET
  slug = 'gifting-handmade-with-meaning',
  title = 'Gifting Handmade with Meaning',
  subtitle = 'Choosing crafts that feel personal, not generic',
  content = 'A handmade gift carries weight because someone spent hours making it. Whether you are shopping for a housewarming, wedding, or quiet thank-you, Matina pieces are meant to be used and remembered — not tossed after a season.',
  category = 'Gifting',
  learn_section_title = 'Gift ideas that land well:',
  learn_items = '[
    {"title":"Everyday objects elevated","description":"Bowls, textiles, and small décor become daily rituals instead of shelf clutter."},
    {"title":"Share the maker story","description":"A short note about Nepal and the craft tradition makes the gift feel intentional."},
    {"title":"Match the home","description":"Warm neutrals and natural textures fit most interiors without shouting."},
    {"title":"Size for shipping","description":"Compact pieces travel more safely and still feel substantial in the hand."}
  ]'::jsonb,
  conclusion = 'The best gifts are the ones people reach for again — that is the bar we aim for with every craft we offer.',
  published_at = '2024-06-20T12:00:00Z',
  updated_at = NOW()
WHERE slug IN ('pioneering-the-future-in-our-startup-showcase', 'gifting-handmade-with-meaning');

UPDATE blog_posts SET
  slug = 'caring-for-handmade-textiles',
  title = 'Caring for Handmade Textiles',
  subtitle = 'Simple habits that keep weaves and dyes beautiful',
  content = 'Natural fibers reward gentle care. A little attention after each use keeps colors richer and fibers stronger — and extends the life of pieces that took real time to make.',
  category = 'Care',
  learn_section_title = 'Care basics:',
  learn_items = '[
    {"title":"Read the label first","description":"When care notes are included, follow them — some dyes prefer cool water only."},
    {"title":"Gentle wash","description":"Hand wash or delicate cycle with mild detergent; avoid harsh bleach."},
    {"title":"Air dry flat","description":"High heat can shrink wool and stress seams — lay flat or hang in shade."},
    {"title":"Store with space","description":"Fold loosely and keep away from damp corners to prevent mildew and creasing."}
  ]'::jsonb,
  conclusion = 'Treat a handmade textile like the heirloom it can become, and it will return the favor for years.',
  published_at = '2024-08-05T12:00:00Z',
  updated_at = NOW()
WHERE slug IN ('artificial-intelligence-impact-on-modern-industries', 'caring-for-handmade-textiles');

UPDATE blog_posts SET
  slug = 'styling-nepali-crafts-at-home',
  title = 'Bringing Nepal Home: Styling Natural Crafts',
  subtitle = 'Warm interiors with brass, wood, and handmade texture',
  content = 'Nepali crafts sit beautifully in modern homes — especially when you mix them with quiet neutrals and plenty of light. You do not need a themed room; one strong handmade piece can anchor a shelf, table, or entryway.',
  category = 'Home',
  learn_section_title = 'Styling tips:',
  learn_items = '[
    {"title":"One hero object","description":"Let a carved bowl or brass vessel stand alone instead of crowding the surface."},
    {"title":"Layer textures","description":"Pair woven textiles with smooth ceramics or wood for depth without clutter."},
    {"title":"Warm lighting","description":"Soft lamp light brings out natural dyes and metal patina better than cold LEDs."},
    {"title":"Rotate seasonally","description":"Swap a few pieces through the year so your favorites stay fresh in the room."}
  ]'::jsonb,
  conclusion = 'Handmade décor works best when it feels lived-in — not staged. Start with one piece you love and build from there.',
  published_at = '2024-09-22T12:00:00Z',
  updated_at = NOW()
WHERE slug IN ('healthy-eating-habits-for-a-busy-lifestyle', 'styling-nepali-crafts-at-home');
