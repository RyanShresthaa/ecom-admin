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
returnRouter.post('/request', auth, requestReturnController);
returnRouter.get('/my', auth, myReturnsController);
returnRouter.get('/all', auth, admin, allReturnsController);
returnRouter.put('/update', auth, admin, updateReturnController);

export default returnRouter;
