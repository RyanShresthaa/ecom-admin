/**
 * Centralized query key factory. Keeping keys in one place avoids typos
 * and makes cache invalidation after mutations predictable.
 */
export const queryKeys = {
  dashboard: {
    stats: ['dashboard', 'stats'],
    sales: ['dashboard', 'sales'],
    recentOrders: (params) => ['dashboard', 'recent-orders', params],
  },
  products: {
    all: ['products'],
    list: (params) => ['products', 'list', params],
    categories: ['products', 'categories'],
  },
  categories: {
    all: ['categories'],
    list: ['categories', 'list'],
  },
  orders: {
    all: ['orders'],
    list: (params) => ['orders', 'list', params],
    detail: (id) => ['orders', 'detail', id],
  },
  inventory: {
    all: ['inventory'],
    list: (params) => ['inventory', 'list', params],
    warehouses: ['inventory', 'warehouses'],
  },
  coupons: {
    all: ['coupons'],
    list: ['coupons', 'list'],
  },
  returns: {
    all: ['returns'],
    list: ['returns', 'list'],
  },
  feedback: {
    all: ['feedback'],
    list: (params) => ['feedback', 'list', params],
  },
  productReviews: {
    all: ['product-reviews'],
    list: (params) => ['product-reviews', 'list', params],
  },
  googleReviews: {
    all: ['google-reviews'],
    list: ['google-reviews', 'list'],
  },
  sellers: {
    all: ['sellers'],
    requests: ['sellers', 'requests'],
  },
  audit: {
    all: ['audit'],
    list: (params) => ['audit', 'list', params],
  },
  blog: {
    all: ['blog'],
    list: ['blog', 'list'],
  },
  newsletter: {
    all: ['newsletter'],
    list: ['newsletter', 'list'],
  },
  securityEvents: {
    all: ['security-events'],
    list: (params) => ['security-events', 'list', params],
  },
  settings: {
    detail: ['settings'],
  },
  profile: {
    detail: ['profile'],
  },
  notifications: {
    all: ['notifications'],
  },
  search: {
    global: (q) => ['search', 'global', q],
  },
}
