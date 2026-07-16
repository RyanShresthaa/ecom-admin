/**
 * Manual / offline refund provider (Phase 1).
 * Records the refund in our ledger without calling any payment gateway.
 * Use for cash / COD and for card orders until Stripe refunds are wired.
 */
import { REFUND_PROVIDER, REFUND_STATUS } from '../constants.js';

/**
 * @param {{ amount: number, currency?: string, reason?: string, paymentId?: string }} input
 * @returns {Promise<{ provider: string, providerRefundId: string|null, status: string }>}
 */
export async function createManualRefund(input) {
    // Return completed refund metadata without contacting external gateways.
    return {
        provider: REFUND_PROVIDER.MANUAL,
        // No external id — staff confirmed offline / cash return.
        providerRefundId: null,
        status: REFUND_STATUS.COMPLETED,
        amount: Number(input.amount),
        currency: input.currency || 'NPR',
        reason: input.reason || '',
    };
}
