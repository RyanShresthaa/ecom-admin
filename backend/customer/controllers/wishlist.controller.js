/**
 * Wishlist add/list/remove for `/api/wishlist`.
 */
import { addWishlist, removeWishlist, findWishlistByUser } from '../../shared/models/wishlist.model.js';
import { pickId } from '../../shared/utils/sql.js';

export async function getWishlistController(req, res) {
    try {
        const data = await findWishlistByUser(req.userId);
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function addWishlistController(req, res) {
    try {
        const productId = pickId(req.body.productId);
        if (!productId) {
            return res.status(400).json({ message: 'productId required', error: true, success: false });
        }
        const data = await addWishlist(req.userId, productId);
        return res.json({ message: 'Added to wishlist', data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function removeWishlistController(req, res) {
    try {
        await removeWishlist(req.userId, pickId(req.body.productId));
        return res.json({ message: 'Removed', error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}
