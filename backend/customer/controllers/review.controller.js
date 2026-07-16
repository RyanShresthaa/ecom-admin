/**
 * Product reviews — list public; add/delete tied to `req.userId`.
 */
import { createReview, findReviewsByProduct, getProductRatingSummary, deleteReview } from '../../shared/models/review.model.js';
import { pickId } from '../../shared/utils/sql.js';

// POST /api/review/add — creates a product review from a verified buyer.
export async function addReviewController(req, res) {
    try {
        const productId = pickId(req.body.productId);
        const rating = Number(req.body.rating);
        const comment = req.body.comment || '';
        if (!productId || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'productId and rating 1-5 required', error: true, success: false });
        }
        const data = await createReview({ userId: req.userId, productId, rating, comment });
        return res.json({ message: 'Review added', data, error: false, success: true });
    } catch (e) {
        if (e.code === '23505') {
            return res.status(400).json({ message: 'You already reviewed this product', error: true, success: false });
        }
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/review/get — fetches product reviews and ratings.
export async function getReviewsController(req, res) {
    try {
        const productId = pickId(req.params.productId);
        const [data, summary] = await Promise.all([
            findReviewsByProduct(productId),
            getProductRatingSummary(productId),
        ]);
        return res.json({ data, summary, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// DELETE /api/review/delete — removes a review by owner or admin.
export async function deleteReviewController(req, res) {
    try {
        const ok = await deleteReview(pickId(req.params.id), req.userId);
        if (!ok) return res.status(404).json({ message: 'Review not found', error: true, success: false });
        return res.json({ message: 'Deleted', error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

