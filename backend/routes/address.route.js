/**
 * /api/address — user delivery addresses (CRUD, auth required).
 * @see controllers/address.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from "express";
import auth from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { addressBodySchema, addressUpdateBodySchema } from "../validation/schemas.js";
import {
  addAddressController,
  deleteAddressController,
  getAddressController,
  updateAddressController,
} from "../controllers/address.controller.js";

const addressRouter = Router();
addressRouter.post("/add", auth, validateBody(addressBodySchema), addAddressController);
addressRouter.get("/get", auth, getAddressController);
addressRouter.put("/update", auth, validateBody(addressUpdateBodySchema), updateAddressController);
addressRouter.delete("/delete", auth, deleteAddressController);

export default addressRouter;
