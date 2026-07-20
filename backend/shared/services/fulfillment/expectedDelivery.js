/**
 * Admin sets expected delivery date/time after an order is Confirmed.
 * Applied to every line in the order group.
 */
import { pickId } from '../../utils/sql.js';
import {
    findOrdersByOrderGroupId,
    findOrderById,
    updateOrderFulfillment,
} from '../../models/order.model.js';
import { DELIVERY_STATUS } from './constants.js';
import { normalizeDeliveryStatus } from './statusTransitions.js';

const SCHEDULABLE = new Set([
    DELIVERY_STATUS.CONFIRMED,
    DELIVERY_STATUS.PROCESSING,
    DELIVERY_STATUS.PACKED,
    DELIVERY_STATUS.SHIPPED,
    DELIVERY_STATUS.OUT_FOR_DELIVERY,
]);

function assertCanSchedule(status) {
    const n = normalizeDeliveryStatus(status) || DELIVERY_STATUS.PENDING;
    if (!SCHEDULABLE.has(n)) {
        const err = new Error(
            `Expected delivery can only be set after the order is Confirmed. Current status: "${n}".`,
        );
        err.status = 400;
        throw err;
    }
}

function parseExpectedAt(raw) {
    if (raw == null || raw === '') {
        return null;
    }
    const when = new Date(raw);
    if (Number.isNaN(when.getTime())) {
        const err = new Error('Invalid expectedDeliveryAt datetime');
        err.status = 400;
        throw err;
    }
    return when.toISOString();
}

/**
 * @param {{ orderGroupId?: string, orderRowId?: number|string, expectedDeliveryAt?: string|null }} opts
 */
export async function applyExpectedDelivery(opts) {
    let lines = [];
    if (opts.orderGroupId) {
        lines = await findOrdersByOrderGroupId(String(opts.orderGroupId));
    } else if (opts.orderRowId) {
        const one = await findOrderById(pickId(opts.orderRowId));
        if (one) {
            lines = one.orderId ? await findOrdersByOrderGroupId(one.orderId) : [one];
        }
    }
    if (!lines.length) {
        const err = new Error('Order not found');
        err.status = 404;
        throw err;
    }

    const status = lines[0].delivery_status || lines[0].deliveryStatus;
    assertCanSchedule(status);

    const expectedAt = parseExpectedAt(opts.expectedDeliveryAt);
    const updated = [];
    for (const line of lines) {
        updated.push(
            await updateOrderFulfillment(pickId(line.id), {
                expected_delivery_at: expectedAt,
            }),
        );
    }
    return updated;
}
