/**
 * PostgreSQL: `blog_posts` — public journal + admin CRUD.
 */
import pool from '../config/connectDB.js';
import { mapRow, pickId } from '../utils/sql.js';

function mapBlog(row) {
    if (!row) return null;
    const o = mapRow(row);
    let learnItems = o.learn_items ?? o.learnItems ?? [];
    if (typeof learnItems === 'string') {
        try {
            learnItems = JSON.parse(learnItems);
        } catch {
            learnItems = [];
        }
    }
    if (!Array.isArray(learnItems)) learnItems = [];
    return {
        id: o.id,
        slug: o.slug,
        title: o.title,
        subtitle: o.subtitle || '',
        content: o.content || '',
        category: o.category || '',
        image: o.image || '',
        learnSectionTitle: o.learn_section_title || o.learnSectionTitle || '',
        learnItems: learnItems.map((item) => ({
            title: item?.title || '',
            description: item?.description || '',
        })),
        conclusion: o.conclusion || '',
        published: o.published !== false,
        publishedAt: o.published_at ?? o.publishedAt ?? null,
        createdAt: o.createdAt ?? o.created_at ?? null,
        updatedAt: o.updatedAt ?? o.updated_at ?? null,
    };
}

function slugify(input) {
    return String(input || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 180);
}

export async function findPublishedBlogPosts() {
    const r = await pool.query(
        `SELECT * FROM blog_posts
         WHERE published = true
         ORDER BY COALESCE(published_at, created_at) DESC, id DESC`,
    );
    return r.rows.map(mapBlog);
}

export async function findAllBlogPosts() {
    const r = await pool.query(
        `SELECT * FROM blog_posts
         ORDER BY COALESCE(published_at, created_at) DESC, id DESC`,
    );
    return r.rows.map(mapBlog);
}

export async function findBlogPostBySlug(slug, { publishedOnly = true } = {}) {
    const params = [String(slug).trim()];
    let sql = `SELECT * FROM blog_posts WHERE slug = $1`;
    if (publishedOnly) sql += ` AND published = true`;
    const r = await pool.query(sql, params);
    return mapBlog(r.rows[0]);
}

export async function findBlogPostById(id) {
    const r = await pool.query(`SELECT * FROM blog_posts WHERE id = $1`, [pickId(id)]);
    return mapBlog(r.rows[0]);
}

export async function createBlogPost(data) {
    const slug = slugify(data.slug || data.title) || `post-${Date.now()}`;
    const learnItems = Array.isArray(data.learnItems) ? data.learnItems : [];
    const published = data.published !== false;
    const publishedAt =
        data.publishedAt != null
            ? data.publishedAt
            : published
              ? new Date().toISOString()
              : null;
    const r = await pool.query(
        `INSERT INTO blog_posts (
            slug, title, subtitle, content, category, image,
            learn_section_title, learn_items, conclusion, published, published_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)
         RETURNING *`,
        [
            slug,
            String(data.title || '').trim(),
            String(data.subtitle || '').trim(),
            String(data.content || '').trim(),
            String(data.category || '').trim(),
            String(data.image || '').trim(),
            String(data.learnSectionTitle || '').trim(),
            JSON.stringify(learnItems),
            String(data.conclusion || '').trim(),
            published,
            publishedAt,
        ],
    );
    return mapBlog(r.rows[0]);
}

export async function updateBlogPost(id, data) {
    const current = await findBlogPostById(id);
    if (!current) return null;
    const slug = data.slug != null ? slugify(data.slug) || current.slug : current.slug;
    const title = data.title != null ? String(data.title).trim() : current.title;
    const subtitle = data.subtitle != null ? String(data.subtitle).trim() : current.subtitle;
    const content = data.content != null ? String(data.content).trim() : current.content;
    const category = data.category != null ? String(data.category).trim() : current.category;
    const image = data.image != null ? String(data.image).trim() : current.image;
    const learnSectionTitle =
        data.learnSectionTitle != null
            ? String(data.learnSectionTitle).trim()
            : current.learnSectionTitle;
    const learnItems = Array.isArray(data.learnItems) ? data.learnItems : current.learnItems;
    const conclusion =
        data.conclusion != null ? String(data.conclusion).trim() : current.conclusion;
    const published = data.published !== undefined ? data.published !== false : current.published;
    let publishedAt = current.publishedAt;
    if (data.publishedAt !== undefined) publishedAt = data.publishedAt;
    else if (published && !publishedAt) publishedAt = new Date().toISOString();
    else if (!published) publishedAt = null;

    const r = await pool.query(
        `UPDATE blog_posts SET
            slug = $1,
            title = $2,
            subtitle = $3,
            content = $4,
            category = $5,
            image = $6,
            learn_section_title = $7,
            learn_items = $8::jsonb,
            conclusion = $9,
            published = $10,
            published_at = $11,
            updated_at = NOW()
         WHERE id = $12
         RETURNING *`,
        [
            slug,
            title,
            subtitle,
            content,
            category,
            image,
            learnSectionTitle,
            JSON.stringify(learnItems),
            conclusion,
            published,
            publishedAt,
            pickId(id),
        ],
    );
    return mapBlog(r.rows[0]);
}

export async function deleteBlogPost(id) {
    await pool.query(`DELETE FROM blog_posts WHERE id = $1`, [pickId(id)]);
}

export { mapBlog, slugify };
