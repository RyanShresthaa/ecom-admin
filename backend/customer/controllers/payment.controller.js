/**
 * Mock payment intent + verify; production may 503 without real gateway (see `config/payments.js`).
 */
import { updateOrdersPayment } from '../../shared/models/order.model.js';
import { isMockPaymentAllowed, MOCK_PAYMENT_DISABLED_MSG } from '../../shared/config/payments.js';
import Stripe from '../../shared/config/stripe.js';

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
