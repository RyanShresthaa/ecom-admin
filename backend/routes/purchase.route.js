/**
 * /api/purchases — Nepal VAT (13%) procurement: suppliers, bills, payment-out, returns. **Admin only.**
 */
import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/roles.js';
import { validateBody } from '../middleware/validate.js';
import {
    purchaseSupplierBodySchema,
    purchaseSupplierPatchBodySchema,
    purchaseBillCreateBodySchema,
    purchaseBillPatchBodySchema,
    purchasePaymentBodySchema,
    purchaseReturnCreateBodySchema,
} from '../validation/schemas.js';
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

purchaseRouter.post('/suppliers', auth, admin, validateBody(purchaseSupplierBodySchema), createSupplierController);
purchaseRouter.get('/suppliers', auth, admin, listSuppliersController);
purchaseRouter.get('/suppliers/:id', auth, admin, getSupplierController);
purchaseRouter.put(
    '/suppliers/:id',
    auth,
    admin,
    validateBody(purchaseSupplierPatchBodySchema),
    updateSupplierController,
);

purchaseRouter.post('/bills', auth, admin, validateBody(purchaseBillCreateBodySchema), createPurchaseBillController);
purchaseRouter.get('/bills', auth, admin, listPurchaseBillsController);
purchaseRouter.get('/bills/:id', auth, admin, getPurchaseBillController);
purchaseRouter.get('/bills/:id/preview', auth, admin, previewPurchaseBillController);
purchaseRouter.patch('/bills/:id', auth, admin, validateBody(purchaseBillPatchBodySchema), patchPurchaseBillController);
purchaseRouter.post('/bills/:id/receive', auth, admin, receivePurchaseBillController);
purchaseRouter.post('/bills/:id/void', auth, admin, voidPurchaseBillController);
purchaseRouter.post('/bills/:id/payments', auth, admin, validateBody(purchasePaymentBodySchema), createPurchasePaymentController);
purchaseRouter.get('/bills/:id/payments', auth, admin, listPurchasePaymentsController);

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
