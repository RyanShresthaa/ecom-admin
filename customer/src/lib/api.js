import { request } from '@/lib/http'

// Customer-facing API facade — auth and catalog endpoints against shared backend.
export const api = {
  // POST /api/user/login — customer sign-in.
  login: (email, password) => request('/user/login', { method: 'POST', body: { email, password } }),
  // POST /api/user/register — create new shopper account.
  register: (payload) => request('/user/register', { method: 'POST', body: payload }),
  // GET /api/user/user-details — current profile for account page.
  me: () => request('/user/user-details'),
  // GET /api/product/get-product — paginated published product grid for shop page.
  products: (params = {}) => {
    const q = new URLSearchParams({ page: '1', limit: '24', ...params })
    return request(`/product/get-product?${q}`)
  },
  // GET /api/product/get-product/:id — single product detail view.
  product: (id) => request(`/product/get-product/${id}`),
}
