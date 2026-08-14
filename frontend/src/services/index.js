// Services barrel — replaces the Sprint 1 placeholder stubs.

export { API_BASE, request, resolveUrl, UNAUTHORIZED_EVENT } from './api';
export { fetchProduct, fetchProducts } from './products';
export { clearStoredCart, loadCartItems, saveCartItems } from './cartStorage';
export { clearStoredWishlist, loadWishlist, saveWishlist } from './wishlistStorage';
export {
  confirmPasswordReset,
  fetchCurrentCustomer,
  loginCustomer,
  registerCustomer,
  requestPasswordReset,
  updateCustomerProfile,
} from './customerAuth';
export {
  createAddress,
  deleteAddress,
  fetchAddresses,
  updateAddress,
} from './addresses';