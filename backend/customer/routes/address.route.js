/**
 * /api/address — user delivery addresses (CRUD, auth required).
 * @see controllers/address.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from "express";
import auth from "../../shared/middleware/auth.js";
import {
  addAddressController,
  deleteAddressController,
  getAddressController,
  updateAddressController,
} from "../controllers/address.controller.js";

const addressRouter = Router();
// POST /add - create an address (requires auth).
addressRouter.post("/add", auth, addAddressController);
// GET /get - fetch current user's addresses (requires auth).
addressRouter.get("/get", auth, getAddressController);
// PUT /update - update an address (requires auth).
addressRouter.put("/update", auth, updateAddressController);
// DELETE /delete - remove an address (requires auth).
addressRouter.delete("/delete", auth, deleteAddressController);

export default addressRouter;
