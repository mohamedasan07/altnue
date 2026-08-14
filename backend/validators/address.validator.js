import { ApiError } from '../utils/apiError.js';

/**
 * Address payload validation (Sprint 21.2).
 *
 * Single source of truth for the address book fields, mirroring the checkout
 * shipping-form rules (utils/addressValidation.js on the frontend) so the two
 * never drift: name >= 2 chars, international-friendly phone, full street
 * address >= 8 chars, city/state >= 2 chars, and a 6-digit India pincode or a
 * 4-12 digit international postcode.
 *
 * Used by the controller for both create and update — the storefront always
 * sends the complete address object, so both paths run the same validation.
 * Throws ApiError(400) with a combined, human-readable message.
 */

const NAME_MIN = 2;
const ADDRESS_MIN = 8;
// Loose, international-friendly phone: optional +/(), digits, spaces/dashes.
const PHONE_RE = /^[+()\d][\s\d()-]{6,16}$/;
const PIN_RE = /^\d{6}$/;
const PIN_INTL_RE = /^\d{4,12}$/;
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'United Arab Emirates', 'Australia'];

/**
 * Validate a full address payload and return a normalized DB-ready object.
 * @param {object} body  request body
 * @returns {object} normalized payload
 *   { name, phone, address, city, state, pincode, country, is_default? }
 * @throws {ApiError} 400 when validation fails
 */
export function validateAddressPayload(body = {}) {
  const errors = [];
  const data = {};

  // --- name ---
  const name = String(body.name ?? '').trim();
  if (!name) {
    errors.push('name is required');
  } else if (name.length < NAME_MIN) {
    errors.push(`name must be at least ${NAME_MIN} characters`);
  } else {
    data.name = name;
  }

  // --- phone ---
  const phone = String(body.phone ?? '').trim();
  if (!phone) {
    errors.push('phone is required');
  } else if (!PHONE_RE.test(phone)) {
    errors.push('phone must be a valid phone number');
  } else {
    data.phone = phone;
  }

  // --- address ---
  const address = String(body.address ?? '').trim();
  if (!address) {
    errors.push('address is required');
  } else if (address.length < ADDRESS_MIN) {
    errors.push('Enter your full street address');
  } else {
    data.address = address;
  }

  // --- city ---
  const city = String(body.city ?? '').trim();
  if (!city) {
    errors.push('city is required');
  } else if (city.length < NAME_MIN) {
    errors.push(`city must be at least ${NAME_MIN} characters`);
  } else {
    data.city = city;
  }

  // --- state ---
  const state = String(body.state ?? '').trim();
  if (!state) {
    errors.push('state is required');
  } else if (state.length < NAME_MIN) {
    errors.push(`state must be at least ${NAME_MIN} characters`);
  } else {
    data.state = state;
  }

  // --- pincode (India = 6 digits, elsewhere = 4-12 digits) ---
  const country = String(body.country ?? 'India').trim() || 'India';
  const pincode = String(body.pincode ?? '').trim();
  if (!pincode) {
    errors.push('pincode is required');
  } else if (country === 'India') {
    if (!PIN_RE.test(pincode)) errors.push('Enter a valid 6-digit pincode');
    else data.pincode = pincode;
  } else {
    if (!PIN_INTL_RE.test(pincode)) errors.push('Enter a valid postcode');
    else data.pincode = pincode;
  }

  // --- country ---
  if (!COUNTRIES.includes(country)) {
    errors.push('Unsupported country');
  } else {
    data.country = country;
  }

  // --- isDefault (optional boolean) ---
  if (body.isDefault !== undefined) {
    data.is_default = Boolean(body.isDefault);
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  return data;
}
