const CATEGORIES = [
  'Apparel',
  'Footwear',
  'Electronics',
  'Home & Living',
  'Beauty',
  'Accessories',
  'Sports',
  'Toys',
]

const WAREHOUSES = ['Main Warehouse', 'East Coast DC', 'West Coast DC']

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Blake', 'Cameron']
const LAST_NAMES = ['Morgan', 'Chen', 'Rivera', 'Patel', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson']

const PRODUCT_NAMES = {
  Apparel: ['Cotton Tee', 'Denim Jacket', 'Wool Sweater', 'Linen Shirt', 'Cargo Pants'],
  Footwear: ['Running Shoes', 'Leather Boots', 'Canvas Sneakers', 'Trail Runners'],
  Electronics: ['Wireless Earbuds', 'Smart Watch', 'Bluetooth Speaker', 'USB-C Hub', 'Power Bank'],
  'Home & Living': ['Ceramic Mug', 'Throw Blanket', 'Table Lamp', 'Scented Candle'],
  Beauty: ['Face Serum', 'Matte Lipstick', 'Hydrating Moisturizer'],
  Accessories: ['Leather Belt', 'Canvas Tote', 'Sunglasses'],
  Sports: ['Yoga Mat', 'Resistance Bands', 'Water Bottle'],
  Toys: ['Building Blocks', 'Plush Bear', 'Puzzle Set'],
}

const ADJUSTMENT_REASONS = [
  { code: 'received', label: 'Stock received', type: 'in' },
  { code: 'returned', label: 'Customer return', type: 'in' },
  { code: 'correction', label: 'Inventory correction', type: 'either' },
  { code: 'transfer', label: 'Warehouse transfer', type: 'either' },
  { code: 'damaged', label: 'Damaged / write-off', type: 'out' },
  { code: 'sold', label: 'Manual sale', type: 'out' },
  { code: 'other', label: 'Other', type: 'either' },
]

const DEFAULT_SETTINGS = {
  taxRules: [
    { id: 1, label: 'Standard Sales Tax', rate: 8.25, region: 'United States' },
    { id: 2, label: 'VAT', rate: 20, region: 'United Kingdom' },
    { id: 3, label: 'GST', rate: 5, region: 'Canada' },
  ],
  currency: 'USD',
  region: 'United States',
  timezone: 'America/New_York',
  storeName: 'Matina Crafts',
  lowStockThreshold: 15,
}

let seed = 7
// Deterministic pseudo-random generator for repeatable seed data.
function rand() {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
// Seed helper: picks one random entry from an array.
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)]
}
// Seed helper: random integer in inclusive range.
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min
}
// Seed helper: returns ISO datetime offset by N days.
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(randInt(8, 20), randInt(0, 59), 0, 0)
  return d.toISOString()
}

// Seed factory: generates complete mock dataset for local file/postgres bootstrap.
export function createSeedData() {
  const users = [
    {
      id: 1,
      name: 'Alex Morgan',
      email: 'admin@matinacrafts.com',
      password: 'admin123',
      role: 'admin',
      avatarColor: '#6366f1',
      title: 'Store Administrator',
      joinedAt: '2024-01-15T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Jamie Chen',
      email: 'editor@matinacrafts.com',
      password: 'editor123',
      role: 'editor',
      avatarColor: '#0ea5e9',
      title: 'Merchandising Editor',
      joinedAt: '2024-03-02T00:00:00.000Z',
    },
    {
      id: 3,
      name: 'Sam Rivera',
      email: 'viewer@matinacrafts.com',
      password: 'viewer123',
      role: 'viewer',
      avatarColor: '#10b981',
      title: 'Operations Analyst',
      joinedAt: '2024-05-20T00:00:00.000Z',
    },
  ]

  const products = []
  let productCounter = 0
  for (const category of CATEGORIES) {
    const nouns = PRODUCT_NAMES[category] || ['Item']
    for (const noun of nouns) {
      productCounter++
      const id = `PRD-${String(productCounter).padStart(5, '0')}`
      const price = Math.round((rand() * 180 + 12) * 100) / 100
      const stock = randInt(0, 120)
      products.push({
        id,
        name: `${pick(['Premium', 'Classic', 'Essential', 'Pro', 'Lite'])} ${noun}`,
        category,
        price,
        stock,
        sku: `SKU-${String(productCounter).padStart(5, '0')}`,
        status: rand() > 0.12 ? 'active' : 'inactive',
        description: `High-quality ${noun.toLowerCase()} from our ${category} collection.`,
        image: null,
        variants: category === 'Apparel' || category === 'Footwear'
          ? [
              { id: `${id}-v1`, size: 'S', color: 'Black', sku: `${id}-S-BLK`, stock: randInt(5, 30), price: null },
              { id: `${id}-v2`, size: 'M', color: 'Black', sku: `${id}-M-BLK`, stock: randInt(5, 30), price: null },
              { id: `${id}-v3`, size: 'L', color: 'Navy', sku: `${id}-L-NVY`, stock: randInt(5, 30), price: null },
            ]
          : [],
        rating: Math.round((rand() * 2 + 3) * 10) / 10,
        createdAt: daysAgo(randInt(10, 180)),
      })
    }
  }

  const customers = []
  for (let i = 1; i <= 40; i++) {
    const first = pick(FIRST_NAMES)
    const last = pick(LAST_NAMES)
    const name = `${first} ${last}`
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@email.com`
    customers.push({
      id: `CUS-${String(i).padStart(5, '0')}`,
      name,
      email,
      phone: `+1 (555) ${String(randInt(100, 999))}-${String(randInt(1000, 9999))}`,
      createdAt: daysAgo(randInt(30, 400)),
      tags: rand() > 0.7 ? [pick(['VIP', 'Wholesale', 'Returning'])] : [],
      addresses: [
        {
          id: `addr-${i}-1`,
          label: 'Home',
          line1: `${randInt(100, 9999)} ${pick(['Oak', 'Maple', 'Cedar', 'Pine'])} St`,
          line2: rand() > 0.6 ? `Apt ${randInt(1, 50)}` : undefined,
          city: pick(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Seattle']),
          state: pick(['NY', 'CA', 'IL', 'TX', 'AZ', 'WA']),
          zip: String(randInt(10000, 99999)),
          country: 'United States',
          isDefault: true,
        },
      ],
      orderCount: 0,
      lifetimeValue: 0,
      lastOrderDate: null,
      avgOrderValue: 0,
    })
  }

  const deliveryStatuses = ['Pending', 'Shipped', 'Delivered', 'Returned']
  const paymentStatuses = ['Paid', 'Unpaid', 'Refunded']
  const orders = []

  for (let i = 1; i <= 85; i++) {
    const customer = pick(customers)
    const itemCount = randInt(1, 4)
    const items = []
    let totalAmount = 0
    for (let j = 0; j < itemCount; j++) {
      const product = pick(products.filter((p) => p.status === 'active'))
      const qty = randInt(1, 3)
      const price = product.price
      totalAmount += price * qty
      items.push({
        name: product.name,
        sku: product.sku,
        productId: product.id,
        qty,
        price,
      })
    }
    totalAmount = Math.round(totalAmount * 100) / 100
    const date = daysAgo(randInt(0, 60))
    const deliveryStatus = pick(deliveryStatuses)
    const paymentStatus = pick(paymentStatuses)
    const order = {
      id: `ORD-${String(i).padStart(5, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      date,
      totalAmount,
      paymentStatus,
      deliveryStatus,
      shippingAddress: `${customer.addresses[0].line1}, ${customer.addresses[0].city}, ${customer.addresses[0].state} ${customer.addresses[0].zip}`,
      items,
      internalNotes: [],
      statusHistory: [
        {
          id: `hist-${i}-1`,
          type: 'created',
          message: 'Order placed',
          timestamp: date,
          author: 'System',
        },
        {
          id: `hist-${i}-2`,
          type: 'payment',
          message: `Payment marked ${paymentStatus}`,
          timestamp: date,
          paymentStatus,
          author: 'System',
        },
        {
          id: `hist-${i}-3`,
          type: 'delivery',
          message: `Delivery status: ${deliveryStatus}`,
          timestamp: date,
          deliveryStatus,
          author: 'System',
        },
      ],
    }

    if (rand() > 0.9) {
      const complaintText = pick([
        'Customer complaint: item arrived damaged.',
        'Complaint about wrong size received.',
        'Product quality issue reported by customer.',
        'Customer complained item was not as described.',
      ])
      order.internalNotes.push({
        id: `note-${i}-complaint`,
        text: complaintText,
        author: customer.name,
        createdAt: date,
      })
      order.statusHistory.push({
        id: `hist-${i}-complaint`,
        type: 'note',
        message: complaintText,
        timestamp: date,
        author: customer.name,
      })
    }

    orders.push(order)
    customer.orderCount += 1
    customer.lifetimeValue = Math.round((customer.lifetimeValue + totalAmount) * 100) / 100
    if (!customer.lastOrderDate || date > customer.lastOrderDate) customer.lastOrderDate = date
  }

  for (const customer of customers) {
    customer.avgOrderValue =
      customer.orderCount > 0 ? Math.round((customer.lifetimeValue / customer.orderCount) * 100) / 100 : 0
  }

  const inventory = []
  let invCounter = 0
  for (const product of products) {
    invCounter++
    const stockQuantity = Math.max(0, product.stock)
    const threshold = DEFAULT_SETTINGS.lowStockThreshold
    inventory.push({
      id: `INV-${String(invCounter).padStart(5, '0')}`,
      productId: product.id,
      productName: product.name,
      category: product.category,
      sku: product.sku,
      stockQuantity,
      threshold,
      warehouse: 'Main Warehouse',
      lowStock: stockQuantity <= threshold,
    })
  }

  const stockMovements = []
  for (let i = 1; i <= 60; i++) {
    const inv = pick(inventory)
    const reason = pick(ADJUSTMENT_REASONS)
    const delta = reason.type === 'out' ? -randInt(1, 10) : randInt(1, 25)
    const previousQty = inv.stockQuantity
    const newQty = Math.max(0, previousQty + delta)
    stockMovements.push({
      id: `MOV-${String(i).padStart(5, '0')}`,
      inventoryId: inv.id,
      productName: inv.productName,
      sku: inv.sku,
      reasonCode: reason.code,
      reasonLabel: reason.label,
      delta,
      previousQty,
      newQty,
      warehouse: inv.warehouse,
      author: pick(users).name,
      note: '',
      createdAt: daysAgo(randInt(0, 45)),
    })
  }

  const purchaseOrders = []
  for (let i = 1; i <= 12; i++) {
    const poItems = []
    let totalCost = 0
    const itemCount = randInt(2, 5)
    for (let j = 0; j < itemCount; j++) {
      const inv = pick(inventory)
      const qtyOrdered = randInt(20, 100)
      const unitCost = Math.round(rand() * 40 * 100) / 100
      totalCost += qtyOrdered * unitCost
      poItems.push({
        inventoryId: inv.id,
        productId: inv.productId,
        productName: inv.productName,
        sku: inv.sku,
        qtyOrdered,
        unitCost,
      })
    }
    purchaseOrders.push({
      id: `PO-${String(i).padStart(5, '0')}`,
      supplier: pick(['Northwind Wholesale', 'Pacific Goods Co.', 'Summit Supply', 'Atlas Merchants']),
      items: poItems,
      totalCost: Math.round(totalCost * 100) / 100,
      status: pick(['draft', 'sent', 'partial', 'received', 'cancelled']),
      createdAt: daysAgo(randInt(5, 90)),
      expectedDate: rand() > 0.3 ? daysAgo(-randInt(5, 20)).split('T')[0] : null,
      notes: '',
    })
  }

  const notifications = [
    {
      id: 'NTF-001',
      type: 'order',
      title: 'New order received',
      message: `Order ${orders[0]?.id} from ${orders[0]?.customerName}`,
      href: `/orders/${orders[0]?.id}`,
      read: false,
      createdAt: daysAgo(0),
    },
    {
      id: 'NTF-002',
      type: 'inventory',
      title: 'Low stock alert',
      message: `${inventory.find((i) => i.lowStock)?.productName || 'Product'} is below threshold`,
      href: '/inventory',
      read: false,
      createdAt: daysAgo(1),
    },
    {
      id: 'NTF-003',
      type: 'payment',
      title: 'Payment received',
      message: `$${orders[1]?.totalAmount} payment confirmed`,
      href: `/orders/${orders[1]?.id}`,
      read: true,
      createdAt: daysAgo(2),
    },
  ]

  return {
    users,
    sessions: {},
    resetTokens: {},
    products,
    customers,
    orders,
    inventory,
    stockMovements,
    purchaseOrders,
    notifications,
    settings: { ...DEFAULT_SETTINGS },
    adjustmentReasons: ADJUSTMENT_REASONS,
    warehouses: WAREHOUSES,
    categories: CATEGORIES,
    counters: {
      product: products.length,
      order: orders.length,
      customer: customers.length,
      inventory: inventory.length,
      movement: stockMovements.length,
      po: purchaseOrders.length,
      notification: notifications.length,
    },
  }
}
