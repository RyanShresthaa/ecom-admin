/**
 * /api/blog — public list/detail; /api/blog/admin — CRUD (Admin).
 */
import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/roles.js';
import {
    createBlogController,
    deleteBlogController,
    getPublishedBlogBySlugController,
    listAdminBlogController,
    listPublishedBlogController,
    updateBlogController,
} from '../controllers/blog.controller.js';

const blogRouter = Router();

blogRouter.get('/', listPublishedBlogController);
blogRouter.get('/admin', auth, admin, listAdminBlogController);
blogRouter.post('/admin', auth, admin, createBlogController);
blogRouter.put('/admin/:id', auth, admin, updateBlogController);
blogRouter.delete('/admin/:id', auth, admin, deleteBlogController);
blogRouter.get('/:slug', getPublishedBlogBySlugController);

export default blogRouter;
