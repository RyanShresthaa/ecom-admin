import { request } from '@/lib/http'

// Customer-facing API facade — auth, catalog, cart, and stock waitlist.
export const api = {
  login: (email, password) => request('/user/login', { method: 'POST', body: { email, password } }),
  register: (payload) => request('/user/register', { method: 'POST', body: payload }),
  me: () => request('/user/user-details'),

  products: (params = {}) => {
    const q = new URLSearchParams({ page: '1', limit: '24', ...params })
    return request(`/product/get-product?${q}`)
  },
  product: (id) => request(`/product/get-product/${id}`),

  // Cart — guest or logged-in (X-Guest-Id set in http.js).
  getCart: () => request('/cart/get'),
  addToCart: (payload) => request('/cart/add', { method: 'POST', body: payload }),
  updateCart: (payload) => request('/cart/update', { method: 'PUT', body: payload }),
  removeCart: (id) => request('/cart/delete', { method: 'DELETE', body: { _id: id } }),
  validateCart: (autofix = false) =>
    request('/cart/validate', { method: 'POST', body: { autofix } }),

  // Back-in-stock waitlist.
  subscribeStockAlert: (payload) =>
    request('/stock-alerts/subscribe', { method: 'POST', body: payload }),

  blogList: (params = {}) => {
    const q = new URLSearchParams({ page: '1', limit: '24', ...params })
    return request(`/blog?${q}`)
  },
  blogPost: (slug) => request(`/blog/post/${encodeURIComponent(slug)}`),
}
