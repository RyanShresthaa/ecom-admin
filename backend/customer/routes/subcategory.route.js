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
subCategoryRouter.post("/add-subcategory", auth, staff, AddSubCategoryController);
subCategoryRouter.get("/get-subcategory", getSubCategoryController);
subCategoryRouter.put("/update-subcategory", auth, staff, updateSubCategoryController);
subCategoryRouter.delete("/delete-subcategory", auth, staff, deleteSubCategoryController);

export default subCategoryRouter;
