const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(amount) {
  const n = Number(amount);
  return Number.isFinite(n) ? INR_FORMATTER.format(n) : '₹0';
}

export function formatMoney(amount) {
  const n = Number(amount);
  return Number.isFinite(n) ? n.toLocaleString('en-IN') : '0';
}

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}