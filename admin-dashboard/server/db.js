import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createSeedData } from './seed.js'
import { isComplaintText } from './utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DB_PATH = join(DATA_DIR, 'store.json')

let state = null

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

export function loadDb() {
  if (state) return state
  ensureDataDir()
  if (existsSync(DB_PATH)) {
    state = JSON.parse(readFileSync(DB_PATH, 'utf8'))
    if (normalizeDb(state)) saveDb()
    return state
  }
  state = createSeedData()
  normalizeDb(state)
  saveDb()
  return state
}

export function saveDb() {
  ensureDataDir()
  writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf8')
}

export function getDb() {
  return loadDb()
}

export function updateDb(mutator) {
  const db = loadDb()
  mutator(db)
  saveDb()
  return db
}

export function nextId(db, key, prefix, pad = 5) {
  db.counters[key] = (db.counters[key] || 0) + 1
  return `${prefix}-${String(db.counters[key]).padStart(pad, '0')}`
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
