/**
 * /api/shop — public tax/shipping settings; admin read/update; shipping zones (Phase 3).
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import { staff } from '../../shared/middleware/roles.js';
import { validateBody } from '../../shared/middleware/validate.js';
import { shippingZoneBodySchema, shippingRateBodySchema } from '../../shared/validation/schemas.js';
import {
    getAdminSettingsController,
    getPaymentStatusController,
    getPublicSettingsController,
    updateSettingsController,
} from '../controllers/settings.controller.js';
import {
    listZonesController,
    createZoneController,
    updateZoneController,
    deleteZoneController,
    createRateController,
    updateRateController,
    deleteRateController,
    quoteShippingController,
} from '../controllers/shipping.controller.js';

const shopRouter = Router();
// GET /settings - fetch public shop/tax/shipping settings.
shopRouter.get('/settings', getPublicSettingsController);
// GET /settings/admin - fetch admin settings (requires auth + staff).
shopRouter.get('/settings/admin', auth, staff, getAdminSettingsController);
// PUT /settings - update admin settings (requires auth + staff).
shopRouter.put('/settings', auth, staff, updateSettingsController);
// GET /payments/status - Stripe connection status for admin (requires auth + staff).
shopRouter.get('/payments/status', auth, staff, getPaymentStatusController);

// Shipping zones / rates
// GET /shipping/zones - list shipping zones (requires auth + staff).
shopRouter.get('/shipping/zones', auth, staff, listZonesController);
// POST /shipping/zones - create shipping zone (requires auth + staff + schema validation).
shopRouter.post('/shipping/zones', auth, staff, validateBody(shippingZoneBodySchema), createZoneController);
// PUT /shipping/zones - update shipping zone (requires auth + staff).
shopRouter.put('/shipping/zones', auth, staff, updateZoneController);
// DELETE /shipping/zones - delete shipping zone (requires auth + staff).
shopRouter.delete('/shipping/zones', auth, staff, deleteZoneController);
// POST /shipping/rates - create shipping rate (requires auth + staff + schema validation).
shopRouter.post('/shipping/rates', auth, staff, validateBody(shippingRateBodySchema), createRateController);
// PUT /shipping/rates - update shipping rate (requires auth + staff).
shopRouter.put('/shipping/rates', auth, staff, updateRateController);
// DELETE /shipping/rates - delete shipping rate (requires auth + staff).
shopRouter.delete('/shipping/rates', auth, staff, deleteRateController);
// POST /shipping/quote - quote shipping for current request payload (requires auth).
shopRouter.post('/shipping/quote', auth, quoteShippingController);

export default shopRouter;
