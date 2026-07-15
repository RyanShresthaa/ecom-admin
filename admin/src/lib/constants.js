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

export const ADJUSTMENT_REASONS = [
  { code: 'received', label: 'Stock received', type: 'in' },
  { code: 'returned', label: 'Customer return', type: 'in' },
  { code: 'correction', label: 'Inventory correction', type: 'either' },
  { code: 'transfer', label: 'Warehouse transfer', type: 'either' },
  { code: 'damaged', label: 'Damaged / write-off', type: 'out' },
  { code: 'sold', label: 'Manual sale', type: 'out' },
  { code: 'other', label: 'Other', type: 'either' },
]

export const DEFAULT_SETTINGS = {
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

export const PO_SUPPLIERS = [
  'Matina Crafts Supply',
  'Pacific Goods Co.',
  'Summit Supply',
  'Atlas Merchants',
  'Horizon Trading',
]
