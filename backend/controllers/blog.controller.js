/**
 * Public + admin blog (journal) controllers.
 */
import {
    createBlogPost,
    deleteBlogPost,
    findAllBlogPosts,
    findBlogPostById,
    findBlogPostBySlug,
    findPublishedBlogPosts,
    updateBlogPost,
} from '../models/blog.model.js';
import { logAudit } from '../models/audit.model.js';
import { getClientIp, getUserAgent } from '../utils/requestMeta.js';
import { pickId } from '../utils/sql.js';

export async function listPublishedBlogController(_req, res) {
    try {
        const data = await findPublishedBlogPosts();
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function getPublishedBlogBySlugController(req, res) {
    try {
        const data = await findBlogPostBySlug(req.params.slug, { publishedOnly: true });
        if (!data) {
            return res.status(404).json({ message: 'Post not found', error: true, success: false });
        }
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function listAdminBlogController(_req, res) {
    try {
        const data = await findAllBlogPosts();
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function createBlogController(req, res) {
    try {
        if (!String(req.body?.title || '').trim()) {
            return res.status(400).json({ message: 'Title is required', error: true, success: false });
        }
        const data = await createBlogPost(req.body || {});
        await logAudit({
            adminId: req.userId,
            action: 'blog.create',
            entityType: 'blog_post',
            entityId: data.id,
            details: { slug: data.slug },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.status(201).json({ message: 'Post created', data, error: false, success: true });
    } catch (e) {
        if (String(e.message || '').includes('unique') || e.code === '23505') {
            return res.status(409).json({ message: 'Slug already exists', error: true, success: false });
        }
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function updateBlogController(req, res) {
    try {
        const id = pickId(req.params.id);
        if (!id) {
            return res.status(400).json({ message: 'id required', error: true, success: false });
        }
        const existing = await findBlogPostById(id);
        if (!existing) {
            return res.status(404).json({ message: 'Post not found', error: true, success: false });
        }
        const data = await updateBlogPost(id, req.body || {});
        await logAudit({
            adminId: req.userId,
            action: 'blog.update',
            entityType: 'blog_post',
            entityId: id,
            details: { slug: data.slug },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({ message: 'Post updated', data, error: false, success: true });
    } catch (e) {
        if (String(e.message || '').includes('unique') || e.code === '23505') {
            return res.status(409).json({ message: 'Slug already exists', error: true, success: false });
        }
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function deleteBlogController(req, res) {
    try {
        const id = pickId(req.params.id);
        if (!id) {
            return res.status(400).json({ message: 'id required', error: true, success: false });
        }
        const existing = await findBlogPostById(id);
        if (!existing) {
            return res.status(404).json({ message: 'Post not found', error: true, success: false });
        }
        await deleteBlogPost(id);
        await logAudit({
            adminId: req.userId,
            action: 'blog.delete',
            entityType: 'blog_post',
            entityId: id,
            details: { slug: existing.slug },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({ message: 'Post deleted', error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}
