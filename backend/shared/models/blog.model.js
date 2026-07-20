/**
 * PostgreSQL: `blog_posts` — customer blog articles (admin CMS).
 */
import pool from '../config/connectDB.js'
import { mapRow, mapRows, pickId } from '../utils/sql.js'

export function mapBlogPost(row) {
    if (!row) return null
    const p = mapRow(row)
    return {
        id: p.id,
        _id: p._id,
        title: p.title || '',
        slug: p.slug || '',
        excerpt: p.excerpt || '',
        coverImage: p.cover_image || '',
        body: p.body || '',
        published: Boolean(p.published),
        authorId: p.author_id ?? null,
        publishedAt: p.published_at ?? null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    }
}

export function slugifyTitle(title) {
    return String(title || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120) || `post-${Date.now()}`
}

async function uniqueSlug(base, excludeId = null) {
    let slug = base
    let n = 0
    while (true) {
        const params = [slug]
        let sql = `SELECT id FROM blog_posts WHERE slug = $1`
        if (excludeId) {
            params.push(pickId(excludeId))
            sql += ` AND id <> $2`
        }
        const r = await pool.query(sql, params)
        if (!r.rows[0]) return slug
        n += 1
        slug = `${base}-${n}`
    }
}

export async function listBlogPosts({ published, limit = 50, skip = 0, search = '' } = {}) {
    const params = []
    const clauses = ['WHERE 1=1']
    if (published === true) {
        clauses.push('AND published = true')
    } else if (published === false) {
        clauses.push('AND published = false')
    }
    if (search) {
        params.push(`%${String(search).trim().slice(0, 100)}%`)
        clauses.push(`AND (title ILIKE $${params.length} OR excerpt ILIKE $${params.length})`)
    }
    const where = clauses.join(' ')
    const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM blog_posts ${where}`, params)
    params.push(Math.min(100, Number(limit) || 50))
    params.push(Math.max(0, Number(skip) || 0))
    const r = await pool.query(
        `SELECT * FROM blog_posts ${where}
         ORDER BY COALESCE(published_at, updated_at) DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
    )
    return { data: mapRows(r.rows).map(mapBlogPost), totalCount: countR.rows[0].c }
}

export async function findBlogPostById(id) {
    const r = await pool.query(`SELECT * FROM blog_posts WHERE id = $1`, [pickId(id)])
    return mapBlogPost(r.rows[0])
}

export async function findBlogPostBySlug(slug) {
    const key = String(slug || '').trim().toLowerCase()
    if (!key) return null
    const r = await pool.query(`SELECT * FROM blog_posts WHERE slug = $1`, [key])
    return mapBlogPost(r.rows[0])
}

export async function createBlogPost({ title, slug, excerpt, coverImage, body, published, authorId }) {
    const baseSlug = slug ? slugifyTitle(slug) : slugifyTitle(title)
    const finalSlug = await uniqueSlug(baseSlug)
    const isPub = published === true
    const r = await pool.query(
        `INSERT INTO blog_posts (title, slug, excerpt, cover_image, body, published, author_id, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
            String(title || '').slice(0, 300),
            finalSlug,
            String(excerpt || '').slice(0, 2000),
            coverImage || null,
            String(body || ''),
            isPub,
            pickId(authorId) || null,
            isPub ? new Date() : null,
        ],
    )
    return mapBlogPost(r.rows[0])
}

export async function updateBlogPost(id, fields) {
    const existing = await findBlogPostById(id)
    if (!existing) return null

    const title = fields.title != null ? String(fields.title).slice(0, 300) : existing.title
    let slug = existing.slug
    if (fields.slug != null && String(fields.slug).trim()) {
        slug = await uniqueSlug(slugifyTitle(fields.slug), id)
    } else if (fields.title != null && fields.title !== existing.title && !fields.keepSlug) {
        slug = await uniqueSlug(slugifyTitle(title), id)
    }
    const excerpt = fields.excerpt != null ? String(fields.excerpt).slice(0, 2000) : existing.excerpt
    const coverImage = fields.coverImage != null ? fields.coverImage : existing.coverImage
    const body = fields.body != null ? String(fields.body) : existing.body
    const published = fields.published != null ? Boolean(fields.published) : existing.published

    let publishedAt = existing.publishedAt
    if (published && !existing.published) publishedAt = new Date()
    if (!published) publishedAt = null

    const r = await pool.query(
        `UPDATE blog_posts
         SET title = $1, slug = $2, excerpt = $3, cover_image = $4, body = $5,
             published = $6, published_at = $7, updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [title, slug, excerpt, coverImage || null, body, published, publishedAt, pickId(id)],
    )
    return mapBlogPost(r.rows[0])
}

export async function deleteBlogPost(id) {
    const r = await pool.query(`DELETE FROM blog_posts WHERE id = $1 RETURNING id`, [pickId(id)])
    return r.rows[0]?.id || null
}
