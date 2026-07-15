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
  getProductByCategory,
  getProductByCategoryAndSubCategory,
  getProductByIdController,
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
productRouter.post("/search-product", optionalAuth, getProductController);
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
