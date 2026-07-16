/**
 * /api/product — catalog read/search; staff create/update/delete (seller owns rows).
 * @see controllers/product.controller.js · OpenAPI: docs/openapi/catalog.paths.js
 */
import { Router } from "express";
import auth from "../../shared/middleware/auth.js";
import optionalAuth from "../../shared/middleware/optionalAuth.js";
import { staff } from "../../shared/middleware/roles.js";
import { requireProductOwner } from "../../shared/middleware/productOwner.js";
import {
  createProductController,
  deleteProductDetails,
  restoreProductController,
  getProductByCategory,
  getProductByCategoryAndSubCategory,
  getProductByIdController,
  getProductController,
  getProductDetails,
  updateProductDetails,
} from "../controllers/product.controller.js";

const productRouter = Router();

// Create
// POST /add-product - create product (requires auth + staff).
productRouter.post("/add-product", auth, staff, createProductController);
// POST /create - alias for create product (requires auth + staff).
productRouter.post("/create", auth, staff, createProductController);

// Read/list/search
// GET /get-product - list products (optional auth).
productRouter.get("/get-product", optionalAuth, getProductController);
// POST /get - list/search products via body payload (optional auth).
productRouter.post("/get", optionalAuth, getProductController);
// POST /search-product - search products (optional auth).
productRouter.post("/search-product", optionalAuth, getProductController);
// GET /get-product/:id - fetch product by id (optional auth).
productRouter.get("/get-product/:id", optionalAuth, getProductByIdController);
// POST /get-product-details - fetch product details (public handler).
productRouter.post("/get-product-details", getProductDetails);
// POST /get-product-by-category - list products by category (public handler).
productRouter.post("/get-product-by-category", getProductByCategory);
// POST /get-pruduct-by-category-and-subcategory - list products by category/subcategory (public handler).
productRouter.post(
  "/get-pruduct-by-category-and-subcategory",
  getProductByCategoryAndSubCategory
);

// Update/delete/restore
// PUT /update-product - update product (requires auth + staff + ownership guard).
productRouter.put("/update-product", auth, staff, requireProductOwner, updateProductDetails);
// PUT /update-product-details - alias update endpoint (requires auth + staff + ownership guard).
productRouter.put("/update-product-details", auth, staff, requireProductOwner, updateProductDetails);
// DELETE /delete-product - delete product (requires auth + staff + ownership guard).
productRouter.delete("/delete-product", auth, staff, requireProductOwner, deleteProductDetails);
// POST /restore-product - restore soft-deleted product (requires auth + staff + ownership guard).
productRouter.post("/restore-product", auth, staff, requireProductOwner, restoreProductController);

export default productRouter;
