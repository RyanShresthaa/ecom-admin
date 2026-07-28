/**
 * Mock payment intent + verify; Stripe webhook finalizes pending checkouts.
 */
import { updateOrdersPayment } from '../models/order.model.js';
import { isMockPaymentAllowed, MOCK_PAYMENT_DISABLED_MSG } from '../config/payments.js';
import Stripe from '../config/stripe.js';
import { completePendingFromStripeSession } from './order.controller.js';
import { logger } from '../utils/logger.js';

export const createPaymentIntentController = async (req, res) => {
    try {
        if (!Stripe && !isMockPaymentAllowed()) {
            return res.status(503).json({
                message: MOCK_PAYMENT_DISABLED_MSG,
                error: true,
                success: false,
            });
        }
        const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const { amount = 0 } = req.body || {};
        return res.json({
            message: 'Payment intent created',
            data: { paymentId, amount, provider: Stripe ? 'stripe' : 'mock' },
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const verifyPaymentController = async (req, res) => {
    try {
        if (!Stripe && !isMockPaymentAllowed()) {
            return res.status(503).json({
                message: 'Payment verification requires a configured payment gateway.',
                error: true,
                success: false,
            });
        }
        const { orderIds = [], paymentId } = req.body || {};
        if (!orderIds?.length) {
            return res.status(400).json({
                message: 'orderIds array is required',
                error: true,
                success: false,
            });
        }
        await updateOrdersPayment(orderIds, paymentId || '', req.userId);
        return res.json({ message: 'Payment verified', error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** Stripe sends checkout.session.completed — finalize pending order. */
export const stripeWebhookController = async (req, res) => {
    try {
        if (!Stripe) {
            return res.status(503).json({ message: 'Stripe is not configured', error: true, success: false });
        }

        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        let event = req.body;

        if (secret) {
            const signature = req.headers['stripe-signature'];
            event = Stripe.webhooks.constructEvent(req.body, signature, secret);
        } else if (Buffer.isBuffer(req.body)) {
            event = JSON.parse(req.body.toString('utf8'));
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            try {
                await completePendingFromStripeSession(session);
            } catch (err) {
                logger.error('Stripe webhook finalize failed', {
                    error: err.message,
                    sessionId: session?.id,
                });
                if (err.status && err.status >= 500) {
                    return res.status(500).json({ received: false, message: err.message });
                }
            }
        }

        return res.json({ received: true });
    } catch (error) {
        logger.error('Stripe webhook error', { error: error.message });
        return res.status(400).json({ message: error.message || error, error: true, success: false });
    }
};
