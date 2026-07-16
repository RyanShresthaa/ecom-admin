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

const databaseUrl = rawDatabaseUrl.replace(/([?&])channel_binding=require&?/g, '$1').replace(/[?&]$/, '')

const usePostgres = Boolean(databaseUrl)
const sql = usePostgres ? neon(databaseUrl) : null

let state = null
let loadPromise = null
let schemaReady = false
let stateLoadedAt = 0
let normalizedOnce = false

// Local/dev: keep memory cache. 
const CACHE_TTL_MS = process.env.VERCEL ? 2_500 : Number.POSITIVE_INFINITY

// File-storage helper: ensures the local data directory exists.
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

// File-storage reader: loads JSON DB snapshot from disk.
function readFromFile() {
  ensureDataDir()
  if (!existsSync(DB_PATH)) return null
  return JSON.parse(readFileSync(DB_PATH, 'utf8'))
}

// File-storage writer: persists JSON DB snapshot to disk.
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
    normalizedOnce = true
    state = data
    stateLoadedAt = Date.now()
    await persist()
    return state
  }

  state = data
  // Only run normalize + rewrite once per process (it was rewriting Neon on many loads).
  if (!normalizedOnce) {
    normalizedOnce = true
    if (normalizeDb(state)) {
      await persist()
    }
  }
  stateLoadedAt = Date.now()
  return state
}

/**
 * Ensure the in-memory store is loaded.
 * Postgres used to reload on every request (very slow from Nepal → US East Neon).
 * Now we cache in-process; Vercel uses a short TTL for multi-instance freshness.
 */
export async function ensureDb({ force = false } = {}) {
  const cacheFresh = state && Date.now() - stateLoadedAt < CACHE_TTL_MS
  if (!force && cacheFresh) return state

  if (!loadPromise) {
    loadPromise = loadFromStore().finally(() => {
      loadPromise = null
    })
  }
  return loadPromise
}

/** @deprecated Use ensureDb() — kept for startup compatibility */
// Legacy alias used by older startup flows.
export function loadDb() {
  return ensureDb()
}

// Persistence API: saves current in-memory state to active storage backend.
export async function saveDb() {
  if (!state) await ensureDb()
  await persist()
  stateLoadedAt = Date.now()
}

// Read API: returns loaded in-memory DB state (throws if not initialized).
export function getDb() {
  if (!state) {
    throw new Error('Database not loaded. Call ensureDb() before getDb().')
  }
  return state
}

// Write API: runs a mutator and persists updated state.
export async function updateDb(mutator) {
  // On Vercel, refresh before write to reduce lost updates across isolates.
  await ensureDb({ force: Boolean(process.env.VERCEL) })
  mutator(state)
  await persist()
  stateLoadedAt = Date.now()
  return state
}

// ID helper: generates incremental prefixed identifiers.
export function nextId(db, key, prefix, pad = 5) {
  db.counters[key] = (db.counters[key] || 0) + 1
  return `${prefix}-${String(db.counters[key]).padStart(pad, '0')}`
}

// Storage mode helper: true when Postgres backend is enabled.
export function isUsingPostgres() {
  return usePostgres
}

// Complaint detector: checks whether an order already has complaint notes/events.
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

// Data normalization: injects synthetic complaint notes for legacy seeded orders.
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

// Data normalization: merges duplicate inventory rows into a single main-warehouse row.
function consolidateInventoryToOneRowPerProduct(db) {
  const byProduct = new Map()
  for (const item of db.inventory || []) {
    const list = byProduct.get(item.productId) || []
    list.push(item)
    byProduct.set(item.productId, list)
  }

  let changed = false
  const idRemap = new Map()
  const nextInventory = []
  const thresholdDefault = db.settings?.lowStockThreshold ?? 10

  for (const [, items] of byProduct) {
    if (items.length === 1) {
      const [only] = items
      if (only.warehouse !== 'Main Warehouse') {
        only.warehouse = 'Main Warehouse'
        changed = true
      }
      nextInventory.push(only)
      continue
    }

    changed = true
    const primary = items.find((item) => item.warehouse === 'Main Warehouse') || items[0]
    const total = items.reduce((sum, item) => sum + (item.stockQuantity || 0), 0)
    const threshold = primary.threshold ?? thresholdDefault
    primary.stockQuantity = total
    primary.warehouse = 'Main Warehouse'
    primary.threshold = threshold
    primary.lowStock = total <= threshold

    for (const item of items) {
      idRemap.set(item.id, primary.id)
    }
    nextInventory.push(primary)
  }

  if (!changed && idRemap.size === 0) return false

  db.inventory = nextInventory

  for (const movement of db.stockMovements || []) {
    if (idRemap.has(movement.inventoryId)) {
      movement.inventoryId = idRemap.get(movement.inventoryId)
      movement.warehouse = 'Main Warehouse'
    }
  }

  for (const po of db.purchaseOrders || []) {
    for (const item of po.items || []) {
      if (idRemap.has(item.inventoryId)) {
        item.inventoryId = idRemap.get(item.inventoryId)
        item.warehouse = 'Main Warehouse'
      }
    }
  }

  for (const product of db.products || []) {
    const inv = db.inventory.find((item) => item.productId === product.id)
    if (inv && product.stock !== inv.stockQuantity) {
      product.stock = inv.stockQuantity
    }
  }

  return true
}

// Global normalizer: applies one-time compatibility/data-cleanup migrations.
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

  if (consolidateInventoryToOneRowPerProduct(db)) changed = true

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
