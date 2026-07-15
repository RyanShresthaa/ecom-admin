/**
 * /api/shop — public tax/shipping settings; admin read/update.
 * @see controllers/settings.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import { admin, staff } from '../../shared/middleware/roles.js';
import {
    getAdminSettingsController,
    getPublicSettingsController,
    updateSettingsController,
} from '../controllers/settings.controller.js';

const shopRouter = Router();
shopRouter.get('/settings', getPublicSettingsController);
shopRouter.get('/settings/admin', auth, staff, getAdminSettingsController);
shopRouter.put('/settings', auth, staff, updateSettingsController);

export default shopRouter;
