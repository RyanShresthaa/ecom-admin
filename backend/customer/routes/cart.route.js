/**
 * /api/cart — add, list, update, remove lines (auth).
 * @see controllers/cart.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from "express";
import auth from "../../shared/middleware/auth.js";
import {
  addToCartController,
  getCartController,
  removeCartController,
  updateCartController,
} from "../controllers/cart.controller.js";

const cartRouter = Router();
cartRouter.post("/add", auth, addToCartController);
cartRouter.get("/get", auth, getCartController);
cartRouter.put("/update", auth, updateCartController);
cartRouter.delete("/delete", auth, removeCartController);

export default cartRouter;
