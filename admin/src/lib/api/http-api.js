import { request } from '@/lib/http'

export const httpApi = {
  auth: {
    login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
    session: (token) => request('/auth/session', { token }),
    logout: (token) => request('/auth/logout', { method: 'POST', token }),
    requestPasswordReset: (payload) => request('/auth/forgot-password', { method: 'POST', body: payload }),
    resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload }),
  },
  dashboard: {
    stats: () => request('/dashboard/stats'),
    salesSeries: () => request('/dashboard/sales-series'),
    recentOrders: (params) => request('/dashboard/recent-orders', { params }),
  },
  customers: {
    list: (params) => request('/customers', { params }),
    getById: (id) => request(`/customers/${id}`),
    orders: (id, params) => request(`/customers/${id}/orders`, { params }),
    update: (id, payload) => request(`/customers/${id}`, { method: 'PATCH', body: payload }),
  },
  products: {
    list: (params) => request('/products', { params }),
    options: (params) => request('/products/options', { params }),
    getById: (id) => request(`/products/${id}`),
    analytics: (id) => request(`/products/${id}/analytics`),
    create: (payload) => request('/products', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => request(`/products/${id}`, { method: 'DELETE' }),
    uploadImage: (id, payload) => request(`/products/${id}/image`, { method: 'POST', body: payload }),
    exportCsv: () => request('/products/export/csv'),
    importCsv: (payload) => request('/products/import/csv', { method: 'POST', body: payload }),
    categories: () => request('/products/categories'),
  },
  orders: {
    list: (params) => request('/orders', { params }),
    getById: (id) => request(`/orders/${id}`),
    updateStatus: (id, payload) => request(`/orders/${id}/status`, { method: 'PATCH', body: payload }),
    bulkUpdateStatus: (payload) => request('/orders/bulk-status', { method: 'POST', body: payload }),
    addNote: (id, payload) => request(`/orders/${id}/notes`, { method: 'POST', body: payload }),
    create: (payload) => request('/orders', { method: 'POST', body: payload }),
  },
  inventory: {
    list: (params) => request('/inventory', { params }),
    warehouses: () => request('/inventory/warehouses'),
    adjustmentReasons: () => request('/inventory/adjustment-reasons'),
    movements: (params) => request('/inventory/movements', { params }),
    adjust: (payload) => request('/inventory/adjust', { method: 'POST', body: payload }),
    reorderSuggestions: (params) => request('/inventory/reorder-suggestions', { params }),
    purchaseOrders: {
      list: (params) => request('/inventory/purchase-orders', { params }),
      getById: (id) => request(`/inventory/purchase-orders/${id}`),
      create: (payload) => request('/inventory/purchase-orders', { method: 'POST', body: payload }),
      updateStatus: (id, payload) =>
        request(`/inventory/purchase-orders/${id}/status`, { method: 'PATCH', body: payload }),
    },
  },
  settings: {
    get: () => request('/settings'),
    save: (payload) => request('/settings', { method: 'PUT', body: payload }),
  },
  search: (params) => request('/search', { params: { q: params.query, limit: params.limit } }),
  notifications: {
    list: () => request('/notifications'),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
  },
  account: {
    get: (token) => request('/account', { token }),
    update: (token, payload) => request('/account', { method: 'PATCH', body: payload, token }),
    updatePassword: (token, payload) =>
      request('/account/password', { method: 'POST', body: payload, token }),
  },
}
