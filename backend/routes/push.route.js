/**
 * /api/push — VAPID key (public) + subscribe/unsubscribe (auth).
 */
import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
    getVapidPublicKeyController,
    subscribePushController,
    unsubscribePushController,
} from '../controllers/push.controller.js';

const pushRouter = Router();
pushRouter.get('/vapid-public-key', getVapidPublicKeyController);
pushRouter.post('/subscribe', auth, subscribePushController);
pushRouter.delete('/unsubscribe', auth, unsubscribePushController);

export default pushRouter;
