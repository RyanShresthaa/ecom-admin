import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/roles.js';
import {
    listPublicGoogleReviewsController,
    listAdminGoogleReviewsController,
    setGoogleReviewVisibilityController,
    bulkGoogleReviewVisibilityController,
    syncGooglePlacesReviewsController,
    createGoogleReviewController,
    updateGoogleReviewController,
    deleteGoogleReviewController,
} from '../controllers/googleReview.controller.js';

const googleReviewRouter = Router();

googleReviewRouter.get('/', listPublicGoogleReviewsController);
googleReviewRouter.get('/admin', auth, admin, listAdminGoogleReviewsController);
googleReviewRouter.post('/admin', auth, admin, createGoogleReviewController);
googleReviewRouter.post('/admin/sync', auth, admin, syncGooglePlacesReviewsController);
googleReviewRouter.put('/admin/bulk-visibility', auth, admin, bulkGoogleReviewVisibilityController);
googleReviewRouter.put('/admin/:id', auth, admin, updateGoogleReviewController);
googleReviewRouter.delete('/admin/:id', auth, admin, deleteGoogleReviewController);
googleReviewRouter.put('/:id/visibility', auth, admin, setGoogleReviewVisibilityController);

export default googleReviewRouter;
