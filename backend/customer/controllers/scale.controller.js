/**
 * Scale feature HTTP handlers — flags, MFA, FX, loyalty, recs, reservations, payouts, push.
 */
import { pickId } from '../../shared/utils/sql.js';
import { listFlags, setFlag, isEnabled } from '../../shared/services/featureFlags/index.js';
import {
    beginMfaEnrollment,
    confirmMfaEnrollment,
    disableMfa,
    getUserMfa,
} from '../../shared/services/mfa/index.js';
import { listFxRates, upsertFxRate, convertForDisplay, convertAmount } from '../../shared/services/fx/index.js';
import {
    getLoyaltyAccount,
    listLoyaltyLedger,
    redeemPoints,
    adjustPoints,
} from '../../shared/services/loyalty/index.js';
import {
    listRelated,
    setRelated,
    removeRelated,
} from '../../shared/services/recommendations/index.js';
import {
    reserveStock,
    releaseReservation,
    listReservationsForUser,
    expireStaleReservations,
} from '../../shared/services/reservations/index.js';
import {
    getSellerBalance,
    listSellerEarnings,
    listSellerPayouts,
    createSellerPayout,
    getCommissionRate,
} from '../../shared/services/payouts/index.js';
import {
    registerDeviceToken,
    unregisterDeviceToken,
    listDeviceTokens,
    sendPushToUser,
} from '../../shared/services/push/index.js';
import { findUserById } from '../../shared/models/user.model.js';
import { logAudit } from '../../shared/models/audit.model.js';
import { getClientIp, getUserAgent } from '../../shared/utils/requestMeta.js';

function errStatus(e) {
    return e.status || 500;
}

// —— Feature flags ——
export async function listFlagsController(_req, res) {
    try {
        return res.json({ data: await listFlags(), error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// PUT /api/scale/flags — updates a platform feature flag.
export async function setFlagController(req, res) {
    try {
        const key = req.body.key || req.params.key;
        const data = await setFlag(key, req.body.enabled, {
            description: req.body.description,
            meta: req.body.meta,
        });
        await logAudit({
            adminId: req.userId,
            action: 'feature_flag.set',
            entityType: 'feature_flag',
            entityId: key,
            details: { enabled: req.body.enabled },
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({ message: 'Flag updated', data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// —— MFA ——
export async function mfaStatusController(req, res) {
    try {
        const user = await getUserMfa(req.userId);
        return res.json({
            data: {
                enabled: Boolean(user?.mfa_enabled),
                featureEnabled: await isEnabled('mfa'),
            },
            error: false,
            success: true,
        });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/scale/mfa/begin — starts MFA enrollment challenge.
export async function mfaBeginController(req, res) {
    try {
        const user = await findUserById(req.userId);
        const data = await beginMfaEnrollment(req.userId, user.email);
        return res.json({ message: 'Scan QR / enter secret in authenticator', data, error: false, success: true });
    } catch (e) {
        return res.status(errStatus(e)).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/scale/mfa/confirm — confirms MFA enrollment code.
export async function mfaConfirmController(req, res) {
    try {
        const data = await confirmMfaEnrollment(req.userId, req.body.code);
        return res.json({
            message: 'MFA enabled — store backup codes securely',
            data,
            error: false,
            success: true,
        });
    } catch (e) {
        return res.status(errStatus(e)).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/scale/mfa/disable — disables MFA for current user.
export async function mfaDisableController(req, res) {
    try {
        const data = await disableMfa(req.userId, req.body.code);
        return res.json({ message: 'MFA disabled', data, error: false, success: true });
    } catch (e) {
        return res.status(errStatus(e)).json({ message: e.message, error: true, success: false });
    }
}

// —— FX ——
export async function listFxController(_req, res) {
    try {
        return res.json({ data: await listFxRates(), error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// PUT /api/scale/fx/rates — creates or updates exchange rates.
export async function upsertFxController(req, res) {
    try {
        const data = await upsertFxRate({
            baseCurrency: req.body.baseCurrency || req.body.base,
            quoteCurrency: req.body.quoteCurrency || req.body.quote,
            rate: req.body.rate,
            source: req.body.source || 'manual',
        });
        return res.json({ message: 'Rate saved', data, error: false, success: true });
    } catch (e) {
        return res.status(errStatus(e)).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/scale/fx/convert — converts amount between currencies.
export async function convertFxController(req, res) {
    try {
        const amount = Number(req.body.amount);
        const to = req.body.toCurrency || req.body.to;
        const from = req.body.fromCurrency || req.body.from;
        const data = from
            ? await convertAmount(amount, from, to)
            : await convertForDisplay(amount, to);
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(errStatus(e)).json({ message: e.message, error: true, success: false });
    }
}

// —— Loyalty ——
export async function loyaltyMeController(req, res) {
    try {
        const data = await getLoyaltyAccount(req.userId);
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/scale/loyalty/ledger — returns loyalty points ledger entries.
export async function loyaltyLedgerController(req, res) {
    try {
        const data = await listLoyaltyLedger(req.userId, { limit: Number(req.query.limit) || 50 });
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/scale/loyalty/redeem — redeems loyalty points for discount value.
export async function loyaltyRedeemController(req, res) {
    try {
        const data = await redeemPoints(req.userId, req.body.points, { orderId: req.body.orderId });
        return res.json({ message: 'Points redeemed', data, error: false, success: true });
    } catch (e) {
        return res.status(errStatus(e)).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/scale/loyalty/adjust — manually adjusts user loyalty balance.
export async function loyaltyAdjustController(req, res) {
    try {
        const userId = pickId(req.body.userId);
        const data = await adjustPoints(userId, req.body.delta, req.body.reason || 'adjust');
        return res.json({ message: 'Points adjusted', data, error: false, success: true });
    } catch (e) {
        return res.status(errStatus(e)).json({ message: e.message, error: true, success: false });
    }
}

// —— Recommendations ——
export async function relatedProductsController(req, res) {
    try {
        const data = await listRelated(req.params.productId, {
            limit: Number(req.query.limit) || 8,
        });
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/scale/recommendations/related — sets related product mappings.
export async function setRelatedController(req, res) {
    try {
        await setRelated(req.body.productId, req.body.relatedProductId, {
            rank: req.body.rank,
            source: 'manual',
        });
        return res.json({ message: 'Related product saved', error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// DELETE /api/scale/recommendations/related — removes related product mapping.
export async function removeRelatedController(req, res) {
    try {
        await removeRelated(req.body.productId, req.body.relatedProductId);
        return res.json({ message: 'Related product removed', error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// —— Reservations ——
export async function reserveStockController(req, res) {
    try {
        const data = await reserveStock({
            userId: req.userId,
            productId: req.body.productId,
            variantId: req.body.variantId,
            quantity: req.body.quantity,
            warehouseId: req.body.warehouseId,
            checkoutKey: req.body.checkoutKey,
            ttlMinutes: req.body.ttlMinutes,
        });
        return res.json({ message: 'Stock reserved', data, error: false, success: true });
    } catch (e) {
        return res.status(errStatus(e)).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/scale/reservations/release — releases reserved stock units.
export async function releaseReservationController(req, res) {
    try {
        const data = await releaseReservation(req.body.reservationId || req.body._id);
        return res.json({ message: 'Reservation released', data, error: false, success: true });
    } catch (e) {
        return res.status(errStatus(e)).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/scale/reservations/mine — lists current user's stock reservations.
export async function myReservationsController(req, res) {
    try {
        const data = await listReservationsForUser(req.userId);
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/scale/reservations/expire — expires stale stock reservations.
export async function expireReservationsController(_req, res) {
    try {
        const data = await expireStaleReservations();
        return res.json({ message: 'Expired stale reservations', data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// —— Seller payouts ——
export async function sellerBalanceController(req, res) {
    try {
        const sellerId = req.user?.role === 'Admin' && req.query.sellerId
            ? pickId(req.query.sellerId)
            : req.userId;
        const [balance, rate] = await Promise.all([
            getSellerBalance(sellerId),
            getCommissionRate(sellerId),
        ]);
        return res.json({
            data: { ...balance, commissionRatePercent: rate },
            error: false,
            success: true,
        });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/scale/seller/earnings — returns seller earnings breakdown.
export async function sellerEarningsController(req, res) {
    try {
        const sellerId = req.user?.role === 'Admin' && req.query.sellerId
            ? pickId(req.query.sellerId)
            : req.userId;
        const data = await listSellerEarnings(sellerId, { limit: Number(req.query.limit) || 50 });
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/scale/seller/payouts — lists seller payout requests/history.
export async function sellerPayoutsListController(req, res) {
    try {
        const sellerId = req.user?.role === 'Admin' && req.query.sellerId
            ? pickId(req.query.sellerId)
            : req.userId;
        const data = await listSellerPayouts(sellerId);
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/scale/seller/payouts — creates a seller payout request.
export async function sellerPayoutCreateController(req, res) {
    try {
        const sellerId =
            req.user?.role === 'Admin' && req.body.sellerId
                ? pickId(req.body.sellerId)
                : req.userId;
        const data = await createSellerPayout({
            sellerId,
            amount: req.body.amount,
            currency: req.body.currency,
            createdByUserId: req.userId,
            provider: req.body.provider || 'manual',
        });
        return res.json({ message: 'Payout recorded', data, error: false, success: true });
    } catch (e) {
        return res.status(errStatus(e)).json({ message: e.message, error: true, success: false });
    }
}

// —— Push ——
export async function registerDeviceController(req, res) {
    try {
        const data = await registerDeviceToken({
            userId: req.userId,
            token: req.body.token,
            platform: req.body.platform,
        });
        return res.json({ message: 'Device registered', data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// DELETE /api/scale/push/devices — unregisters push device token.
export async function unregisterDeviceController(req, res) {
    try {
        await unregisterDeviceToken(req.userId, req.body.token);
        return res.json({ message: 'Device removed', error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// GET /api/scale/push/devices — lists registered push devices for user.
export async function listDevicesController(req, res) {
    try {
        const data = await listDeviceTokens(req.userId);
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/scale/push/send — sends a push notification (staff only).
export async function sendPushController(req, res) {
    try {
        const userId = pickId(req.body.userId || req.userId);
        const data = await sendPushToUser(userId, {
            title: req.body.title,
            body: req.body.body,
            payload: req.body.payload,
        });
        return res.json({ message: 'Push processed', data, error: false, success: true });
    } catch (e) {
        return res.status(errStatus(e)).json({ message: e.message, error: true, success: false, code: e.code });
    }
}

