import { buildInvoicePayload, invoiceToHtml } from '../../utils/invoice.js'
import { logger } from '../../utils/logger.js'
import { queueEmail } from '../enqueue.js'
import { JOB_NAMES } from '../constants.js'

// Invoice queue processor — builds invoice JSON/HTML and optionally emails customer.
export async function processInvoiceJob(job) {
    if (job.name !== JOB_NAMES.INVOICE_GENERATE) {
        throw new Error(`Unknown invoice job: ${job.name}`)
    }

    const { orderId, user, address, summary, paymentStatus, createdAt, emailTo } = job.data || {}
    const invoice = buildInvoicePayload({
        orderId,
        user,
        address,
        summary,
        paymentStatus,
        createdAt,
    })
    const html = invoiceToHtml(invoice)

    if (emailTo) {
        await queueEmail({
            sendTo: emailTo,
            subject: `Invoice ${orderId}`,
            html,
        })
    }

    logger.info('Invoice generated', { orderId })
    return { orderId, htmlLength: html.length }
}
