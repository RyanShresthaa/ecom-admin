/**
 * Zod request-body schemas for checkout and auth. Wired in routes via middleware/validate.js.
 */
import { z } from 'zod';
import { validatePinFormat } from '../utils/pin.js';

// Validate product lines used by checkout preview/place endpoints.
const productLine = z.object({
    productId: z.union([z.string(), z.number()]),
    variantId: z.union([z.string(), z.number()]).optional().nullable(),
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

// Enforce PIN format rules for setup/change/reset PIN routes.
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
export const forgotPinBodySchema = z
    .object({
        email: z.string().trim().email().max(320).optional(),
        mobile: z.string().trim().min(3).max(40).optional(),
        channel: z.enum(['email', 'sms']).optional(),
    })
    // Require at least one recovery identifier for forgot-pin requests.
    .refine((b) => Boolean(b.email || b.mobile), {
        message: 'email or mobile is required',
    });

/** POST /api/user/verify-forgot-pin-otp */
export const verifyForgotPinOtpBodySchema = z
    .object({
        email: z.string().trim().email().max(320).optional(),
        mobile: z.string().trim().min(3).max(40).optional(),
        otp: z.string().trim().min(4).max(32),
    })
    // Ensure OTP verification includes either email or mobile context.
    .refine((b) => Boolean(b.email || b.mobile), {
        message: 'email or mobile is required',
    });

/** POST /api/user/reset-pin */
export const resetPinBodySchema = z
    .object({
        email: z.string().trim().email().max(320).optional(),
        mobile: z.string().trim().min(3).max(40).optional(),
        newPin: pinField,
        confirmPin: z.string(),
    })
    // Require account identifier before allowing PIN reset.
    .refine((b) => Boolean(b.email || b.mobile), {
        message: 'email or mobile is required',
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

// Shared product identifier schema for inventory mutation endpoints.
const inventoryProductId = z.union([z.string().trim().min(1), z.number().int().positive()]);
// Shared warehouse identifier schema for inventory operations.
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

/** POST /api/order/preview-checkout — address optional (enables zone shipping) */
export const previewCheckoutBodySchema = z.object({
    addressId: z.union([z.string().trim().min(1).max(64), z.number().int().positive()]).optional(),
    couponCode: z.string().trim().max(100).optional(),
    useCart: z.boolean().optional(),
    list_items: z.array(productLine).max(500).optional(),
});

// Shared address identifier for checkout routes that require delivery address.
const addressId = z.union([z.string().trim().min(1).max(64), z.number().int().positive()]);

/** Shared checkout body — address required */
export const checkoutWithAddressBodySchema = z.object({
    addressId: addressId,
    couponCode: z.string().trim().max(100).optional(),
    useCart: z.boolean().optional(),
    list_items: z.array(productLine).max(500).optional(),
});

/** POST /api/order/place — customer chooses cash or stripe */
export const placeOrderBodySchema = checkoutWithAddressBodySchema.extend({
    paymentMethod: z.enum(['cash', 'stripe']),
});

/** POST /api/order/confirm-stripe — after Stripe Checkout redirect */
export const confirmStripeBodySchema = z.object({
    sessionId: z.string().trim().min(1).max(200),
});

/**
 * POST /api/payment/refund — staff full/partial refund (Phase 1: provider manual).
 * Stripe provider accepted in schema but returns 501 until implemented.
 */
export const createRefundBodySchema = z.object({
    orderRowId: z.union([z.string().trim().min(1).max(64), z.number().int().positive()]),
    amount: z.number().finite().positive().max(1_000_000_000).optional(),
    reason: z.string().trim().max(2000).optional(),
    provider: z.enum(['manual', 'stripe']).optional(),
    restoreStock: z.boolean().optional(),
    createCreditNote: z.boolean().optional(),
});

/** PUT /api/order/tracking */
export const updateTrackingBodySchema = z
    .object({
        orderGroupId: z.string().trim().min(1).max(100).optional(),
        orderId: z.string().trim().min(1).max(100).optional(),
        orderRowId: z.union([z.string(), z.number()]).optional(),
        _id: z.union([z.string(), z.number()]).optional(),
        tracking_number: z.string().trim().max(100).optional().nullable(),
        trackingNumber: z.string().trim().max(100).optional().nullable(),
        carrier: z.string().trim().max(100).optional().nullable(),
    })
    // Require at least one order identifier before updating tracking.
    .refine((b) => b.orderGroupId || b.orderId || b.orderRowId || b._id, {
        message: 'orderGroupId or orderRowId required',
    });

/** POST /api/order/reorder */
export const reorderBodySchema = z
    .object({
        orderGroupId: z.string().trim().min(1).max(100).optional(),
        orderId: z.string().trim().min(1).max(100).optional(),
        orderRowId: z.union([z.string(), z.number()]).optional(),
        _id: z.union([z.string(), z.number()]).optional(),
    })
    // Ensure reorder requests point to an existing order reference.
    .refine((b) => b.orderGroupId || b.orderId || b.orderRowId || b._id, {
        message: 'orderGroupId or orderRowId required',
    });

/** Shipping zone create */
export const shippingZoneBodySchema = z.object({
    name: z.string().trim().min(1).max(120),
    match_type: z.enum(['city', 'state', 'country', 'default']).optional(),
    matchType: z.enum(['city', 'state', 'country', 'default']).optional(),
    match_value: z.string().trim().max(120).optional(),
    matchValue: z.string().trim().max(120).optional(),
    active: z.boolean().optional(),
    priority: z.number().int().min(0).max(10000).optional(),
});

export const shippingRateBodySchema = z.object({
    zoneId: z.union([z.string(), z.number()]).optional(),
    zone_id: z.union([z.string(), z.number()]).optional(),
    rate: z.number().finite().min(0).max(1_000_000),
    free_min: z.number().finite().min(0).optional().nullable(),
    freeMin: z.number().finite().min(0).optional().nullable(),
    currency: z.string().trim().max(10).optional(),
    active: z.boolean().optional(),
});

// Shared product id type for sales quotation line items.
const salesProductId = z.union([z.string(), z.number()]);

/** Line item for POST/PATCH `/api/sales/quotations` */
export const salesQuotationLineSchema = z
    .object({
        productId: salesProductId,
        quantity: z.number().int().positive().max(9999).optional(),
        unitPrice: z.number().finite().optional(),
        unit_price: z.number().finite().optional(),
    })
    // Require unit price field in either camelCase or snake_case payloads.
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

// Optional foreign-key helper for warehouse and related entity ids.
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
