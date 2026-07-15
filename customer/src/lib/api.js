import { request } from '@/lib/http'

export const api = {
  login: (email, password) => request('/user/login', { method: 'POST', body: { email, password } }),
  register: (payload) => request('/user/register', { method: 'POST', body: payload }),
  me: () => request('/user/user-details'),
  products: (params = {}) => {
    const q = new URLSearchParams({ page: '1', limit: '24', ...params })
    return request(`/product/get-product?${q}`)
  },
  product: (id) => request(`/product/get-product/${id}`),
}
