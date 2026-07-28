/**
 * Google / homepage reviews — public list (visible only) + admin visibility.
 */
import {
    findVisibleGoogleReviews,
    findAllGoogleReviews,
    setGoogleReviewVisibility,
    setAllGoogleReviewsVisibility,
    upsertGoogleReviewFromPlace,
} from '../models/googleReview.model.js';
import { pickId } from '../utils/sql.js';

export async function listPublicGoogleReviewsController(_req, res) {
    try {
        const data = await findVisibleGoogleReviews();
        return res.json({ message: 'Google reviews', data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function listAdminGoogleReviewsController(_req, res) {
    try {
        const data = await findAllGoogleReviews();
        return res.json({ message: 'Google reviews', data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function setGoogleReviewVisibilityController(req, res) {
    try {
        const id = pickId(req.params.id);
        if (!id) {
            return res.status(400).json({ message: 'id is required', error: true, success: false });
        }
        const isVisible =
            req.body?.isVisible === true ||
            req.body?.is_visible === true ||
            req.body?.visible === true;
        const explicitFalse =
            req.body?.isVisible === false ||
            req.body?.is_visible === false ||
            req.body?.visible === false;
        if (!isVisible && !explicitFalse) {
            return res.status(400).json({
                message: 'isVisible boolean is required',
                error: true,
                success: false,
            });
        }
        const data = await setGoogleReviewVisibility(id, isVisible);
        if (!data) {
            return res.status(404).json({ message: 'Review not found', error: true, success: false });
        }
        return res.json({
            message: data.isVisible ? 'Review visible on storefront' : 'Review hidden from storefront',
            data,
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function bulkGoogleReviewVisibilityController(req, res) {
    try {
        const isVisible =
            req.body?.isVisible === true ||
            req.body?.is_visible === true ||
            req.body?.visible === true;
        const explicitFalse =
            req.body?.isVisible === false ||
            req.body?.is_visible === false ||
            req.body?.visible === false;
        if (!isVisible && !explicitFalse) {
            return res.status(400).json({
                message: 'isVisible boolean is required',
                error: true,
                success: false,
            });
        }
        const data = await setAllGoogleReviewsVisibility(isVisible);
        return res.json({
            message: isVisible ? 'All reviews shown' : 'All reviews hidden',
            data,
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

/**
 * Sync reviews from Google Places API (Place Details).
 * Requires GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID in env.
 */
export async function syncGooglePlacesReviewsController(_req, res) {
    try {
        const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
        const placeId = process.env.GOOGLE_PLACE_ID;
        if (!apiKey || !placeId) {
            return res.status(503).json({
                message:
                    'Google Places sync is not configured. Set GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID on the backend.',
                error: true,
                success: false,
            });
        }

        const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        url.searchParams.set('place_id', placeId);
        url.searchParams.set('fields', 'name,rating,reviews,user_ratings_total');
        url.searchParams.set('reviews_sort', 'newest');
        url.searchParams.set('key', apiKey);

        const resp = await fetch(url.toString());
        const json = await resp.json();
        if (json.status !== 'OK') {
            return res.status(502).json({
                message: `Google Places error: ${json.status}${json.error_message ? ` — ${json.error_message}` : ''}`,
                error: true,
                success: false,
            });
        }

        const reviews = Array.isArray(json.result?.reviews) ? json.result.reviews : [];
        const saved = [];
        for (let i = 0; i < reviews.length; i++) {
            const row = await upsertGoogleReviewFromPlace(reviews[i], i);
            if (row) saved.push(row);
        }

        return res.json({
            message: `Synced ${saved.length} review(s) from Google Places`,
            data: {
                placeName: json.result?.name || null,
                rating: json.result?.rating ?? null,
                totalRatings: json.result?.user_ratings_total ?? null,
                imported: saved.length,
                reviews: await findAllGoogleReviews(),
            },
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
}
