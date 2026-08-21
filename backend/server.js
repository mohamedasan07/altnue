import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

// Hosts such as Render set NODE_ENV=production automatically. Local `npm run
// dev` leaves it unset, so we default to development mode unless told otherwise.
const isProduction = process.env.NODE_ENV === 'production';

// Trust exactly one proxy hop (Render's edge router). Required so `req.ip` is
// the real client IP behind the platform proxy — express-rate-limit keys its
// per-IP buckets on it and REFUSES to run when X-Forwarded-For is present with
// trust proxy disabled (it would 500 every auth request in production). A
// numeric hop count cannot be spoofed by extra client-supplied XFF entries;
// `true` would be spoofable and is rejected by the limiter's validation.
app.set('trust proxy', 1);

// =====================
// Security headers (Helmet) — Sprint 22.6 P1
// =====================
// Applies defense-in-depth headers to every response: X-Content-Type-Options,
// X-Frame-Options + frame-ancestors (clickjacking), HSTS (HTTPS only),
// Referrer-Policy, plus a Content-Security-Policy tuned to the resources the
// backend actually serves (JSON API + the legacy landing page that is still
// mounted until Phase 2 removal).
//
// CSP notes (deliberate, not blind):
//  - 'unsafe-inline' for script/style is required by the legacy index.html
//    (inline <script> blocks, onclick handlers, inline style attributes) and
//    must be removed once the legacy site is retired in Phase 2.
//  - img-src allows Cloudinary + Unsplash (legacy product imagery); the modern
//    React frontends are served by Vercel with their own headers, so they are
//    unaffected by this CSP.
//  - Razorpay is confirmed dead/placeholder — its CDN is intentionally NOT
//    allowed anywhere in the CSP.
//  - connect-src includes the deployed Render backend so the legacy page's
//    fetch() calls keep working regardless of which origin hosts the page.
//  - crossOriginResourcePolicy 'cross-origin' aligns with this API's design:
//    it is intentionally consumable cross-origin via the CORS allow-list.
//  - upgrade-insecure-requests (a Helmet default) is production-only: over
//    plain-HTTP local dev it would rewrite http://localhost:3001/style.css to
//    https:// and break the legacy page's own assets. Render serves HTTPS, so
//    the upgrade is safe (and desirable) there.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://images.unsplash.com'],
      connectSrc: ["'self'", 'https://unsorted-backend.onrender.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// =====================
// CORS configuration — auto-switches between dev and production
// =====================

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

// Sprint 22.6 P1: fail loudly on a likely production misconfiguration. An empty
// allow-list in production blocks every browser origin (the React storefront
// calls this backend cross-origin), which manifests as silent API failures —
// surface it at boot so it cannot go unnoticed. Failing closed is still safer
// than an accidental wildcard; this warning only makes the risk visible.
if (isProduction && allowedOrigins.size === 0) {
  logger.warn(
    'CORS_ORIGINS is empty in production — no browser origin can reach this API. Set CORS_ORIGINS to the deployed frontend origin(s) (comma-separated).'
  );
}

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
