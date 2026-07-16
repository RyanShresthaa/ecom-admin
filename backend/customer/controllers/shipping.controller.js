/**
 * Staff CRUD for shipping zones + rates (Phase 3).
 */
import {
    listShippingZones,
    findShippingZoneById,
    createShippingZone,
    updateShippingZone,
    deleteShippingZone,
    listRatesForZone,
    createShippingRate,
    updateShippingRate,
    deleteShippingRate,
} from '../../shared/models/shipping.model.js';
import { resolveShippingRate } from '../../shared/services/fulfillment/shippingRates.js';
import { pickId } from '../../shared/utils/sql.js';
import { logAudit } from '../../shared/models/audit.model.js';
import { getClientIp, getUserAgent } from '../../shared/utils/requestMeta.js';

// GET /api/shop/shipping/zones — lists shipping zones for admin.
export async function listZonesController(_req, res) {
    try {
        const zones = await listShippingZones();
        const data = await Promise.all(
            zones.map(async (z) => ({
                ...z,
                rates: await listRatesForZone(z.id),
            })),
        );
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/shop/shipping/zones — creates a new shipping zone.
export async function createZoneController(req, res) {
    try {
        const data = await createShippingZone(req.body);
        await logAudit({
            adminId: req.userId,
            action: 'shipping.zone_create',
            entityType: 'shipping_zone',
            entityId: data.id,
            details: req.body,
            ip: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return res.json({ message: 'Zone created', data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// PUT /api/shop/shipping/zones — updates existing shipping zone.
export async function updateZoneController(req, res) {
    try {
        const id = pickId(req.body._id || req.params.id);
        const data = await updateShippingZone(id, req.body);
        if (!data) {
            return res.status(404).json({ message: 'Zone not found', error: true, success: false });
        }
        return res.json({ message: 'Zone updated', data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// DELETE /api/shop/shipping/zones — deletes a shipping zone.
export async function deleteZoneController(req, res) {
    try {
        const id = pickId(req.body._id || req.params.id);
        await deleteShippingZone(id);
        return res.json({ message: 'Zone deleted', error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// POST /api/shop/shipping/rates — creates shipping rate for a zone.
export async function createRateController(req, res) {
    try {
        const zone = await findShippingZoneById(req.body.zoneId || req.body.zone_id);
        if (!zone) {
            return res.status(404).json({ message: 'Zone not found', error: true, success: false });
        }
        const data = await createShippingRate(req.body);
        return res.json({ message: 'Rate created', data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// PUT /api/shop/shipping/rates — updates shipping rate details.
export async function updateRateController(req, res) {
    try {
        const id = pickId(req.body._id || req.params.id);
        const data = await updateShippingRate(id, req.body);
        if (!data) {
            return res.status(404).json({ message: 'Rate not found', error: true, success: false });
        }
        return res.json({ message: 'Rate updated', data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

// DELETE /api/shop/shipping/rates — deletes shipping rate entry.
export async function deleteRateController(req, res) {
    try {
        const id = pickId(req.body._id || req.params.id);
        await deleteShippingRate(id);
        return res.json({ message: 'Rate deleted', error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

/** POST /api/shop/shipping/quote — preview fee for an address + subtotal */
// POST /api/shop/shipping/quote — calculates shipping quote for cart.
export async function quoteShippingController(req, res) {
    try {
        const subtotal = Number(req.body.subtotal ?? req.body.afterCoupon ?? 0);
        const address = {
            city: req.body.city,
            state: req.body.state,
            country: req.body.country || 'Nepal',
        };
        const data = await resolveShippingRate(address, subtotal);
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

