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
addressRouter.post("/add", auth, addAddressController);
addressRouter.get("/get", auth, getAddressController);
addressRouter.put("/update", auth, updateAddressController);
addressRouter.delete("/delete", auth, deleteAddressController);

export default addressRouter;
