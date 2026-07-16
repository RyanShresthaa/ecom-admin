/**
 * /api/return — request return, list mine, admin list/update.
 * @see controllers/return.controller.js · OpenAPI: docs/openapi/commerce.paths.js
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import { admin } from '../../shared/middleware/roles.js';
import {
    allReturnsController,
    myReturnsController,
    requestReturnController,
    updateReturnController,
} from '../controllers/return.controller.js';

const returnRouter = Router();
// POST /request - create return request (requires auth).
returnRouter.post('/request', auth, requestReturnController);
// GET /my - list current user's return requests (requires auth).
returnRouter.get('/my', auth, myReturnsController);
// GET /all - list all return requests (requires auth + admin).
returnRouter.get('/all', auth, admin, allReturnsController);
// PUT /update - update return status/fields (requires auth + admin).
returnRouter.put('/update', auth, admin, updateReturnController);

export default returnRouter;
