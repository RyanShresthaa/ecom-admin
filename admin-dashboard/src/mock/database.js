import { randomInt, randomName, randomEmail, randomDateWithinDays, pick, rand, resetSeed } from './generators'

resetSeed(7)

export const CATEGORIES = [
  'Apparel',
  'Footwear',
  'Electronics',
  'Home & Living',
  'Beauty',
  'Accessories',
  'Sports',
  'Toys',
]

const PRODUCT_NOUNS = {
  Apparel: ['Cotton Tee', 'Denim Jacket', 'Wool Sweater', 'Linen Shirt', 'Cargo Pants', 'Puffer Vest'],
  Footwear: ['Running Shoes', 'Leather Boots', 'Canvas Sneakers', 'Slide Sandals', 'Trail Runners'],
  Electronics: ['Wireless Earbuds', 'Smart Watch', 'Bluetooth Speaker', 'USB-C Hub', 'Power Bank', 'Webcam'],
  'Home & Living': ['Ceramic Mug', 'Throw Blanket', 'Table Lamp', 'Scented Candle', 'Storage Bin'],
  Beauty: ['Face Serum', 'Matte Lipstick', 'Hydrating Cream', 'Body Wash', 'SPF Sunscreen'],
  Accessories: ['Leather Wallet', 'Canvas Tote', 'Aviator Sunglasses', 'Wool Beanie', 'Silk Scarf'],
  Sports: ['Yoga Mat', 'Resistance Bands', 'Foam Roller', 'Water Bottle', 'Jump Rope'],
  Toys: ['Building Blocks', 'Plush Bear', 'RC Car', 'Puzzle Set', 'Board Game'],
}

const WAREHOUSES = ['North DC — Newark, NJ', 'West DC — Reno, NV', 'South DC — Dallas, TX', 'Central DC — Columbus, OH']

function makeSku(category, idx) {
  const prefix = category.slice(0, 3).toUpperCase()
  return `${prefix}-${String(idx).padStart(5, '0')}`
}

function generateProducts(count = 142) {
  const items = []
  for (let i = 1; i <= count; i++) {
    const category = pick(CATEGORIES)
    const noun = pick(PRODUCT_NOUNS[category])
    const stock = randomInt(0, 260)
    items.push({
      id: `PRD-${String(i).padStart(4, '0')}`,
      name: `${noun} ${pick(['Pro', 'Classic', 'Lite', 'Plus', 'Essential', 'Studio'])}`,
      category,
      price: Number((randomInt(900, 24000) / 100).toFixed(2)),
      stock,
      sku: makeSku(category, i),
      status: stock === 0 ? 'inactive' : pick(['active', 'active', 'active', 'inactive']),
      image: null,
      createdAt: randomDateWithinDays(220),
      rating: Number((3.2 + rand() * 1.8).toFixed(1)),
    })
  }
  return items
}

export const PRODUCTS = generateProducts()

function generateInventory(products) {
  return products.map((p, i) => {
    const threshold = pick([10, 15, 20, 25])
    return {
      id: `INV-${String(i + 1).padStart(4, '0')}`,
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      category: p.category,
      stockQuantity: p.stock,
      warehouse: pick(WAREHOUSES),
      threshold,
      lowStock: p.stock < threshold,
    }
  })
}

export const INVENTORY = generateInventory(PRODUCTS)

const PAYMENT_STATUSES = ['Paid', 'Unpaid', 'Refunded']
const DELIVERY_STATUSES = ['Pending', 'Shipped', 'Delivered', 'Returned']

function generateOrders(count = 220) {
  const orders = []
  for (let i = 1; i <= count; i++) {
    const customerName = randomName()
    const itemCount = randomInt(1, 5)
    const items = Array.from({ length: itemCount }).map(() => {
      const product = pick(PRODUCTS)
      const qty = randomInt(1, 3)
      return { productId: product.id, name: product.name, price: product.price, qty }
    })
    const totalAmount = Number(items.reduce((sum, it) => sum + it.price * it.qty, 0).toFixed(2))
    const deliveryStatus = pick(DELIVERY_STATUSES)
    const paymentStatus = deliveryStatus === 'Returned' ? 'Refunded' : pick(PAYMENT_STATUSES)

    orders.push({
      id: `ORD-${String(10234 + i)}`,
      customerName,
      customerEmail: randomEmail(customerName),
      date: randomDateWithinDays(120),
      items,
      totalAmount,
      paymentStatus,
      deliveryStatus,
      shippingAddress: `${randomInt(100, 9999)} ${pick(['Maple', 'Oak', 'Cedar', 'Birch', 'Pine'])} St, ${pick(
        ['Austin, TX', 'Denver, CO', 'Seattle, WA', 'Boston, MA', 'Phoenix, AZ']
      )}`,
    })
  }
  return orders.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export const ORDERS = generateOrders()

function generateUsers(count = 1840) {
  // Lightweight — only used to derive a "Total Users" KPI + growth trend.
  return count
}
export const TOTAL_USERS = generateUsers()

export let SETTINGS = {
  taxRules: [
    { id: 1, label: 'Standard Sales Tax', rate: 8.25, region: 'United States' },
    { id: 2, label: 'VAT', rate: 20, region: 'United Kingdom' },
    { id: 3, label: 'GST', rate: 5, region: 'Canada' },
  ],
  currency: 'USD',
  region: 'United States',
  timezone: 'America/New_York',
  storeName: 'Northwind Commerce',
  lowStockThreshold: 15,
}

export function setSettings(next) {
  SETTINGS = next
  return SETTINGS
}

export let PROFILE = {
  id: 'usr-001',
  name: 'Admin',
  email: 'admin@gmail.com',
  role: 'Store Administrator',
  phone: '+1 (555) 012-3456',
  bio: 'Managing day-to-day operations for Northwind Commerce.',
  avatar: null,
  createdAt: '2024-01-15T10:00:00Z',
}

export function setProfile(next) {
  PROFILE = next
  return PROFILE
}

export let NOTIFICATIONS = [
  {
    id: 'ntf-001',
    title: 'New order received',
    body: 'Order ORD-10235 from Maya Chen — $248.90',
    type: 'order',
    read: false,
    href: '/orders?q=ORD-10235',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'ntf-002',
    title: 'Low stock alert',
    body: 'Wireless Earbuds Pro is below threshold at North DC — Newark, NJ',
    type: 'inventory',
    read: false,
    href: '/inventory?q=Wireless',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'ntf-003',
    title: 'Payment refunded',
    body: 'Order ORD-10201 was marked as refunded',
    type: 'order',
    read: false,
    href: '/orders?q=ORD-10201',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ntf-004',
    title: 'Product updated',
    body: 'Cotton Tee Classic price was changed to $29.99',
    type: 'product',
    read: true,
    href: '/products?q=Cotton',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ntf-005',
    title: 'Weekly summary ready',
    body: 'Your store performance report for last week is available',
    type: 'system',
    read: true,
    href: '/',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
]

export function setNotifications(next) {
  NOTIFICATIONS = next
  return NOTIFICATIONS
}
