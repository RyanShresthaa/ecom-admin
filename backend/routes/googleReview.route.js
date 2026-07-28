import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/roles.js';
import {
    listPublicGoogleReviewsController,
    listAdminGoogleReviewsController,
    setGoogleReviewVisibilityController,
    bulkGoogleReviewVisibilityController,
    syncGooglePlacesReviewsController,
} from '../controllers/googleReview.controller.js';

const googleReviewRouter = Router();

googleReviewRouter.get('/', listPublicGoogleReviewsController);
googleReviewRouter.get('/admin', auth, admin, listAdminGoogleReviewsController);
googleReviewRouter.post('/admin/sync', auth, admin, syncGooglePlacesReviewsController);
googleReviewRouter.put('/admin/bulk-visibility', auth, admin, bulkGoogleReviewVisibilityController);
googleReviewRouter.put('/:id/visibility', auth, admin, setGoogleReviewVisibilityController);

export default googleReviewRouter;
