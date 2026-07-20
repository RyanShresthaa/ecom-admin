/**
 * /api/admin/chat — staff chat session review.
 * @see customer/controllers/chat.controller.js · OpenAPI: docs/openapi/chat.paths.js
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import { staff } from '../../shared/middleware/roles.js';
import {
    adminListChatSessionsController,
    adminListChatMessagesController,
} from '../../customer/controllers/chat.controller.js';

const chatAdminRouter = Router();

chatAdminRouter.get('/sessions', auth, staff, adminListChatSessionsController);
chatAdminRouter.get('/sessions/:id/messages', auth, staff, adminListChatMessagesController);

export default chatAdminRouter;
