/**
 * Seed Matina Crafts catalog into products / categories.
 *
 * Usage (from backend/):
 *   npm run db:seed:matina
 *   node db/seeds/seed-matina-products.mjs
 *
 * Options:
 *   --unpublish-others   Set publish=false on products that are not Matina seeds
 *   --force              Re-insert even if a product with the same slug already exists
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createCategory, findCategories } from '../../models/category.model.js';
import { createSubCategory, findSubCategories } from '../../models/subcategory.model.js';
import { createProduct, findProducts } from '../../models/product.model.js';
import pool from '../../config/connectDB.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const STOREFRONT_ORIGIN = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
const catalogPath = path.join(__dirname, 'matina-catalog.json');
const unpublishOthers = process.argv.includes('--unpublish-others');
const force = process.argv.includes('--force');

function parseRsPrice(raw) {
    if (typeof raw === 'number') return raw;
    const digits = String(raw || '').replace(/[^\d]/g, '');
    return Number(digits) || 0;
}

function parseDiscount(raw) {
    const m = String(raw || '').match(/(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : 0;
}

function toAbsoluteUrl(src) {
    if (!src) return null;
    if (/^https?:\/\//i.test(src)) return src;
    const base = STOREFRONT_ORIGIN.replace(/\/$/, '');
    return `${base}${src.startsWith('/') ? src : `/${src}`}`;
}

function loadCatalog() {
    if (!fs.existsSync(catalogPath)) {
        throw new Error(`Missing catalog file: ${catalogPath}`);
    }
    return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
}

async function ensureCategory(name, image) {
    const existing = await findCategories();
    const found = existing.find((c) => c.name === name);
    if (found) return found;
    return createCategory({ name, image: toAbsoluteUrl(image) || '' });
}

async function ensureSubCategory(name, categoryId, image) {
    const existing = await findSubCategories();
    const found = existing.find(
        (s) => s.name === name && Number(s.category_id) === Number(categoryId),
    );
    if (found) return found;
    return createSubCategory({
        name,
        image: toAbsoluteUrl(image) || '',
        category: [categoryId],
    });
}

function detailsOf(product) {
    const raw = product?.more_details;
    if (!raw) return {};
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }
    return raw;
}

async function alreadySeeded({ slug, frontendId }) {
    const { data } = await findProducts({ search: '', published: undefined, skip: 0, limit: 500 });
    return data.find((p) => {
        const d = detailsOf(p);
        return d.slug === slug || d.frontendId === frontendId;
    });
}

async function main() {
    const groups = loadCatalog();
    let created = 0;
    let skipped = 0;

    console.log(`Seeding Matina catalog (${groups.length} categories)...`);
    console.log(`Image base URL: ${STOREFRONT_ORIGIN}`);

    for (const group of groups) {
        const categoryImage = group.products[0]?.image;
        const category = await ensureCategory(group.name, categoryImage);
        const sub = await ensureSubCategory('General', category.id, categoryImage);

        for (const p of group.products) {
            const existing = await alreadySeeded({ slug: p.slug, frontendId: p.id });
            if (existing && !force) {
                console.log(`  skip  ${p.name} (already seeded)`);
                skipped += 1;
                continue;
            }

            const images = (p.galleryImages?.length ? p.galleryImages : [p.image])
                .map(toAbsoluteUrl)
                .filter(Boolean);

            await createProduct(
                {
                    name: p.name,
                    image: images,
                    category: [category.id],
                    subcategory: [sub.id],
                    unit: 'pcs',
                    stock: p.stock ?? 0,
                    price: parseRsPrice(p.price),
                    discount: parseDiscount(p.discount),
                    description: p.description || p.subtitle || '',
                    publish: true,
                    more_details: {
                        frontendId: p.id,
                        slug: p.slug,
                        subtitle: p.subtitle,
                        location: p.location,
                        originalPrice: p.originalPrice,
                        medium: p.medium,
                        dimensions: p.dimensions,
                        age: p.age,
                        school: p.school,
                        tags: p.tags || [],
                        artisan: p.artisan || null,
                        displayCategory: p.category,
                        group: group.name,
                    },
                },
                null,
            );

            console.log(`  +     ${p.name}`);
            created += 1;
        }
    }

    if (unpublishOthers) {
        const r = await pool.query(
            `UPDATE products
             SET publish = false, updated_at = NOW()
             WHERE COALESCE(more_details->>'slug', '') = ''
                OR more_details->>'group' IS NULL`,
        );
        console.log(`Unpublished ${r.rowCount} non-Matina product(s).`);
    }

    console.log(`Done. Created ${created}, skipped ${skipped}.`);
    await pool.end();
}

main().catch(async (err) => {
    console.error(err);
    try {
        await pool.end();
    } catch {
        /* ignore */
    }
    process.exit(1);
});
