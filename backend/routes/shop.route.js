/**
 * /api/shop — public tax/shipping settings; admin read/update.
 * @see controllers/settings.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/roles.js';
import {
    getAdminSettingsController,
    getPublicSettingsController,
    updateSettingsController,
} from '../controllers/settings.controller.js';

const shopRouter = Router();
shopRouter.get('/settings', getPublicSettingsController);
shopRouter.get('/settings/admin', auth, admin, getAdminSettingsController);
shopRouter.put('/settings', auth, admin, updateSettingsController);

export default shopRouter;
