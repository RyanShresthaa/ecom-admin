// Centralized React Query keys to keep cache invalidation consistent.
export const queryKeys = {
  auth: {
    session: ['auth', 'session'],
  },
  dashboard: {
    all: ['dashboard'],
    stats: ['dashboard', 'stats'],
    sales: ['dashboard', 'sales'],
    recentOrders: (params) => ['dashboard', 'recent-orders', params],
  },
  customers: {
    all: ['customers'],
    list: (params) => ['customers', 'list', params],
    detail: (id) => ['customers', 'detail', id],
    orders: (id, params) => ['customers', 'orders', id, params],
  },
  products: {
    all: ['products'],
    list: (params) => ['products', 'list', params],
    options: (params) => ['products', 'options', params],
    detail: (id) => ['products', 'detail', id],
    analytics: (id) => ['products', 'analytics', id],
  },
  orders: {
    all: ['orders'],
    list: (params) => ['orders', 'list', params],
    detail: (id) => ['orders', 'detail', id],
  },
  inventory: {
    all: ['inventory'],
    list: (params) => ['inventory', 'list', params],
    movements: (params) => ['inventory', 'movements', params],
    reorder: (params) => ['inventory', 'reorder', params],
    purchaseOrders: {
      all: ['inventory', 'purchase-orders'],
      list: (params) => ['inventory', 'purchase-orders', 'list', params],
      detail: (id) => ['inventory', 'purchase-orders', 'detail', id],
    },
  },
  settings: {
    detail: ['settings'],
    payments: ['settings', 'payments'],
  },
  search: (query) => ['search', query],
  notifications: {
    all: ['notifications'],
  },
  account: {
    detail: ['account'],
  },
  blog: {
    all: ['blog'],
    list: (params) => ['blog', 'list', params],
    detail: (id) => ['blog', 'detail', id],
  },
}
