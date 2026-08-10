import { getCloudinary } from '../cloudinary/client.js';
import { config } from '../config/index.js';
import { countCategories } from '../repositories/health.repository.js';
import { logger } from '../utils/logger.js';

/**
 * Verifies external service connectivity (Supabase + Cloudinary). Runs once at
 * boot; failures are logged, never fatal — the API stays up.
 */
async function checkSupabase() {
  if (!config.supabase.configured) {
    return { name: 'supabase', status: 'not-configured' };
  }

  const result = await countCategories();
  if (result.ok) {
    logger.info(`Supabase connected (categories: ${result.count})`);
    return { name: 'supabase', status: 'connected' };
  }

  logger.error(`Supabase connection check failed: ${result.reason}`);
  return { name: 'supabase', status: 'error', detail: result.reason };
}

async function checkCloudinary() {
  const cloudinary = getCloudinary();
  if (!cloudinary) {
    return { name: 'cloudinary', status: 'not-configured' };
  }

  try {
    const res = await cloudinary.api.ping();
    logger.info(`Cloudinary connected (${res?.status || 'ok'})`);
    return { name: 'cloudinary', status: 'connected' };
  } catch (err) {
    // The Cloudinary SDK rejects API errors with `{ error: { message } }`
    // (not a plain `Error`), so read the nested message first.
    const message = err?.error?.message || err?.message || String(err);
    logger.error(`Cloudinary connection check failed: ${message}`);
    return { name: 'cloudinary', status: 'error', detail: message };
  }
}

export async function verifyConnections() {
  const [supabase, cloudinary] = await Promise.allSettled([checkSupabase(), checkCloudinary()]);

  return {
    supabase: supabase.status === 'fulfilled' ? supabase.value : { name: 'supabase', status: 'error', detail: String(supabase.reason) },
    cloudinary: cloudinary.status === 'fulfilled' ? cloudinary.value : { name: 'cloudinary', status: 'error', detail: String(cloudinary.reason) },
  };
}