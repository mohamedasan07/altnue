import { listProducts, getProduct } from '../services/product.service.js';

/** GET /api/products — public catalog list from Supabase */
export async function listProductsHandler(_req, res) {
  const products = await listProducts();
  res.json(products);
}

/** GET /api/products/:id — public single product from Supabase */
export async function getProductHandler(req, res) {
  const product = await getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}