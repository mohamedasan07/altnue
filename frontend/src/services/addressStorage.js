// AddressStorage — localStorage persistence for saved shipping addresses.
// Frontend-only mock data; never send real addresses to localStorage in
// production without consent + encryption trade-offs understood.

const STORAGE_KEY = 'unsorted_addresses_v1';

const SEED_ADDRESS = {
  id: `addr_${Date.now().toString(36)}demo`,
  name: 'Ava Kane',
  phone: '+91 98765 43210',
  address: 'Flat 402, Lotus Residency, Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
  isDefault: true,
};

function isValid(a) {
  return (
    a &&
    typeof a === 'object' &&
    typeof a.name === 'string' &&
    typeof a.address === 'string' &&
    typeof a.city === 'string'
  );
}

/** Read saved addresses. Seeds one demo address on first access. */
export function loadAddresses() {
  let list = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed.filter(isValid);
    }
  } catch {
    list = [];
  }

  if (list.length === 0) {
    list = [SEED_ADDRESS];
    persist(list);
  }

  return list;
}

/** Persist the address list (swallows storage failures). */
export function saveAddresses(list = []) {
  persist(list);
}

function persist(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — runs in memory only */
  }
}

export function clearStoredAddresses() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}