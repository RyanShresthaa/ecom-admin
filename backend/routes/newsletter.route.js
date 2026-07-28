/**
 * /api/newsletter — public subscribe; admin list + CSV export.
 */
import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/roles.js';
import { contactLimiter } from '../middleware/rateLimiter.js';
import {
    exportNewsletterSubscribersController,
    listNewsletterSubscribersController,
    subscribeNewsletterController,
} from '../controllers/newsletter.controller.js';

const newsletterRouter = Router();
newsletterRouter.post('/subscribe', contactLimiter, subscribeNewsletterController);
newsletterRouter.get('/admin', auth, admin, listNewsletterSubscribersController);
newsletterRouter.get('/admin/export', auth, admin, exportNewsletterSubscribersController);

export default newsletterRouter;
