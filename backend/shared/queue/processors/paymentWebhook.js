import Stripe from '../../config/stripe.js'
import { updateOrdersPayment } from '../../models/order.model.js'
import { logger } from '../../utils/logger.js'
import { JOB_NAMES } from '../constants.js'

// Payment webhook processor — verifies and applies gateway events.
export async function processPaymentWebhookJob(job) {
    if (job.name !== JOB_NAMES.PAYMENT_WEBHOOK_EVENT) {
        throw new Error(`Unknown payment webhook job: ${job.name}`)
    }

    const { provider, rawBody, signature, event: prebuiltEvent } = job.data || {}

    let event = prebuiltEvent
    if (!event && provider === 'stripe' && Stripe) {
        const secret = process.env.STRIPE_WEBHOOK_SECRET
        if (!secret) {
            logger.warn('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set')
            return { skipped: true, reason: 'no_webhook_secret' }
        }
        event = Stripe.webhooks.constructEvent(
            rawBody,
            signature,
            secret,
        )
    }

    if (!event) {
        return { skipped: true, reason: 'no_event' }
    }

    const type = event.type
    logger.info('Processing payment webhook', { type, id: event.id })

    switch (type) {
        case 'checkout.session.completed': {
            const session = event.data?.object
            const paymentId = String(session?.payment_intent || session?.id || '')
            const orderIds = session?.metadata?.orderIds
                ? JSON.parse(session.metadata.orderIds)
                : []
            if (orderIds.length && paymentId) {
                await updateOrdersPayment(orderIds, paymentId, session.metadata?.userId)
            }
            return { handled: type, paymentId }
        }
        case 'payment_intent.succeeded': {
            const intent = event.data?.object
            return { handled: type, paymentId: intent?.id }
        }
        case 'charge.refunded': {
            const charge = event.data?.object
            return { handled: type, chargeId: charge?.id }
        }
        default:
            logger.info('Unhandled webhook event type', { type })
            return { handled: false, type }
    }
}
