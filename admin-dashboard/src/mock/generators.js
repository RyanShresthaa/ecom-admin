// Lightweight deterministic-ish fake data generator (no external dependency).
// Keeps the bundle small while still producing realistic-looking records.

const FIRST_NAMES = [
  'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'Lucas', 'Mia', 'Aiden', 'Amelia', 'Logan', 'Harper', 'Elijah',
  'Evelyn', 'James', 'Abigail', 'Benjamin', 'Ella', 'Henry', 'Scarlett', 'Sebastian',
]
const LAST_NAMES = [
  'Carter', 'Bennett', 'Hayes', 'Ramirez', 'Foster', 'Coleman', 'Brooks', 'Sanders',
  'Patel', 'Nguyen', 'Kim', 'Reed', 'Bishop', 'Hughes', 'Sullivan', 'Walsh',
  'Powell', 'Ortiz', 'Fisher', 'Wallace', 'Morales', 'Stone', 'Chen', 'Diaz',
]

let seed = 42
export function rand() {
  // simple mulberry32 PRNG for stable-ish output across renders during dev
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function randomInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min
}

export function pick(arr) {
  return arr[randomInt(0, arr.length - 1)]
}

export function randomName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
}

export function randomEmail(name) {
  const handle = name.toLowerCase().replace(' ', '.')
  return `${handle}@${pick(['mailbox.com', 'inboxhq.com', 'workmail.io', 'usermail.co'])}`
}

export function randomDateWithinDays(daysBack) {
  const now = Date.now()
  const past = now - randomInt(0, daysBack) * 24 * 60 * 60 * 1000
  return new Date(past).toISOString()
}

export function resetSeed(value = 42) {
  seed = value
}
