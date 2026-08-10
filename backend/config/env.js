import dotenv from 'dotenv';

// Load .env from the backend root. `dotenv` never overwrites variables that
// are already present in the environment (e.g. set by a host like Render/Vercel).
dotenv.config();

/**
 * Raw environment access. Everything the app reads goes through here so there
 * is a single, greppable place for environment variables.
 */
export function loadEnv() {
  const raw = process.env;

  return {
    NODE_ENV: raw.NODE_ENV || 'development',

    // Server
    PORT: raw.PORT || '3001',
    HOST: raw.HOST || '0.0.0.0',
    LOG_LEVEL: raw.LOG_LEVEL || 'info',

    // Supabase (PostgreSQL)
    SUPABASE_URL: raw.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: raw.SUPABASE_ANON_KEY || '',
    // Optional. When present the backend uses the service-role key (bypasses
    // RLS, intended for server-side use only — never expose in the browser).
    SUPABASE_SERVICE_ROLE_KEY: raw.SUPABASE_SERVICE_ROLE_KEY || '',

    // Cloudinary (image storage)
    CLOUDINARY_CLOUD_NAME: raw.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: raw.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: raw.CLOUDINARY_API_SECRET || '',

    // Legacy admin (existing server.js behavior)
    CORS_ORIGINS: raw.CORS_ORIGINS || '',
    ADMIN_EMAIL: raw.ADMIN_EMAIL || 'admin@unsorted.com',
    ADMIN_PASSWORD: raw.ADMIN_PASSWORD || 'admin123',
    SESSION_SECRET: raw.SESSION_SECRET || 'dev-secret-change-me',
  };
}