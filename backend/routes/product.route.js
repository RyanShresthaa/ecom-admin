/**
 * /api/product — catalog read/search; staff create/update/delete (seller owns rows).
 * @see controllers/product.controller.js · OpenAPI: docs/openapi/catalog.paths.js
 */
import { Router } from "express";
import auth from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import { staff } from "../middleware/roles.js";
import { requireProductOwner } from "../middleware/productOwner.js";
import { searchLimiter } from "../middleware/rateLimiter.js";
import {
  createProductController,
  deleteProductDetails,
  getProductByCategory,
  getProductByCategoryAndSubCategory,
  getProductByIdController,
  getProductBySlugController,
  getProductController,
  getProductDetails,
  updateProductDetails,
} from "../controllers/product.controller.js";

const productRouter = Router();

// Create
productRouter.post("/add-product", auth, staff, createProductController);
productRouter.post("/create", auth, staff, createProductController);

// Read/list/search
productRouter.get("/get-product", optionalAuth, getProductController);
productRouter.post("/get", optionalAuth, getProductController);
productRouter.post("/search-product", searchLimiter, optionalAuth, getProductController);
productRouter.get("/by-slug/:slug", optionalAuth, getProductBySlugController);
productRouter.get("/get-product/:id", optionalAuth, getProductByIdController);
productRouter.post("/get-product-details", getProductDetails);
productRouter.post("/get-product-by-category", getProductByCategory);
productRouter.post(
  "/get-pruduct-by-category-and-subcategory",
  getProductByCategoryAndSubCategory
);

// Update/delete
productRouter.put("/update-product", auth, staff, requireProductOwner, updateProductDetails);
productRouter.put("/update-product-details", auth, staff, requireProductOwner, updateProductDetails);
productRouter.delete("/delete-product", auth, staff, requireProductOwner, deleteProductDetails);

export default productRouter;
