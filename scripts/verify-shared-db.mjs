/**
 * Prove staff writes on shared backend are visible to customer (public) reads.
 *
 * Prerequisites: npm run db:migrate && npm run dev:api
 * Staff seed: cd backend && node scripts/seed-verify-staff.mjs
 *
 *   npm run verify:shared-db
 */
const API = (process.env.VERIFY_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
const email = process.env.VERIFY_STAFF_EMAIL || 'staff.verify@matinacrafts.com'
const password = process.env.VERIFY_STAFF_PASSWORD || 'StaffVerify123!'
const img = 'https://placehold.co/400x400/png'

async function req(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${data.message || res.statusText}`)
  return data
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function pid(p) {
  return p?.id ?? p?._id
}

async function ensureProduct(token) {
  let list = await req('/product/get-product?page=1&limit=1', { token })
  if (list.data?.[0]) return list.data[0]

  let cats = await req('/category/get-category')
  let cat = cats.data?.[0]
  if (!cat) {
    const created = await req('/category/add-category', {
      method: 'POST',
      token,
      body: { name: 'Verify Cat', image: img },
    })
    cat = created.data
  }
  const catId = pid(cat)

  let subs = await req('/subcategory/get-subcategory')
  let sub = (subs.data || []).find((s) => {
    const ids = (s.category || []).map((c) => pid(c) ?? c)
    return ids.map(String).includes(String(catId))
  })
  if (!sub) {
    const created = await req('/subcategory/add-subcategory', {
      method: 'POST',
      token,
      body: { name: 'Verify Sub', image: img, category: [catId] },
    })
    sub = created.data
  }

  const created = await req('/product/create', {
    method: 'POST',
    token,
    body: {
      name: `Verify Product ${Date.now()}`,
      image: [img],
      category: [catId],
      subcategory: [pid(sub)],
      unit: 'pc',
      price: 9.99,
      description: 'Shared DB verification product',
      publish: true,
    },
  })
  return created.data
}

async function main() {
  console.log('API', API)

  const health = await req('/health')
  assert(health.ok || health.status === 'ready', 'API/DB not ready')
  console.log('✓ health', health.database)

  const login = await req('/user/login', { method: 'POST', body: { email, password } })
  const token = login.data?.accesstoken
  assert(token, 'No accesstoken — run: cd backend && node scripts/seed-verify-staff.mjs')

  const me = await req('/user/user-details', { token })
  const role = me.data?.role || me.role
  assert(role === 'Admin' || role === 'Seller', `Need Admin/Seller, got ${role}`)
  console.log('✓ staff login', role)

  const product = await ensureProduct(token)
  const id = pid(product)
  assert(id, 'Failed to ensure a product')
  console.log('✓ product ready', id)

  await req('/product/update-product', {
    method: 'PUT',
    token,
    body: { _id: id, publish: true },
  })
  let pub = await req('/product/get-product?page=1&limit=200&published=true')
  assert(
    (pub.data || []).some((p) => String(pid(p)) === String(id)),
    'Customer published list missing staff product'
  )
  console.log('✓ customer sees published product')

  await req('/product/update-product', {
    method: 'PUT',
    token,
    body: { _id: id, publish: false },
  })
  const detail = await req(`/product/get-product/${id}`)
  assert(detail.data?.publish === false, 'publish=false did not persist')

  pub = await req('/product/get-product?page=1&limit=200&published=true')
  assert(
    !(pub.data || []).some((p) => String(pid(p)) === String(id)),
    'Unpublished product still visible to customers'
  )
  console.log('✓ staff unpublish hides product from customers')

  await req('/product/update-product', {
    method: 'PUT',
    token,
    body: { _id: id, publish: true },
  })

  console.log('DONE — admin/staff changes on backend affect customer catalog (same DB)')
}

main().catch((err) => {
  console.error('FAIL', err.message)
  process.exit(1)
})
