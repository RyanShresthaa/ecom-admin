/**
 * Blog CMS — staff write, customers read published posts.
 */
import {
    listBlogPosts,
    findBlogPostById,
    findBlogPostBySlug,
    createBlogPost,
    updateBlogPost,
    deleteBlogPost,
} from '../../shared/models/blog.model.js'
import { pickId } from '../../shared/utils/sql.js'

function isStaff(user) {
    return user?.role === 'Admin' || user?.role === 'Seller'
}

// GET /api/blog — list published posts (public).
export async function listBlogController(req, res) {
    try {
        const page = Number(req.query.page) || 1
        const limit = Number(req.query.limit) || 20
        const skip = (page - 1) * limit
        const { data, totalCount } = await listBlogPosts({
            published: true,
            limit,
            skip,
            search: req.query.search || '',
        })
        return res.json({ data, totalCount, error: false, success: true })
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false })
    }
}

// GET /api/blog/admin — staff list including drafts.
export async function listBlogAdminController(req, res) {
    try {
        const page = Number(req.query.page) || 1
        const limit = Number(req.query.limit) || 50
        const skip = (page - 1) * limit
        const { data, totalCount } = await listBlogPosts({
            published: undefined,
            limit,
            skip,
            search: req.query.search || '',
        })
        return res.json({ data, totalCount, error: false, success: true })
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false })
    }
}

// GET /api/blog/post/:slugOrId — single post by slug or numeric id.
export async function getBlogController(req, res) {
    try {
        const key = req.params.slugOrId
        const staff = isStaff(req.user)
        let post = /^\d+$/.test(String(key))
            ? await findBlogPostById(key)
            : await findBlogPostBySlug(key)
        if (!post) {
            return res.status(404).json({ message: 'Post not found', error: true, success: false })
        }
        if (!post.published && !staff) {
            return res.status(404).json({ message: 'Post not found', error: true, success: false })
        }
        return res.json({ data: post, error: false, success: true })
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false })
    }
}

// POST /api/blog — create post (staff).
export async function createBlogController(req, res) {
    try {
        const { title, slug, excerpt, coverImage, body, published } = req.body || {}
        if (!title?.trim()) {
            return res.status(400).json({ message: 'Title is required', error: true, success: false })
        }
        const post = await createBlogPost({
            title,
            slug,
            excerpt,
            coverImage,
            body,
            published,
            authorId: req.userId,
        })
        return res.status(201).json({ message: 'Post created', data: post, error: false, success: true })
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false })
    }
}

// PUT /api/blog/:id — update post (staff).
export async function updateBlogController(req, res) {
    try {
        const id = pickId(req.params.id)
        const post = await updateBlogPost(id, req.body || {})
        if (!post) {
            return res.status(404).json({ message: 'Post not found', error: true, success: false })
        }
        return res.json({ message: 'Post updated', data: post, error: false, success: true })
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false })
    }
}

// DELETE /api/blog/:id — delete post (staff).
export async function deleteBlogController(req, res) {
    try {
        const id = await deleteBlogPost(pickId(req.params.id))
        if (!id) {
            return res.status(404).json({ message: 'Post not found', error: true, success: false })
        }
        return res.json({ message: 'Post deleted', error: false, success: true })
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false })
    }
}
