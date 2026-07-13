import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { neon } from '@neondatabase/serverless'

import { createSeedData } from './seed.js'
import { isComplaintText } from './utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.VERCEL ? join('/tmp', 'matina-crafts-data') : join(__dirname, 'data')
const DB_PATH = join(DATA_DIR, 'store.json')
const STORE_ID = 'main'

const rawDatabaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  ''

// Some Neon URLs include channel_binding=require which can break serverless drivers.
const databaseUrl = rawDatabaseUrl.replace(/([?&])channel_binding=require&?/g, '$1').replace(/[?&]$/, '')

const usePostgres = Boolean(databaseUrl)
const sql = usePostgres ? neon(databaseUrl) : null

let state = null
let loadPromise = null
let schemaReady = false

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

async function ensurePostgresSchema() {
  if (!usePostgres || schemaReady) return
  await sql`
    CREATE TABLE IF NOT EXISTS app_store (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  schemaReady = true
}

async function readFromPostgres() {
  await ensurePostgresSchema()
  const rows = await sql`SELECT data FROM app_store WHERE id = ${STORE_ID} LIMIT 1`
  if (rows.length === 0) return null
  return rows[0].data
}

async function writeToPostgres(data) {
  await ensurePostgresSchema()
  // Neon serializes plain objects to JSONB automatically.
  await sql`
    INSERT INTO app_store (id, data, updated_at)
    VALUES (${STORE_ID}, ${data}, NOW())
    ON CONFLICT (id) DO UPDATE
    SET data = EXCLUDED.data,
        updated_at = NOW()
  `
}

function readFromFile() {
  ensureDataDir()
  if (!existsSync(DB_PATH)) return null
  return JSON.parse(readFileSync(DB_PATH, 'utf8'))
}

function writeToFile(data) {
  ensureDataDir()
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8')
}

async function persist() {
  if (!state) return
  if (usePostgres) {
    await writeToPostgres(state)
    return
  }
  writeToFile(state)
}

async function loadFromStore() {
  let data = usePostgres ? await readFromPostgres() : readFromFile()

  if (!data) {
    data = createSeedData()
    normalizeDb(data)
    state = data
    await persist()
    return state
  }

  state = data
  if (normalizeDb(state)) {
    await persist()
  }
  return state
}

/**
 * Ensure the in-memory store is loaded.
 * With Postgres (Vercel), reload each call so serverless instances stay consistent.
 * With local file storage, keep the process-local cache.
 */
export async function ensureDb() {
  if (usePostgres) {
    state = await loadFromStore()
    return state
  }

  if (state) return state
  if (!loadPromise) {
    loadPromise = loadFromStore().finally(() => {
      loadPromise = null
    })
  }
  return loadPromise
}

/** @deprecated Use ensureDb() — kept for startup compatibility */
export function loadDb() {
  return ensureDb()
}

export async function saveDb() {
  if (!state) await ensureDb()
  await persist()
}

export function getDb() {
  if (!state) {
    throw new Error('Database not loaded. Call ensureDb() before getDb().')
  }
  return state
}

export async function updateDb(mutator) {
  // Reload first when using Postgres so we don't overwrite another instance's writes blindly.
  await ensureDb()
  mutator(state)
  await persist()
  return state
}

export function nextId(db, key, prefix, pad = 5) {
  db.counters[key] = (db.counters[key] || 0) + 1
  return `${prefix}-${String(db.counters[key]).padStart(pad, '0')}`
}

export function isUsingPostgres() {
  return usePostgres
}

function orderHasComplaintNote(order) {
  const sources = [
    ...(order.internalNotes || []),
    ...(order.statusHistory || []).filter((event) => event.type === 'note'),
  ]
  return sources.some((source) => isComplaintText(source.text || source.message))
}

const BACKFILL_COMPLAINT_TEXTS = [
  'Customer complaint: item arrived damaged.',
  'Complaint about wrong size received.',
  'Product quality issue reported by customer.',
  'Customer complained item was not as described.',
]

function backfillOrderComplaints(db) {
  let changed = false
  for (const order of db.orders || []) {
    if (orderHasComplaintNote(order)) continue
    const suffix = Number.parseInt(String(order.id).split('-').pop(), 10)
    if (!Number.isFinite(suffix) || suffix % 10 !== 0) continue

    const complaintText = BACKFILL_COMPLAINT_TEXTS[suffix % BACKFILL_COMPLAINT_TEXTS.length]
    order.internalNotes = order.internalNotes || []
    order.statusHistory = order.statusHistory || []
    order.internalNotes.push({
      id: `note-${order.id}-complaint`,
      text: complaintText,
      author: order.customerName,
      createdAt: order.date,
    })
    order.statusHistory.push({
      id: `hist-${order.id}-complaint`,
      type: 'note',
      message: complaintText,
      timestamp: order.date,
      author: order.customerName,
    })
    changed = true
  }
  return changed
}

function normalizeDb(db) {
  let changed = false
  const emailMap = {
    'admin@orbit.com': 'admin@matinacrafts.com',
    'editor@orbit.com': 'editor@matinacrafts.com',
    'viewer@orbit.com': 'viewer@matinacrafts.com',
  }

  for (const user of db.users || []) {
    if (emailMap[user.email]) {
      user.email = emailMap[user.email]
      changed = true
    }
  }

  if (db.settings?.storeName === 'Northwind Commerce') {
    db.settings.storeName = 'Matina Crafts'
    changed = true
  }

  for (const product of db.products || []) {
    if (!product.createdAt) {
      product.createdAt = new Date().toISOString()
      changed = true
    }

    const inventoryTotal = (db.inventory || [])
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + item.stockQuantity, 0)

    if (inventoryTotal > 0 && product.stock !== inventoryTotal) {
      product.stock = inventoryTotal
      changed = true
    }
  }

  if (backfillOrderComplaints(db)) changed = true

  return changed
}
