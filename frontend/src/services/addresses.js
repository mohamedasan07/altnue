// Address book API calls (Sprint 21.2 backend). All routes require the
// customer JWT; services/api.js attaches the Bearer header.

import { request } from './api';

/** GET /api/customer/addresses — the current customer's address book. */
export async function fetchAddresses() {
  const data = await request('/api/customer/addresses');
  return Array.isArray(data.addresses) ? data.addresses : [];
}

/** POST /api/customer/addresses — create a new address. */
export async function createAddress(payload) {
  const data = await request('/api/customer/addresses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.address;
}

/** PUT /api/customer/addresses/:id — update an address (set-default here). */
export async function updateAddress(id, payload) {
  const data = await request(`/api/customer/addresses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.address;
}

/** DELETE /api/customer/addresses/:id — remove an address. */
export async function deleteAddress(id) {
  await request(`/api/customer/addresses/${id}`, { method: 'DELETE' });
  return true;
}