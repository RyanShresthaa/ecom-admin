/**
 * Apply tracking / carrier to every line in an order group.
 */
import { pickId } from '../../utils/sql.js';
import {
    findOrdersByOrderGroupId,
    findOrderById,
    updateOrderFulfillment,
} from '../../models/order.model.js';

/**
 * @param {{ orderGroupId?: string, orderRowId?: number, trackingNumber?: string, carrier?: string }} opts
 */
export async function applyTracking(opts) {
    // Load target order line(s) by group or individual row id.
    let lines = [];
    if (opts.orderGroupId) {
        lines = await findOrdersByOrderGroupId(String(opts.orderGroupId));
    } else if (opts.orderRowId) {
        const one = await findOrderById(pickId(opts.orderRowId));
        if (one) {
            lines = one.orderId
                ? await findOrdersByOrderGroupId(one.orderId)
                : [one];
        }
    }
    if (!lines.length) {
        const err = new Error('Order not found');
        err.status = 404;
        throw err;
    }

    // Build fulfillment patch for tracking number and carrier updates.
    const patch = {
        tracking_number:
            opts.trackingNumber !== undefined
                ? String(opts.trackingNumber || '').trim() || null
                : undefined,
        carrier:
            opts.carrier !== undefined ? String(opts.carrier || '').trim() || null : undefined,
    };

    // Apply same tracking patch to every line in the order group.
    const updated = [];
    for (const line of lines) {
        updated.push(await updateOrderFulfillment(pickId(line.id), patch));
    }
    return updated;
}
