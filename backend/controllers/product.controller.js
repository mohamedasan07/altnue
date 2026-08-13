import { ApiError } from '../utils/apiError.js';
import {
  listProducts,
  listAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/product.service.js';
import { validateProductPayload } from '../validators/product.validator.js';

/**
 * Product HTTP handlers (GET/POST/PUT/DELETE).
 *
 * Controllers stay thin: parse the request, validate the payload, delegate to
 * the service, and shape the response. No SQL, no Supabase calls, no db.json.
 */

/** GET /api/products — public catalog (active products only). */
export async function listProductsHandler(_req, res) {
  const products = await listProducts();
  res.json(products);
}

/** GET /api/admin/products — all products including hidden (JWT-protected). */
export async function listAllProductsHandler(_req, res) {
  const products = await listAllProducts();
  res.json(products);
}

/** GET /api/products/:id — public single product. */
export async function getProductHandler(req, res) {
  const product = await getProduct(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(product);
}

/** POST /api/products — create (admin, JWT-protected). */
export async function createProductHandler(req, res) {
  const payload = validateProductPayload(req.body, { partial: false });
  const product = await createProduct(payload);
  res.status(201).json({ ok: true, product });
}

/** PUT /api/products/:id — partial update (admin, JWT-protected). */
export async function updateProductHandler(req, res) {
  const payload = validateProductPayload(req.body, { partial: true });
  const product = await updateProduct(req.params.id, payload);
  res.json({ ok: true, product });
}

/** DELETE /api/products/:id — remove (admin, JWT-protected). */
export async function deleteProductHandler(req, res) {
  await deleteProduct(req.params.id);
  res.json({ ok: true });
}
