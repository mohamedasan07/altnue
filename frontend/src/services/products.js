import { request } from './api';

export async function fetchProducts() {
  const data = await request('/api/products');
  return Array.isArray(data) ? data : [];
}

export async function fetchProduct(id) {
  return request(`/api/products/${id}`);
}