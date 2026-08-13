import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import apiRouter from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { verifyConnections } from './services/connection.service.js';
import { listProducts, getProduct } from './services/product.service.js';
import { logger } from './utils/logger.js';

dotenv.config();

// =====================
// Path resolution
// =====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// =====================
// Express App Setup
// =====================
const app = express();
app.disable('x-powered-by');

// =====================
// CORS configuration — auto-switches between dev and production
// =====================
// Hosts such as Render set NODE_ENV=production automatically. Local `npm run
// dev` leaves it unset, so we default to development mode unless told otherwise.
const isProduction = process.env.NODE_ENV === 'production';

// Production allow-list is read from CORS_ORIGINS (comma-separated domains).
// e.g. CORS_ORIGINS=https://unsorted-swart.vercel.app,https://staging.example.com
function parseCorsOrigins(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Strip trailing slashes / default ports so "https://foo.com/" still matches.
function normalizeOrigin(origin) {
  try {
    return new URL(origin).origin.toLowerCase();
  } catch {
    return String(origin || '').replace(/\/+$/, '').toLowerCase();
  }
}

const allowedOrigins = isProduction
  ? new Set(parseCorsOrigins(process.env.CORS_ORIGINS).map(normalizeOrigin))
  : new Set();

// `origin` receives the request Origin header (or undefined for non-browser
// requests like curl/Postman/server-to-server). Callback signature:
//   callback(null, true-ish)  -> reflect the request origin (allow)
//   callback(null, false)     -> omit the CORS header      (block)
function corsOrigin(origin, callback) {
  // Requests without an Origin header are NOT CORS requests — always allow
  // them (curl, Postman, server-to-server, health checks, etc.).
  if (!origin) return callback(null, true);

  // Production: only explicit domains listed in CORS_ORIGINS.
  if (isProduction) {
    const allowed = allowedOrigins.has(normalizeOrigin(origin));
    return callback(null, allowed ? origin : false);
  }

  // Development: allow any localhost / 127.0.0.1 origin, regardless of port
  // (5173, 5174, 3000, 4173, ...). Anything else stays blocked.
  const isLocal =
    /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);
  return callback(null, isLocal ? origin : false);
}

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());

// =====================
// Static file serving
// =====================
// Product images are hosted on Cloudinary (Sprint 14A) — the local images/
// folder is no longer served by the backend. Explicitly 404 the old /images
// and /image endpoints so nothing can fall back to a local folder.
app.use('/image', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/images', (req, res) => res.status(404).json({ error: 'Not found' }));

// Serve ONLY the legacy customer-site files (title/logo/product images all
// come from Cloudinary/CDNs, so these five files are the complete local
// surface). Everything else in the repository root — backend/, frontend/ and
// admin-frontend/ source — is deliberately NOT exposed, so no internal files
// (e.g. server code, package manifests, schema) leak over HTTP.
const LEGACY_SITE_FILES = [
  'index.html',
  'style.css',
  'script.js',
  'checkout_patch.js',
  'razorpay_checkout.js',
];

function serveLegacyFile(file) {
  return (_req, res) => {
    res.sendFile(path.join(projectRoot, file));
  };
}

for (const file of LEGACY_SITE_FILES) {
  app.get(`/${file === 'index.html' ? '' : file}`, serveLegacyFile(file));
}
app.get('/index.html', serveLegacyFile('index.html'));

// =====================
// Cart API (in-memory, for the legacy customer-site sync)
// =====================
let cart = [];

app.get('/cart', (req, res) => {
  res.json({ cart });
});

app.post('/cart', async (req, res) => {
  const { productId, quantity } = req.body || {};
  const qty = Math.max(1, Number(quantity) || 1);

  // Products live in Supabase — resolve the snapshot fields for the cart line.
  let product = null;
  try {
    product = await getProduct(productId);
  } catch {
    product = null;
  }
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const existing = cart.find(i => i.productId === Number(productId));
  if (existing) {
    existing.quantity += qty;
    return res.json({ cart });
  }

  cart.push({
    id: randomUUID(),
    productId: Number(productId),
    name: product.name,
    price: product.price,
    imageUrl: product.imageUrl,
    quantity: qty
  });

  res.json({ cart });
});

app.put('/cart/:id', (req, res) => {
  const productId = Number(req.params.id);
  const qty = Number(req.body?.quantity);

  const item = cart.find(i => i.productId === productId);
  if (!item) return res.status(404).json({ error: 'Cart item not found' });
  if (!Number.isFinite(qty) || qty < 0) return res.status(400).json({ error: 'Invalid quantity' });

  if (qty === 0) {
    cart = cart.filter(i => i.productId !== productId);
    return res.json({ cart });
  }

  item.quantity = qty;
  res.json({ cart });
});

app.delete('/cart/:id', (req, res) => {
  const productId = Number(req.params.id);
  cart = cart.filter(i => i.productId !== productId);
  res.json({ cart });
});

// =====================
// Modular API — routes → controllers → services → repositories → Supabase
// =====================
app.use('/api', apiRouter);

// Unmatched /api/* paths get a JSON 404 (previously fell through to index.html).
app.use('/api', notFound);

// Centralized error handler — always last.
app.use(errorHandler);

// =====================
// Start Server
// =====================
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Verify Supabase + Cloudinary connectivity in the background. Never blocks
// startup: the API must stay up even if credentials are absent locally.
verifyConnections().catch((err) => logger.error('Connection verification failed:', err));

app.listen(PORT, HOST, () => {
  logger.info(`UNSORTED backend running on http://${HOST}:${PORT}`);
  logger.info(`Health: http://localhost:${PORT}/api/health`);
  // Report the live Supabase product count.
  listProducts()
    .then((products) => logger.info(`Products (Supabase): ${products.length}`))
    .catch(() => logger.info('Products (Supabase): unavailable'));
});
