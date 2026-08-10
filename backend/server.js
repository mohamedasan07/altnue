import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Sprint 13A foundation — modular API (health + future routes), centralized
// error handling, and external-service connectivity checks.
import apiRouter from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { verifyConnections } from './services/connection.service.js';
import { listProducts } from './services/product.service.js';
import { logger } from './utils/logger.js';

dotenv.config();

// =====================
// Path resolution
// =====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.resolve(__dirname, 'db.json');
const adminRoot = path.resolve(projectRoot, 'admin');

// =====================
// Helpers
// =====================
function safeString(v) { return String(v ?? ''); }
function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function safeBool(v) { return Boolean(v); }

// =====================
// db.json — Single Source of Truth
// =====================
function loadDB() {
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      products: Array.isArray(parsed?.products) ? parsed.products : [],
      orders: Array.isArray(parsed?.orders) ? parsed.orders : [],
      users: Array.isArray(parsed?.users) ? parsed.users : [],
      meta: parsed?.meta && typeof parsed.meta === 'object' ? parsed.meta : {}
    };
  } catch {
    return { products: [], orders: [], users: [], meta: {} };
  }
}

function persistDB(dbObj) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(dbObj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[persistDB] Failed to write db.json:', err.message);
  }
}

// Load database into memory on startup
let db = loadDB();

// In-memory cart (not persisted — frontend uses localStorage)
let cart = [];

// =====================
// Product normalization
// =====================
function normalizeProduct(p) {
  return {
    id: safeNumber(p?.id, 0),
    name: safeString(p?.name).trim(),
    description: safeString(p?.description).trim(),
    category: safeString(p?.category).trim(),
    price: safeNumber(p?.price, 0),
    oldPrice: safeNumber(p?.oldPrice, 0),
    imageUrl: safeString(p?.imageUrl || p?.image).trim(),
    stockQuantity: safeNumber(p?.stockQuantity, 0),
    sale: safeBool(p?.sale)
  };
}

function getNextId() {
  const maxId = db.products.reduce((max, p) => Math.max(max, safeNumber(p.id, 0)), 0);
  return maxId + 1;
}

function findProduct(id) {
  const numId = Number(id);
  return db.products.find(p => p.id === numId);
}

function persistProducts() {
  const current = loadDB();
  current.products = db.products;
  current.orders = db.orders;
  current.users = db.users;
  persistDB(current);
}

// =====================
// Express App Setup
// =====================
const app = express();

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
// folder is no longer served by the backend.

// Serve admin static assets only (CSS, JS — NOT index.html, which needs auth check)
app.use('/admin', express.static(adminRoot, {
  index: false  // Don't serve index.html automatically, let route handlers manage it
}));

// Product images are hosted on Cloudinary (Sprint 14A). Explicitly 404 the old
// /images and /image endpoints so nothing can fall back to the local folder.
app.use('/image', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/images', (req, res) => res.status(404).json({ error: 'Not found' }));

// Serve customer-facing static files (index.html, style.css, script.js)
app.use(express.static(projectRoot, {
  index: 'index.html',
  extensions: ['html']
}));

// =====================
// Admin Auth (session cookie)
// =====================
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@unsorted.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const SESSION_COOKIE = 'unsorted_admin_session';

const sessions = new Set();

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const out = {};
  header.split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    out[k] = decodeURIComponent(v.join('=') || '');
  });
  return out;
}

function signSession(sessionId) {
  return Buffer.from(`${sessionId}:${SESSION_SECRET}`).toString('base64');
}

function verifySession(signed) {
  if (!signed) return null;
  try {
    const decoded = Buffer.from(String(signed), 'base64').toString('utf-8');
    const [sessionId, secret] = decoded.split(':');
    if (!sessionId || secret !== SESSION_SECRET) return null;
    return { sessionId };
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  const signed = cookies[SESSION_COOKIE];
  const verified = verifySession(signed);

  if (!verified || !sessions.has(verified.sessionId)) {
    // API requests get 401, page requests get redirect
    if (req.path.startsWith('/api')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/admin/login');
  }

  req.admin = { email: ADMIN_EMAIL };
  return next();
}

// =====================
// Admin Auth Routes
// =====================
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(adminRoot, 'index.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(adminRoot, 'login.html'));
});

app.post('/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = safeString(email).trim();
  const cleanPassword = safeString(password);

  if (cleanEmail !== ADMIN_EMAIL || cleanPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const sessionId = randomUUID();
  sessions.add(sessionId);
  const signed = signSession(sessionId);

  const isProduction = process.env.NODE_ENV === 'production';

res.cookie(SESSION_COOKIE, signed, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/'
});

  return res.json({ ok: true });
});

app.post('/admin/logout', (req, res) => {
  const cookies = parseCookies(req);
  const signed = cookies[SESSION_COOKIE];
  const verified = verifySession(signed);
  if (verified) sessions.delete(verified.sessionId);

  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

// =====================
// Products API — PUBLIC reads (Supabase), ADMIN writes (legacy db.json)
// =====================
// Sprint 13B: GET /api/products and GET /api/products/:id are served by the
// modular product router (repositories → services → Supabase) mounted below.
// The legacy admin write routes below still target db.json until admin CRUD
// is migrated in a later sprint.

// POST /api/products — Admin only
app.post('/api/products', (req, res) => {
  const body = req.body || {};

  const name = safeString(body.name).trim();
  const description = safeString(body.description).trim();
  const category = safeString(body.category).trim();
  const imageUrl = safeString(body.imageUrl || body.image).trim();
  const price = safeNumber(body.price, -1);
  const oldPrice = safeNumber(body.oldPrice, 0);
  const stockQuantity = safeNumber(body.stockQuantity, -1);
  const sale = safeBool(body.sale);

  // Validation
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (price < 0) return res.status(400).json({ error: 'price must be a non-negative number' });
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });
  if (stockQuantity < 0) return res.status(400).json({ error: 'stockQuantity must be a non-negative number' });

  const id = getNextId();

  const product = normalizeProduct({
    id, name, description, category, price, oldPrice, imageUrl, stockQuantity, sale
  });

  db.products.push(product);
  persistProducts();

  res.status(201).json({ ok: true, product });
});

// PUT /api/products/:id — Admin only
app.put('/api/products/:id', (req, res) => {
  const productId = Number(req.params.id);
  const index = db.products.findIndex(p => p.id === productId);

  if (index === -1) return res.status(404).json({ error: 'Product not found' });

  const existing = db.products[index];
  const body = req.body || {};

  const name = safeString(body.name).trim() || existing.name;
  const description = body.description !== undefined ? safeString(body.description).trim() : existing.description;
  const category = body.category !== undefined ? safeString(body.category).trim() : existing.category;
  const imageUrl = safeString(body.imageUrl || body.image).trim() || existing.imageUrl;
  const price = body.price !== undefined ? safeNumber(body.price, existing.price) : existing.price;
  const oldPrice = body.oldPrice !== undefined ? safeNumber(body.oldPrice, existing.oldPrice) : existing.oldPrice;
  const stockQuantity = body.stockQuantity !== undefined ? safeNumber(body.stockQuantity, existing.stockQuantity) : existing.stockQuantity;
  const sale = body.sale !== undefined ? safeBool(body.sale) : existing.sale;

  // Validation
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (price < 0) return res.status(400).json({ error: 'price must be a non-negative number' });
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });
  if (stockQuantity < 0) return res.status(400).json({ error: 'stockQuantity must be a non-negative number' });

  const updated = normalizeProduct({
    id: productId, name, description, category, price, oldPrice, imageUrl, stockQuantity, sale
  });

  db.products[index] = updated;
  persistProducts();

  res.json({ ok: true, product: updated });
});

// DELETE /api/products/:id — Admin only
app.delete('/api/products/:id', (req, res) => {
  const productId = Number(req.params.id);
  const index = db.products.findIndex(p => p.id === productId);

  if (index === -1) return res.status(404).json({ error: 'Product not found' });

  db.products.splice(index, 1);
  persistProducts();

  res.json({ ok: true });
});

// =====================
// Cart API (in-memory, for frontend sync)
// =====================
app.get('/cart', (req, res) => {
  res.json({ cart });
});

app.post('/cart', (req, res) => {
  const { productId, quantity } = req.body || {};
  const qty = Math.max(1, safeNumber(quantity, 1));
  const product = findProduct(productId);

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
  const { quantity } = req.body || {};
  const qty = Number(quantity);

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
// Orders API — Admin only
// =====================
app.get('/api/orders', requireAdmin, (req, res) => {
  const orders = (db.orders || []).map(o => ({
    id: safeNumber(o?.id, 0),
    customerName: safeString(o?.customerName),
    customerEmail: safeString(o?.customerEmail),
    items: Array.isArray(o?.items) ? o.items.map(it => ({
      productId: safeNumber(it?.productId, 0),
      name: safeString(it?.name),
      priceAtOrder: safeNumber(it?.priceAtOrder, 0),
      imageUrl: safeString(it?.imageUrl),
      quantity: safeNumber(it?.quantity, 0)
    })) : [],
    paymentStatus: safeString(o?.paymentStatus),
    orderStatus: safeString(o?.orderStatus),
    totalRevenue: safeNumber(o?.totalRevenue, 0),
    createdAt: safeString(o?.createdAt)
  }));

  res.json({ orders });
});

app.put('/api/orders/:id', requireAdmin, (req, res) => {
  const orderId = safeNumber(req.params.id, 0);
  const order = (db.orders || []).find(o => safeNumber(o?.id, 0) === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const body = req.body || {};
  if (body.paymentStatus !== undefined) order.paymentStatus = safeString(body.paymentStatus);
  if (body.orderStatus !== undefined) order.orderStatus = safeString(body.orderStatus);

  persistProducts();
  res.json({ ok: true, order });
});

// =====================
// Users API — Admin only
// =====================
app.get('/api/users', requireAdmin, (req, res) => {
  const users = (db.users || []).map(u => ({
    id: safeNumber(u?.id, 0),
    name: safeString(u?.name),
    email: safeString(u?.email),
    role: safeString(u?.role)
  }));

  res.json({ users });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const userId = safeNumber(req.params.id, 0);
  const before = (db.users || []).length;
  db.users = (db.users || []).filter(u => safeNumber(u?.id, 0) !== userId);
  if ((db.users || []).length === before) return res.status(404).json({ error: 'User not found' });

  persistProducts();
  res.json({ ok: true });
});

// =====================
// Modular API — Sprint 13A foundation
// =====================
// Mounted after the legacy routes so it only handles paths they don't claim.
// `apiRouter` currently exposes GET /api/health; future sprints register their
// route modules in routes/index.js.
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
  console.log(`UNSORTED backend running on http://${HOST}:${PORT}`);
  console.log(`  Admin: http://localhost:${PORT}/admin`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  // Product source moved to Supabase in Sprint 13B — report the live count.
  listProducts()
    .then((products) => console.log(`  Products (Supabase): ${products.length}`))
    .catch(() => console.log('  Products (Supabase): unavailable'));
});
