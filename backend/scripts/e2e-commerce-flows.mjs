/**
 * Full commerce flow smoke test against a running API.
 * Usage: node scripts/e2e-commerce-flows.mjs
 *
 * Resets known local test passwords for Admin + customer, then exercises:
 * products CRUD, cart, address, COD checkout, order invoice HTML,
 * order cancel (COD), purchase supplier/bill, sales invoice from order.
 */
import bcrypt from 'bcrypt';
import pool from '../config/connectDB.js';

const BASE = process.env.API_BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = 'ryanshr03@gmail.com';
const CUSTOMER_EMAIL = 'e2e-customer@test.local';
const PASSWORD = 'TestPass1';

const results = [];

function ok(name, detail = '') {
  results.push({ name, pass: true, detail });
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ name, pass: false, detail });
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}
function assert(name, cond, detail = '') {
  if (cond) ok(name, detail);
  else fail(name, detail);
}

function parseCookies(res) {
  const raw = res.headers.getSetCookie?.() || [];
  const jar = {};
  for (const c of raw) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    if (i > 0) jar[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return jar;
}

async function api(method, path, { token, csrf, cookie, json, headers: extra } = {}) {
  const headers = { ...(extra || {}) };
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (csrf) headers['X-CSRF-Token'] = csrf;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, cookies: parseCookies(res), res };
}

async function login(email, password) {
  const { status, body, cookies } = await api('POST', '/api/user/login', {
    json: { email, password },
  });
  if (status !== 200 || body?.success === false) {
    throw new Error(`Login failed for ${email}: ${status} ${body?.message || ''}`);
  }
  // Auth is cookie-only — JWTs must not appear in the JSON body
  if (body?.data?.accesstoken || body?.data?.accessToken || body?.data?.refreshToken) {
    throw new Error('Login leaked JWT in response body');
  }
  const access = cookies.accessToken;
  const csrf = body.data?.csrfToken || cookies.csrfToken;
  if (!access || !csrf) {
    throw new Error(`Login missing cookies for ${email}`);
  }
  return {
    token: access,
    csrf,
    cookie: `accessToken=${access}; refreshToken=${cookies.refreshToken || ''}; csrfToken=${csrf}`,
  };
}

async function ensureUsers() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  await pool.query(
    `UPDATE users SET password = $1, status = 'Active', verify_email = true WHERE email = $2`,
    [hash, ADMIN_EMAIL],
  );
  const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [CUSTOMER_EMAIL]);
  if (!existing.rows[0]) {
    await pool.query(
      `INSERT INTO users (name, email, password, role, status, verify_email)
       VALUES ($1, $2, $3, 'User', 'Active', true)`,
      ['E2E Customer', CUSTOMER_EMAIL, hash],
    );
  } else {
    await pool.query(
      `UPDATE users SET password = $1, status = 'Active', verify_email = true WHERE email = $2`,
      [hash, CUSTOMER_EMAIL],
    );
  }
}

async function main() {
  console.log(`\nE2E commerce flows @ ${BASE}\n`);

  const health = await api('GET', '/api/health');
  assert('health', health.status === 200 && health.body.ok === true, String(health.status));
  if (health.status !== 200) {
    console.error('Server not up — start backend with npm run dev');
    process.exit(1);
  }

  await ensureUsers();

  let admin;
  let customer;
  try {
    admin = await login(ADMIN_EMAIL, PASSWORD);
    ok('admin login');
  } catch (e) {
    fail('admin login', e.message);
    process.exit(1);
  }
  try {
    customer = await login(CUSTOMER_EMAIL, PASSWORD);
    ok('customer login');
  } catch (e) {
    fail('customer login', e.message);
    process.exit(1);
  }

  // ── Catalog public ──
  const catalog = await api('GET', '/api/product/get-product?limit=5');
  assert('list products (public)', catalog.status === 200 && catalog.body.success, catalog.body.message);
  const existingProductId = catalog.body.data?.[0]?.id ?? catalog.body.data?.[0]?._id;

  const cats = await api('GET', '/api/category/get-category');
  assert('list categories', cats.status === 200 && Array.isArray(cats.body.data), cats.body.message);
  const categoryId = cats.body.data?.find((c) => c.name === 'Gift Items')?.id || cats.body.data?.[0]?.id;

  const subs = await api('GET', '/api/subcategory/get-subcategory');
  assert('list subcategories', subs.status === 200, subs.body.message);
  const subcategoryId =
    subs.body.data?.find((s) => Number(s.category_id || s.categoryId) === Number(categoryId))?.id ||
    subs.body.data?.[0]?.id;

  // ── Product create / update / delete (admin) ──
  const stamp = Date.now();
  const createProd = await api('POST', '/api/product/add-product', {
    token: admin.token,
    json: {
      name: `E2E Test Product ${stamp}`,
      image: ['https://placehold.co/400x400/png'],
      category: [{ _id: categoryId, id: categoryId }],
      subcategory: [{ _id: subcategoryId, id: subcategoryId }],
      unit: 'pcs',
      stock: 25,
      price: 19.99,
      description: 'Automated E2E test product — safe to delete',
      publish: true,
    },
  });
  assert(
    'create product',
    createProd.status === 200 && createProd.body.success,
    createProd.body.message || String(createProd.status),
  );
  const productId = createProd.body.data?.id ?? createProd.body.data?._id;

  const getProd = await api('GET', `/api/product/get-product/${productId}`);
  assert('get product by id', getProd.status === 200 && getProd.body.data?.name?.includes('E2E'), getProd.body.message);

  const updateProd = await api('PUT', '/api/product/update-product', {
    token: admin.token,
    json: {
      _id: productId,
      id: productId,
      name: `E2E Test Product UPDATED ${stamp}`,
      price: 24.5,
      stock: 20,
    },
  });
  assert('update product', updateProd.status === 200 && updateProd.body.success, updateProd.body.message);

  // ── Cart ──
  const clearCartFirst = await api('GET', '/api/cart/get', { token: customer.token });
  const existingCart = clearCartFirst.body.data || [];
  for (const row of existingCart) {
    const cid = row.id ?? row._id;
    if (cid != null) {
      await api('DELETE', '/api/cart/delete', { token: customer.token, json: { _id: cid, id: cid } });
    }
  }

  const addCart = await api('POST', '/api/cart/add', {
    token: customer.token,
    json: { productId, quantity: 2 },
  });
  assert('add to cart', addCart.status === 200 && addCart.body.success !== false, addCart.body.message || String(addCart.status));

  const getCart = await api('GET', '/api/cart/get', { token: customer.token });
  const cartRows = getCart.body.data || [];
  assert('get cart', getCart.status === 200 && cartRows.length >= 1, `rows=${cartRows.length}`);

  const cartLineId = cartRows[0]?.id ?? cartRows[0]?._id;
  const updateCart = await api('PUT', '/api/cart/update', {
    token: customer.token,
    json: { _id: cartLineId, id: cartLineId, quantity: 1 },
  });
  assert('update cart qty', updateCart.status === 200 || updateCart.body.success, updateCart.body.message);

  // ── Address (USA) ──
  const addAddr = await api('POST', '/api/address/add', {
    token: customer.token,
    json: {
      address_line: '123 Market Street',
      city: 'San Francisco',
      state: 'CA',
      pincode: '94105',
      country: 'United States',
      mobile: '4155550199',
    },
  });
  assert('add USA address', addAddr.status === 200 && addAddr.body.success, addAddr.body.message);
  const addressId = addAddr.body.data?.id ?? addAddr.body.data?._id;

  // ── Preview + COD checkout ──
  const preview = await api('POST', '/api/order/preview-checkout', {
    token: customer.token,
    json: {
      addressId,
      useCart: false,
      list_items: [{ productId, quantity: 1 }],
    },
  });
  assert('preview checkout', preview.status === 200 && preview.body.success !== false, preview.body.message || String(preview.status));

  const placeCod = await api('POST', '/api/order/place-cod', {
    token: customer.token,
    headers: { 'Idempotency-Key': `e2e-cod-${stamp}` },
    json: {
      addressId,
      useCart: false,
      list_items: [{ productId, quantity: 1 }],
    },
  });
  assert('place COD order', placeCod.status === 200 && placeCod.body.success, placeCod.body.message || String(placeCod.status));
  const orderLine = placeCod.body.data?.[0];
  const orderLineId = orderLine?.id ?? orderLine?._id;
  const orderGroupId = orderLine?.orderId || orderLine?.order_id;

  // ── Customer invoice HTML ──
  if (orderLineId) {
    const inv = await api('GET', `/api/order/invoice/${orderLineId}`, { token: customer.token });
    assert(
      'order invoice HTML',
      inv.status === 200 && (inv.body.data?.html != null || typeof inv.body.data === 'string'),
      inv.body.message || String(inv.status),
    );
  } else {
    fail('order invoice HTML', 'no order line id');
  }

  // ── Admin list orders + cancel COD ──
  const allOrders = await api('GET', '/api/order/all', { token: admin.token });
  assert('admin list orders', allOrders.status === 200 && allOrders.body.success, allOrders.body.message);

  if (orderLineId) {
    const cancel = await api('PUT', '/api/order/update-status', {
      token: admin.token,
      json: { _id: orderLineId, delivery_status: 'cancelled' },
    });
    assert(
      'cancel COD order',
      cancel.status === 200 && cancel.body.success,
      cancel.body.message || String(cancel.status),
    );
    const payStatus = String(cancel.body.data?.payment_status || cancel.body.message || '');
    assert(
      'COD cancel sets payment CANCELLED (or message)',
      /cancel/i.test(payStatus) || /Order cancelled/i.test(cancel.body.message || ''),
      payStatus,
    );
  }

  // ── Second COD for sales invoice (leave pending) ──
  const placeCod2 = await api('POST', '/api/order/place-cod', {
    token: customer.token,
    headers: { 'Idempotency-Key': `e2e-cod2-${stamp}` },
    json: {
      addressId,
      useCart: false,
      list_items: [{ productId, quantity: 1 }],
    },
  });
  assert('place second COD', placeCod2.status === 200 && placeCod2.body.success, placeCod2.body.message);
  const order2Group = placeCod2.body.data?.[0]?.orderId || placeCod2.body.data?.[0]?.order_id;
  const order2LineId = placeCod2.body.data?.[0]?.id ?? placeCod2.body.data?.[0]?._id;

  // Sales formal invoice from order group
  if (order2Group) {
    const salesInv = await api('POST', `/api/sales/invoices/from-order/${order2Group}`, {
      token: admin.token,
      json: {},
    });
    assert(
      'sales invoice from order',
      salesInv.status === 200 || salesInv.status === 201,
      salesInv.body.message || String(salesInv.status),
    );
    const salesInvId = salesInv.body.data?.id ?? salesInv.body.data?._id;
    if (salesInvId) {
      const getSales = await api('GET', `/api/sales/invoices/${salesInvId}`, { token: admin.token });
      assert('get sales invoice', getSales.status === 200, getSales.body.message);
      const issue = await api('POST', `/api/sales/invoices/${salesInvId}/issue`, {
        token: admin.token,
        json: {},
      });
      assert(
        'issue sales invoice',
        issue.status === 200 || issue.body.success,
        issue.body.message || String(issue.status),
      );
    }
  } else {
    fail('sales invoice from order', 'no order group');
  }

  // ── Purchase supplier + bill ──
  const supplier = await api('POST', '/api/purchases/suppliers', {
    token: admin.token,
    json: {
      name: `E2E Supplier ${stamp}`,
      vatPan: '123456789',
      address: 'Test Warehouse',
      email: 'supplier-e2e@test.local',
    },
  });
  assert('create supplier', supplier.status === 200 || supplier.status === 201, supplier.body.message || String(supplier.status));
  const supplierId = supplier.body.data?.id ?? supplier.body.data?._id;

  let billId = null;
  if (supplierId) {
    const bill = await api('POST', '/api/purchases/bills', {
      token: admin.token,
      json: {
        supplierId,
        billDate: new Date().toISOString().slice(0, 10),
        currency: 'USD',
        notes: 'E2E bill',
      },
    });
    assert('create purchase bill', bill.status === 200 || bill.status === 201, bill.body.message || String(bill.status));
    billId = bill.body.data?.id ?? bill.body.data?._id;

    if (billId) {
      const patch = await api('PATCH', `/api/purchases/bills/${billId}`, {
        token: admin.token,
        json: {
          lines: [
            {
              productId,
              description: 'E2E restock',
              quantity: 3,
              unitPriceExclVat: 10,
              vatRate: 0,
            },
          ],
        },
      });
      assert('patch bill lines', patch.status === 200 && patch.body.success !== false, patch.body.message);

      const previewBill = await api('GET', `/api/purchases/bills/${billId}/preview`, { token: admin.token });
      assert('purchase bill preview', previewBill.status === 200, previewBill.body.message);

      const receive = await api('POST', `/api/purchases/bills/${billId}/receive`, {
        token: admin.token,
        json: {},
      });
      assert('receive purchase bill', receive.status === 200 || receive.body.success, receive.body.message || String(receive.status));

      const pay = await api('POST', `/api/purchases/bills/${billId}/payments`, {
        token: admin.token,
        json: { amount: 30, method: 'cash', reference: `E2E-${stamp}` },
      });
      assert('purchase bill payment', pay.status === 200 || pay.body.success, pay.body.message || String(pay.status));
    }
  }

  // ── Online pay without Stripe should 503 ──
  const online = await api('POST', '/api/order/place-online', {
    token: customer.token,
    headers: { 'Idempotency-Key': `e2e-online-${stamp}` },
    json: {
      addressId,
      useCart: false,
      list_items: [{ productId: existingProductId || productId, quantity: 1 }],
    },
  });
  assert(
    'online without Stripe → 503 (not fake PAID)',
    online.status === 503,
    `got ${online.status}: ${online.body.message || ''}`,
  );

  // ── Wishlist ──
  const wish = await api('POST', '/api/wishlist/add', {
    token: customer.token,
    json: { productId },
  });
  assert('wishlist add', wish.status === 200 || wish.body.success, wish.body.message || String(wish.status));
  const wishList = await api('GET', '/api/wishlist/', { token: customer.token });
  assert('wishlist get', wishList.status === 200, wishList.body.message);

  // ── Delete product (after flows) ──
  const delProd = await api('DELETE', '/api/product/delete-product', {
    token: admin.token,
    json: { _id: productId, id: productId },
  });
  assert(
    'delete product',
    delProd.status === 200 && delProd.body.success !== false,
    delProd.body.message || String(delProd.status),
  );

  const afterDel = await api('GET', `/api/product/get-product/${productId}`);
  if (delProd.body.data?.soft) {
    assert(
      'product soft-deleted (unpublished)',
      afterDel.status === 200 && afterDel.body.data?.publish === false,
      String(afterDel.status),
    );
  } else {
    assert('product gone after delete', afterDel.status === 404 || !afterDel.body.data, String(afterDel.status));
  }

  // ── Admin stats ──
  const stats = await api('GET', '/api/admin/stats', { token: admin.token });
  assert('admin dashboard stats', stats.status === 200 && stats.body.success !== false, stats.body.message);

  // Cleanup cart leftovers
  const cartEnd = await api('GET', '/api/cart/get', { token: customer.token });
  for (const row of cartEnd.body.data || []) {
    const cid = row.id ?? row._id;
    if (cid != null) await api('DELETE', '/api/cart/delete', { token: customer.token, json: { _id: cid } });
  }

  await pool.end();

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n——— ${passed} passed, ${failed} failed ———\n`);
  if (failed) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
