/**
 * Zod request-body schemas for checkout and auth. Wired in routes via middleware/validate.js.
 */
import { z } from 'zod';
import { validatePinFormat } from '../utils/pin.js';

const productLine = z.object({
    productId: z.union([z.string(), z.number()]),
    quantity: z.number().int().positive().max(9999).optional(),
});

/** POST /api/user/register */
export const registerBodySchema = z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320),
    password: z.string().min(1).max(256),
    // captchaToken: z.string().max(8000).optional(),
    // recaptchaToken: z.string().max(8000).optional(),
});

/** POST /api/admin/users — staff creates a customer (role User) */
export const adminCreateCustomerBodySchema = z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320),
    password: z.string().min(8).max(128),
    phone: z.string().trim().max(40).optional().nullable(),
    mobile: z.string().trim().max(40).optional().nullable(),
    addressLine: z.string().trim().max(500).optional().nullable(),
    address_line: z.string().trim().max(500).optional().nullable(),
    city: z.string().trim().max(120).optional().nullable(),
    state: z.string().trim().max(120).optional().nullable(),
    pincode: z.string().trim().max(32).optional().nullable(),
    zip: z.string().trim().max(32).optional().nullable(),
    country: z.string().trim().max(120).optional().nullable(),
});

/** POST /api/user/login */
export const loginBodySchema = z.object({
    email: z.string().trim().email().max(320),
    password: z.string().min(1).max(256),
    // captchaToken: z.string().max(8000).optional(),
    // recaptchaToken: z.string().max(8000).optional(),
});

const pinField = z.string().superRefine((val, ctx) => {
    const err = validatePinFormat(val);
    if (err) ctx.addIssue({ code: 'custom', message: err });
});

/** POST /api/user/setup-pin */
export const setupPinBodySchema = z.object({
    pin: pinField,
    confirmPin: z.string(),
    password: z.string().max(256).optional(),
});

/** POST /api/user/change-pin */
export const changePinBodySchema = z.object({
    currentPin: z.string().min(1).max(32),
    pin: pinField,
    confirmPin: z.string(),
});

/** POST /api/user/forgot-pin */
export const forgotPinBodySchema = z.object({
    email: z.string().trim().email().max(320),
});

/** POST /api/user/verify-forgot-pin-otp */
export const verifyForgotPinOtpBodySchema = z.object({
    email: z.string().trim().email().max(320),
    otp: z.string().trim().min(4).max(32),
});

/** POST /api/user/reset-pin */
export const resetPinBodySchema = z.object({
    email: z.string().trim().email().max(320),
    newPin: pinField,
    confirmPin: z.string(),
});

/** POST /api/user/login-pin */
export const loginPinBodySchema = z.object({
    email: z.string().trim().email().max(320),
    pin: z.string().min(1).max(32),
    // captchaToken: z.string().max(8000).optional(),
    // recaptchaToken: z.string().max(8000).optional(),
});

/** POST /api/user/deactivate-account */
export const deactivateAccountBodySchema = z.object({
    confirm: z.literal('DEACTIVATE'),
    password: z.string().max(256).optional(),
});

/** PUT /api/admin/users/:id/status */
export const adminUserStatusBodySchema = z.object({
    status: z.enum(['Active', 'Inactive']),
});

/** POST /api/feedback/submit */
export const feedbackSubmitBodySchema = z.object({
    targetType: z.enum(['product', 'seller', 'business']),
    productId: z.union([z.string(), z.number()]).optional(),
    sellerId: z.union([z.string(), z.number()]).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().trim().max(200).optional(),
    comment: z.string().trim().min(1).max(8000),
});

const inventoryProductId = z.union([z.string().trim().min(1), z.number().int().positive()]);
const warehouseIdField = z.union([z.string().trim().min(1), z.number().int().positive()]);

/** POST /api/inventory/add */
export const inventoryAddBodySchema = z.object({
    productId: inventoryProductId,
    warehouseId: warehouseIdField.optional(),
    quantity: z.number().int().positive().max(1_000_000),
    reason: z.string().trim().max(200).optional(),
    note: z.string().trim().max(2000).optional(),
});

/** POST /api/inventory/remove */
export const inventoryRemoveBodySchema = z.object({
    productId: inventoryProductId,
    warehouseId: warehouseIdField.optional(),
    quantity: z.number().int().positive().max(1_000_000),
    reason: z.string().trim().max(200).optional(),
    note: z.string().trim().max(2000).optional(),
});

/** POST /api/inventory/transfer */
export const inventoryTransferBodySchema = z.object({
    productId: inventoryProductId,
    fromWarehouseId: warehouseIdField,
    toWarehouseId: warehouseIdField,
    quantity: z.number().int().positive().max(1_000_000),
    note: z.string().trim().max(2000).optional(),
});

/** POST /api/inventory/warehouses */
export const createWarehouseBodySchema = z.object({
    code: z.string().trim().min(1).max(32),
    name: z.string().trim().min(1).max(200),
});

/** POST /api/order/preview-checkout — address optional */
export const previewCheckoutBodySchema = z.object({
    couponCode: z.string().trim().max(100).optional(),
    useCart: z.boolean().optional(),
    list_items: z.array(productLine).max(500).optional(),
});

const addressId = z.union([z.string().trim().min(1).max(64), z.number().int().positive()]);

/** POST place-cod / place-online — address required */
export const checkoutWithAddressBodySchema = z.object({
    addressId: addressId,
    couponCode: z.string().trim().max(100).optional(),
    useCart: z.boolean().optional(),
    list_items: z.array(productLine).max(500).optional(),
});

const salesProductId = z.union([z.string(), z.number()]);

/** Line item for POST/PATCH `/api/sales/quotations` */
export const salesQuotationLineSchema = z
    .object({
        productId: salesProductId,
        quantity: z.number().int().positive().max(9999).optional(),
        unitPrice: z.number().finite().optional(),
        unit_price: z.number().finite().optional(),
    })
    .superRefine((data, ctx) => {
        const u = data.unitPrice ?? data.unit_price;
        if (u == null || !Number.isFinite(u)) {
            ctx.addIssue({ code: 'custom', message: 'unitPrice required', path: ['unitPrice'] });
        }
    });

/** POST `/api/sales/quotations` */
export const salesQuotationCreateBodySchema = z.object({
    customerUserId: z.union([z.string(), z.number()]).optional().nullable(),
    validUntil: z.union([z.string().max(64), z.null()]).optional(),
    notes: z.string().max(10000).optional(),
    currency: z.string().trim().max(10).optional(),
    taxAmt: z.number().finite().optional(),
    shippingAmt: z.number().finite().optional(),
    lines: z.array(salesQuotationLineSchema).min(1).max(200),
});

/** PATCH `/api/sales/quotations/:id` (draft) */
export const salesQuotationDraftPatchBodySchema = z.object({
    validUntil: z.union([z.string().max(64), z.null()]).optional(),
    notes: z.string().max(10000).optional(),
    currency: z.string().trim().max(10).optional(),
    taxAmt: z.number().finite().optional(),
    shippingAmt: z.number().finite().optional(),
    lines: z.array(salesQuotationLineSchema).min(1).max(200).optional(),
});

/** PATCH `/api/sales/quotations/:id/status` */
export const salesQuotationStatusBodySchema = z.object({
    status: z.enum(['sent', 'accepted', 'declined', 'void', 'expired']),
});

/** PATCH `/api/sales/invoices/:id` (draft) */
export const salesInvoiceDraftPatchBodySchema = z.object({
    html_body: z.string().max(500000).optional(),
    regenerate: z.boolean().optional(),
});

const pidOpt = z.union([z.string(), z.number()]).optional();

/** POST/PATCH `/api/purchases/suppliers` */
export const purchaseSupplierBodySchema = z.object({
    name: z.string().trim().min(1).max(300),
    vatPan: z.string().trim().max(50).optional(),
    address: z.string().max(2000).optional(),
    phone: z.string().max(40).optional(),
    email: z.string().trim().max(320).optional(),
    notes: z.string().max(5000).optional(),
});

/** PUT `/api/purchases/suppliers/:id` */
export const purchaseSupplierPatchBodySchema = purchaseSupplierBodySchema.partial();

/** POST `/api/purchases/bills` */
export const purchaseBillCreateBodySchema = z.object({
    supplierId: z.union([z.string(), z.number()]),
    billDate: z.string().max(32).optional(),
    dueDate: z.string().max(32).optional().nullable(),
    warehouseId: pidOpt,
    currency: z.string().trim().max(10).optional(),
    companyVatPan: z.string().trim().max(50).optional(),
    notes: z.string().max(10000).optional(),
});

export const purchaseBillLineSchema = z.object({
    productId: z.union([z.string(), z.number()]).optional(),
    description: z.string().max(500).optional(),
    quantity: z.number().int().positive().max(999999),
    unitPriceExclVat: z.number().finite().nonnegative(),
    vatRate: z.number().finite().min(0).max(100).optional(),
});

/** PATCH `/api/purchases/bills/:id` */
export const purchaseBillPatchBodySchema = z.object({
    lines: z.array(purchaseBillLineSchema).min(1).max(200).optional(),
    billDate: z.string().max(32).optional(),
    dueDate: z.string().max(32).optional().nullable(),
    warehouseId: pidOpt,
    currency: z.string().trim().max(10).optional(),
    companyVatPan: z.string().trim().max(50).optional(),
    notes: z.string().max(10000).optional(),
});

/** POST `/api/purchases/bills/:id/payments` */
export const purchasePaymentBodySchema = z.object({
    amount: z.number().finite().positive(),
    paidAt: z.string().max(64).optional(),
    method: z.string().trim().max(40).optional(),
    reference: z.string().trim().max(120).optional(),
    note: z.string().max(2000).optional(),
});

export const purchaseReturnLineSchema = z.object({
    purchaseBillLineId: z.union([z.string(), z.number()]),
    quantity: z.number().int().positive().max(999999),
});

/** POST `/api/purchases/bills/:id/returns` */
export const purchaseReturnCreateBodySchema = z.object({
    reason: z.string().max(5000).optional(),
    lines: z.array(purchaseReturnLineSchema).min(1).max(200),
});
