/**
 * /api/inventory — warehouses, stock add/remove/transfer, breakdown, movement history (staff + product ownership).
 * @see controllers/inventory.controller.js · OpenAPI: docs/openapi/inventory.paths.js
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import { staff, admin } from '../../shared/middleware/roles.js';
import { validateBody } from '../../shared/middleware/validate.js';
import {
    inventoryAddBodySchema,
    inventoryRemoveBodySchema,
    inventoryTransferBodySchema,
    createWarehouseBodySchema,
} from '../../shared/validation/schemas.js';
import {
    listWarehousesController,
    createWarehouseController,
    getProductInventoryBreakdownController,
    listInventoryMovementsController,
    addStockController,
    removeStockController,
    transferStockController,
} from '../controllers/inventory.controller.js';

const inventoryRouter = Router();

inventoryRouter.get('/warehouses', auth, staff, listWarehousesController);
inventoryRouter.post('/warehouses', auth, admin, validateBody(createWarehouseBodySchema), createWarehouseController);
inventoryRouter.get('/product/:productId/breakdown', auth, staff, getProductInventoryBreakdownController);
inventoryRouter.get('/movements', auth, staff, listInventoryMovementsController);
inventoryRouter.post('/add', auth, staff, validateBody(inventoryAddBodySchema), addStockController);
inventoryRouter.post('/remove', auth, staff, validateBody(inventoryRemoveBodySchema), removeStockController);
inventoryRouter.post('/transfer', auth, staff, validateBody(inventoryTransferBodySchema), transferStockController);

export default inventoryRouter;
