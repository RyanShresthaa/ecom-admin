/**
 * Wishlist add/list/remove + share links for `/api/wishlist`.
 */
import { addWishlist, removeWishlist, findWishlistByUser } from '../models/wishlist.model.js';
import {
    createOrRefreshWishlistShare,
    findActiveWishlistShareByUser,
    deactivateWishlistShares,
    getSharedWishlistPayload,
} from '../models/wishlistShare.model.js';
import { pickId } from '../utils/sql.js';
import { findUserById, updateUser } from '../models/user.model.js';
import { normalizeNotificationPrefs } from '../utils/notificationPrefs.js';
import { getTrustedFrontendBaseUrl } from '../config/security.js';

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

function shareUrlForToken(token) {
    const base = getTrustedFrontendBaseUrl().replace(/\/$/, '');
    return `${base}/wishlist/shared/${token}`;
}

export async function createWishlistShareController(req, res) {
    try {
        const share = await createOrRefreshWishlistShare(req.userId);
        const user = await findUserById(req.userId);
        const prefs = normalizeNotificationPrefs(user?.notification_prefs);
        if (!prefs.shareWishlist) {
            await updateUser(req.userId, {
                notification_prefs: { ...prefs, shareWishlist: true },
            });
        }
        return res.json({
            message: 'Wishlist share link created',
            error: false,
            success: true,
            data: {
                token: share.token,
                url: shareUrlForToken(share.token),
            },
        });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function getMyWishlistShareController(req, res) {
    try {
        const share = await findActiveWishlistShareByUser(req.userId);
        if (!share) {
            return res.json({
                data: null,
                error: false,
                success: true,
            });
        }
        return res.json({
            data: {
                token: share.token,
                url: shareUrlForToken(share.token),
            },
            error: false,
            success: true,
        });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function revokeWishlistShareController(req, res) {
    try {
        await deactivateWishlistShares(req.userId);
        const user = await findUserById(req.userId);
        const prefs = normalizeNotificationPrefs(user?.notification_prefs);
        if (prefs.shareWishlist) {
            await updateUser(req.userId, {
                notification_prefs: { ...prefs, shareWishlist: false },
            });
        }
        return res.json({ message: 'Wishlist share revoked', error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function getSharedWishlistController(req, res) {
    try {
        const payload = await getSharedWishlistPayload(req.params.token);
        if (!payload) {
            return res.status(404).json({
                message: 'Shared wishlist not found or disabled',
                error: true,
                success: false,
            });
        }
        return res.json({ data: payload, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}
