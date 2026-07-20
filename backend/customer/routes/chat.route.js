/**
 * /api/chat — storefront chatbot (stub provider; swap LLM later).
 * @see controllers/chat.controller.js · OpenAPI: docs/openapi/chat.paths.js
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import optionalAuth from '../../shared/middleware/optionalAuth.js';
import { validateBody } from '../../shared/middleware/validate.js';
import {
    chatSessionCreateBodySchema,
    chatMessageBodySchema,
} from '../../shared/validation/schemas.js';
import {
    getChatStatusController,
    createChatSessionController,
    listChatSessionsController,
    getChatSessionController,
    listChatMessagesController,
    sendChatMessageController,
    closeChatSessionController,
} from '../controllers/chat.controller.js';

const chatRouter = Router();

chatRouter.get('/status', getChatStatusController);
chatRouter.post('/sessions', optionalAuth, validateBody(chatSessionCreateBodySchema), createChatSessionController);
chatRouter.get('/sessions', auth, listChatSessionsController);
chatRouter.get('/sessions/:id', optionalAuth, getChatSessionController);
chatRouter.get('/sessions/:id/messages', optionalAuth, listChatMessagesController);
chatRouter.post(
    '/sessions/:id/messages',
    optionalAuth,
    validateBody(chatMessageBodySchema),
    sendChatMessageController,
);
chatRouter.post('/sessions/:id/close', optionalAuth, closeChatSessionController);

export default chatRouter;
