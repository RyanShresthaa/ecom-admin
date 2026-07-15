/**
 * /api/sales — quotations, formal invoices, credit notes (staff + scoped buyer).
 * @see controllers/sales.controller.js
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import { staff } from '../../shared/middleware/roles.js';
import { validateBody } from '../../shared/middleware/validate.js';
import {
    salesQuotationCreateBodySchema,
    salesQuotationDraftPatchBodySchema,
    salesQuotationStatusBodySchema,
    salesInvoiceDraftPatchBodySchema,
} from '../../shared/validation/schemas.js';
import {
    createQuotationController,
    listQuotationsController,
    getQuotationDetailController,
    updateQuotationDraftController,
    updateQuotationStatusController,
    acceptQuotationAsCustomerController,
    createInvoiceFromOrderController,
    listSalesInvoicesController,
    getSalesInvoiceController,
    updateSalesInvoiceDraftController,
    issueSalesInvoiceController,
    voidSalesInvoiceController,
    reviseSalesInvoiceController,
    listCreditNotesController,
    getCreditNoteController,
} from '../controllers/sales.controller.js';

const salesRouter = Router();

salesRouter.post('/quotations', auth, staff, validateBody(salesQuotationCreateBodySchema), createQuotationController);
salesRouter.get('/quotations', auth, listQuotationsController);
salesRouter.get('/quotations/:id', auth, getQuotationDetailController);
salesRouter.patch(
    '/quotations/:id/status',
    auth,
    staff,
    validateBody(salesQuotationStatusBodySchema),
    updateQuotationStatusController,
);
salesRouter.patch(
    '/quotations/:id',
    auth,
    staff,
    validateBody(salesQuotationDraftPatchBodySchema),
    updateQuotationDraftController,
);
salesRouter.post('/quotations/:id/accept', auth, acceptQuotationAsCustomerController);

salesRouter.post('/invoices/from-order/:orderId', auth, staff, createInvoiceFromOrderController);
salesRouter.post('/invoices/by-order/:orderId/revise', auth, staff, reviseSalesInvoiceController);
salesRouter.get('/invoices', auth, listSalesInvoicesController);
salesRouter.get('/invoices/:id', auth, getSalesInvoiceController);
salesRouter.patch(
    '/invoices/:id',
    auth,
    staff,
    validateBody(salesInvoiceDraftPatchBodySchema),
    updateSalesInvoiceDraftController,
);
salesRouter.post('/invoices/:id/issue', auth, staff, issueSalesInvoiceController);
salesRouter.post('/invoices/:id/void', auth, staff, voidSalesInvoiceController);

salesRouter.get('/credit-notes', auth, listCreditNotesController);
salesRouter.get('/credit-notes/:id', auth, getCreditNoteController);

export default salesRouter;
