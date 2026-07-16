import { logger } from '../../utils/logger.js'
import { JOB_NAMES } from '../constants.js'

// Image processing queue — post-upload optimization (Cloudinary transforms stub).
export async function processImageProcessingJob(job) {
    if (job.name === JOB_NAMES.IMAGE_PROCESS || job.name === JOB_NAMES.IMAGE_OPTIMIZE) {
        const { url, publicId, transforms } = job.data || {}
        logger.info('Image processing job', {
            url,
            publicId,
            transforms: transforms || 'auto',
        })
        // Future: Cloudinary eager transforms, resize, watermark, etc.
        return { processed: true, url, publicId }
    }
    throw new Error(`Unknown image job: ${job.name}`)
}
