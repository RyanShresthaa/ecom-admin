/**
 * Customer feedback for product, seller, or business (optional auth for anonymous tips).
 */
import { findProductById } from '../../shared/models/product.model.js';
import { findUserById } from '../../shared/models/user.model.js';
import { insertFeedback } from '../../shared/models/feedback.model.js';
import { pickId } from '../../shared/utils/sql.js';

const TARGETS = new Set(['product', 'seller', 'business']);

export async function submitFeedbackController(req, res) {
    try {
        const { targetType, productId, sellerId, rating, title, comment } = req.body || {};
        if (!targetType || !TARGETS.has(String(targetType))) {
            return res.status(400).json({
                message: 'targetType must be product, seller, or business',
                error: true,
                success: false,
            });
        }
        const text = String(comment ?? '').trim();
        if (!text) {
            return res.status(400).json({ message: 'comment is required', error: true, success: false });
        }

        let pid = productId != null ? Number(pickId(productId)) : null;
        let sid = sellerId != null ? Number(pickId(sellerId)) : null;

        if (targetType === 'product') {
            if (!pid || Number.isNaN(pid)) {
                return res.status(400).json({ message: 'productId is required', error: true, success: false });
            }
            const p = await findProductById(pid);
            if (!p) {
                return res.status(404).json({ message: 'Product not found', error: true, success: false });
            }
            sid = p.seller_id != null ? Number(p.seller_id) : null;
        } else if (targetType === 'seller') {
            if (!sid || Number.isNaN(sid)) {
                return res.status(400).json({ message: 'sellerId is required', error: true, success: false });
            }
            const seller = await findUserById(sid);
            if (!seller || (seller.role !== 'Seller' && seller.role !== 'Admin')) {
                return res.status(404).json({ message: 'Seller not found', error: true, success: false });
            }
            pid = null;
        } else {
            pid = null;
            sid = null;
        }

        if (rating != null) {
            const n = Number(rating);
            if (Number.isNaN(n) || n < 1 || n > 5) {
                return res.status(400).json({ message: 'rating must be 1–5 or omitted', error: true, success: false });
            }
        }

        const userId = req.userId ?? null;
        const row = await insertFeedback({
            userId,
            targetType,
            productId: pid,
            sellerId: sid,
            rating: rating != null ? Number(rating) : null,
            title,
            comment: text,
        });
        return res.status(201).json({ message: 'Feedback submitted', data: row, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message || e, error: true, success: false });
    }
}
