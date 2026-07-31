/**
 * Seed storefront product reviews for admin / product pages.
 * Idempotent: ON CONFLICT (user_id, product_id) DO NOTHING.
 *
 * Usage: node db/seeds/seed-product-reviews.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });

function ssl() {
    const raw = String(process.env.DB_SSL || '').toLowerCase();
    if (raw === 'true' || raw === 'require') {
        return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
    }
    return false;
}

/** [productId, userEmail, rating, comment] — emails must exist */
const SEED = [
    [10, 'ryanshr02@gmail.com', 5, 'The singing bowl is absolutely stunning. You can feel the craftsmanship in every detail — it resonates beautifully.'],
    [10, 'stharitika0@gmail.com', 5, 'My meditation space feels complete. Tone is rich and packaging was careful.'],
    [10, 'srits2004@gmail.com', 4, 'Beautiful bowl. Slightly smaller than I imagined from photos, but quality is excellent.'],
    [22, 'subediabhishek2060@gmail.com', 5, 'Ordered the pashmina wrap as a gift — arrived perfect. Softness is unlike anything local.'],
    [22, 'stharitika1@gmail.com', 5, 'Keep coming back for these wraps. Warmth and softness are unmatched.'],
    [26, 'ryanshr02@gmail.com', 5, 'The thangka painting is museum-quality. Clear that real artisans put their heart into this.'],
    [26, 'ryanshr03@gmail.com', 5, 'Colors are vibrant and detail is incredible. Centerpiece of our living room now.'],
    [15, 'subediabhishek2060@gmail.com', 5, 'The wooden mask is a masterpiece. Hand-carved with incredible precision.'],
    [15, 'srits2004@gmail.com', 5, 'Authentic feel — exactly what I hoped for after visiting Nepal last year.'],
    [37, 'stharitika0@gmail.com', 5, 'Pairs perfectly with the singing bowl. Delivery was faster than expected.'],
    [37, 'srits2004@gmail.com', 5, 'Incense holder is sturdy and looks handcrafted. Smell of the wood is lovely too.'],
    [36, 'srits2004@gmail.com', 5, 'Pressed flower cards are delicate and beautiful. Perfect for thank-you notes.'],
    [36, 'stharitika1@gmail.com', 5, 'Sent a set overseas — packaging protected every card. Mom loved them.'],
    [12, 'stharitika1@gmail.com', 5, 'Brass box is exquisitely detailed. Adds so much character to our shelf.'],
    [12, 'ryanshr012@gmail.com', 4, 'Lovely piece. Lid fits snug — great for small keepsakes.'],
    [17, 'subediabhishek2060@gmail.com', 5, 'Buddha statue has real presence. Quiet, well finished, and heavy in a good way.'],
    [17, 'ryanshr03@gmail.com', 5, 'Quality over quantity — one piece with more soul than a shelf of mass-produced decor.'],
    [30, 'ryanshr0123@gmail.com', 5, 'Lokta journal is unique. Paper feels special and bindings are solid.'],
    [34, 'stharitika0@gmail.com', 5, 'Notebook set made great corporate gifts for our team retreat.'],
    [20, 'srits2004@gmail.com', 5, 'Beaded necklace looks even better in person. Colors match the photos.'],
    [21, 'stharitika1@gmail.com', 5, 'Turquoise ring is a daily wear favorite. Comfortable and well made.'],
    [18, 'ryanshr02@gmail.com', 5, 'Mandala pendant is delicate but sturdy. Gets compliments every time.'],
    [23, 'subediabhishek2060@gmail.com', 5, 'Dhaka scarf keeps me connected to home. Pattern and weave are excellent.'],
    [25, 'srits2004@gmail.com', 5, 'Throw blanket is soft and the weave has authentic warmth factory products lack.'],
    [24, 'ryanshr03@gmail.com', 4, 'Hemp textile drapes nicely. Slight natural variation in dye — love that.'],
    [11, 'stharitika0@gmail.com', 5, 'Bamboo wall art is light, elegant, and easy to hang. Looks handmade in the best way.'],
    [13, 'ryanshr012@gmail.com', 5, 'Copper candle holder has a beautiful patina. Evening ambiance upgraded.'],
    [14, 'srits2004@gmail.com', 5, 'Walnut elephant carving is charming and finely detailed. Gifted one already.'],
    [16, 'stharitika1@gmail.com', 4, 'Hand carved box is lovely for jewelry. Interior lining would make it perfect.'],
    [19, 'ryanshr02@gmail.com', 5, 'Prayer wheel spins smoothly. Meaningful piece for the home altar.'],
    [28, 'subediabhishek2060@gmail.com', 5, 'Stone Ganesh carving feels substantial. Beautiful grain and finish.'],
    [29, 'stharitika0@gmail.com', 5, 'Mani prayer stone is simple and powerful. Exactly as described.'],
    [31, 'ryanshr0123@gmail.com', 5, 'Bamboo serving tray is practical and pretty. Use it every brunch.'],
    [33, 'srits2004@gmail.com', 5, 'Tea set is a joy — cups feel good in hand and clean easily.'],
    [32, 'ryanshr03@gmail.com', 5, 'Natural dye textile has soft color that photos somehow understated.'],
    [35, 'stharitika1@gmail.com', 4, 'Gift wrapping paper is unique. A bit thin but looks premium on packages.'],
    [27, 'ryanshr012@gmail.com', 5, 'Second prayer wheel for family — same quality as the first. Will order again.'],
];

async function main() {
    const pool = new pg.Pool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: ssl(),
        connectionTimeoutMillis: 15000,
    });

    const users = await pool.query(`SELECT id, lower(email) AS email FROM users`);
    const byEmail = new Map(users.rows.map((u) => [u.email, u.id]));
    const products = await pool.query(`SELECT id FROM products`);
    const productIds = new Set(products.rows.map((p) => p.id));

    let inserted = 0;
    let skipped = 0;
    let missingUser = 0;
    let missingProduct = 0;

    for (const [productId, email, rating, comment] of SEED) {
        const userId = byEmail.get(String(email).toLowerCase());
        if (!userId) {
            missingUser += 1;
            continue;
        }
        if (!productIds.has(productId)) {
            missingProduct += 1;
            continue;
        }
        const r = await pool.query(
            `INSERT INTO reviews (user_id, product_id, rating, comment)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, product_id) DO NOTHING
             RETURNING id`,
            [userId, productId, rating, comment],
        );
        if (r.rowCount) inserted += 1;
        else skipped += 1;
    }

    const total = await pool.query(`SELECT count(*)::int AS n FROM reviews`);
    console.log({
        inserted,
        skippedExisting: skipped,
        missingUser,
        missingProduct,
        totalReviews: total.rows[0].n,
    });
    await pool.end();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
