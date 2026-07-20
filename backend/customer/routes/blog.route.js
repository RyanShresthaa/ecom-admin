/**
 * /api/blog — customer read + staff CMS.
 */
import { Router } from 'express'
import optionalAuth from '../../shared/middleware/optionalAuth.js'
import auth from '../../shared/middleware/auth.js'
import { staff } from '../../shared/middleware/roles.js'
import {
    listBlogController,
    listBlogAdminController,
    getBlogController,
    createBlogController,
    updateBlogController,
    deleteBlogController,
} from '../controllers/blog.controller.js'

const blogRouter = Router()

// Public list (published only unless staff uses /admin)
blogRouter.get('/', optionalAuth, listBlogController)
blogRouter.get('/admin-list', auth, staff, listBlogAdminController)
blogRouter.get('/post/:slugOrId', optionalAuth, getBlogController)

blogRouter.post('/', auth, staff, createBlogController)
blogRouter.put('/:id', auth, staff, updateBlogController)
blogRouter.delete('/:id', auth, staff, deleteBlogController)

export default blogRouter
