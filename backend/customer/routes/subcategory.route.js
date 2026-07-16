/**
 * /api/subcategory — list + staff CRUD under categories.
 * @see controllers/subcategory.controller.js · OpenAPI: docs/openapi/catalog.paths.js
 */
import { Router } from "express";
import auth from "../../shared/middleware/auth.js";
import { staff } from "../../shared/middleware/roles.js";
import {
  AddSubCategoryController,
  deleteSubCategoryController,
  getSubCategoryController,
  updateSubCategoryController,
} from "../controllers/subcategory.controller.js";

const subCategoryRouter = Router();
// POST /add-subcategory - create subcategory (requires auth + staff).
subCategoryRouter.post("/add-subcategory", auth, staff, AddSubCategoryController);
// GET /get-subcategory - list subcategories (public).
subCategoryRouter.get("/get-subcategory", getSubCategoryController);
// PUT /update-subcategory - update subcategory (requires auth + staff).
subCategoryRouter.put("/update-subcategory", auth, staff, updateSubCategoryController);
// DELETE /delete-subcategory - delete subcategory (requires auth + staff).
subCategoryRouter.delete("/delete-subcategory", auth, staff, deleteSubCategoryController);

export default subCategoryRouter;
