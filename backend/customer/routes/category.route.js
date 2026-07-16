/**
 * /api/category — list + staff CRUD for product categories.
 * @see controllers/category.controller.js · OpenAPI: docs/openapi/catalog.paths.js
 */
import { Router } from "express";
import { AddCategoryController, deleteCategoryController, getCategoryController, updateCategoryController } from '../controllers/category.controller.js'
import auth from '../../shared/middleware/auth.js'
import { staff } from '../../shared/middleware/roles.js'

const categoryRouter = Router()
// POST /add-category - create category (requires auth + staff).
categoryRouter.post('/add-category', auth, staff, AddCategoryController)
// GET /get-category - list categories (public).
categoryRouter.get('/get-category', getCategoryController)
// PUT /update-category - update category (requires auth + staff).
categoryRouter.put('/update-category', auth, staff, updateCategoryController)
// DELETE /delete-category - delete category (requires auth + staff).
categoryRouter.delete('/delete-category', auth, staff, deleteCategoryController)

export default categoryRouter