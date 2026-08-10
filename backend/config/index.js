import { loadEnv } from './env.js';

const env = loadEnv();

/**
 * Centralized, typed application configuration. Single import point for any
 * module that needs configuration — never read process.env directly outside
 * this folder.
 */
export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',

  server: {
    port: Number(env.PORT) || 3001,
    host: env.HOST,
    logLevel: env.LOG_LEVEL,
  },

  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY,
    get configured() {
      return Boolean(env.SUPABASE_URL && (env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY));
    },
  },

  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    get configured() {
      return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
    },
  },

  cors: {
    origins: env.CORS_ORIGINS,
  },

  // Legacy admin section (kept for the existing server.js admin routes).
  admin: {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  },

  session: {
    secret: env.SESSION_SECRET,
  },
};