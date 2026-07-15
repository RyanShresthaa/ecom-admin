/**
 * /api/purchases — Nepal VAT (13%) procurement: suppliers, bills, payment-out, returns. **Admin only.**
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import { admin, staff } from '../../shared/middleware/roles.js';
import { validateBody } from '../../shared/middleware/validate.js';
import {
    purchaseSupplierBodySchema,
    purchaseSupplierPatchBodySchema,
    purchaseBillCreateBodySchema,
    purchaseBillPatchBodySchema,
    purchasePaymentBodySchema,
    purchaseReturnCreateBodySchema,
} from '../../shared/validation/schemas.js';
import {
    createSupplierController,
    listSuppliersController,
    getSupplierController,
    updateSupplierController,
    createPurchaseBillController,
    patchPurchaseBillController,
    getPurchaseBillController,
    previewPurchaseBillController,
    listPurchaseBillsController,
    receivePurchaseBillController,
    voidPurchaseBillController,
    createPurchasePaymentController,
    listPurchasePaymentsController,
    createPurchaseReturnController,
    getPurchaseReturnController,
    listPurchaseReturnsController,
    approvePurchaseReturnController,
    voidPurchaseReturnController,
} from '../controllers/purchase.controller.js';

const purchaseRouter = Router();

purchaseRouter.post('/suppliers', auth, staff, validateBody(purchaseSupplierBodySchema), createSupplierController);
purchaseRouter.get('/suppliers', auth, staff, listSuppliersController);
purchaseRouter.get('/suppliers/:id', auth, staff, getSupplierController);
purchaseRouter.put(
    '/suppliers/:id',
    auth,
    staff,
    validateBody(purchaseSupplierPatchBodySchema),
    updateSupplierController,
);

purchaseRouter.post('/bills', auth, staff, validateBody(purchaseBillCreateBodySchema), createPurchaseBillController);
purchaseRouter.get('/bills', auth, staff, listPurchaseBillsController);
purchaseRouter.get('/bills/:id', auth, staff, getPurchaseBillController);
purchaseRouter.get('/bills/:id/preview', auth, staff, previewPurchaseBillController);
purchaseRouter.patch('/bills/:id', auth, staff, validateBody(purchaseBillPatchBodySchema), patchPurchaseBillController);
purchaseRouter.post('/bills/:id/receive', auth, staff, receivePurchaseBillController);
purchaseRouter.post('/bills/:id/void', auth, staff, voidPurchaseBillController);
purchaseRouter.post('/bills/:id/payments', auth, staff, validateBody(purchasePaymentBodySchema), createPurchasePaymentController);
purchaseRouter.get('/bills/:id/payments', auth, staff, listPurchasePaymentsController);

purchaseRouter.get('/returns', auth, admin, listPurchaseReturnsController);
purchaseRouter.get('/returns/:id', auth, admin, getPurchaseReturnController);
purchaseRouter.post(
    '/bills/:id/returns',
    auth,
    admin,
    validateBody(purchaseReturnCreateBodySchema),
    createPurchaseReturnController,
);
purchaseRouter.post('/returns/:id/approve', auth, admin, approvePurchaseReturnController);
purchaseRouter.post('/returns/:id/void', auth, admin, voidPurchaseReturnController);

export default purchaseRouter;
