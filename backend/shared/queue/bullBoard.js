import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { getAllQueues } from './queues.js'
import { isQueueEnabled } from './connection.js'

// Build Bull Board Express router (mount with auth middleware in server.js).
export async function createBullBoardRouter(basePath = '/api/admin/queues') {
    if (!isQueueEnabled()) return null

    const queues = await getAllQueues()
    if (!queues.length) return null

    const serverAdapter = new ExpressAdapter()
    serverAdapter.setBasePath(basePath)

    createBullBoard({
        queues: queues.map((q) => new BullMQAdapter(q)),
        serverAdapter,
    })

    return serverAdapter.getRouter()
}
