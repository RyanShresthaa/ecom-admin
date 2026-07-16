import { sendEmailDirect } from '../../config/sendEmail.js'
import { logger } from '../../utils/logger.js'
import { JOB_NAMES } from '../constants.js'

// Email queue processor — sends SMTP mail from background worker.
export async function processEmailJob(job) {
    if (job.name === JOB_NAMES.EMAIL_SEND) {
        const { sendTo, subject, html, text } = job.data || {}
        await sendEmailDirect({ sendTo, subject, html, text })
        return { sent: true, to: sendTo }
    }
    throw new Error(`Unknown email job: ${job.name}`)
}
