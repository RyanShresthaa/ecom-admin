import { bustCacheSync } from '../../utils/responseCache.js'
import { JOB_NAMES } from '../constants.js'

// Cache invalidation processor — busts Redis/memory response cache by prefix.
export async function processCacheInvalidationJob(job) {
    if (job.name !== JOB_NAMES.CACHE_BUST) {
        throw new Error(`Unknown cache job: ${job.name}`)
    }
    const { prefix = '' } = job.data || {}
    await bustCacheSync(prefix)
    return { busted: prefix || '*' }
}
