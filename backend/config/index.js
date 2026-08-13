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
    uploadFolder: env.CLOUDINARY_UPLOAD_FOLDER,
    get configured() {
      return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
    },
  },

  // Admin authentication — JWT (Sprint 15).
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    admin: {
      id: 1,
      email: env.ADMIN_EMAIL,
      // Optional bcrypt hash; login verifies with bcrypt when present.
      passwordHash: env.ADMIN_PASSWORD_HASH,
      // Plaintext fallback (legacy default) used only when no hash is set.
      password: env.ADMIN_PASSWORD,
      name: env.ADMIN_NAME,
      role: env.ADMIN_ROLE,
    },
  },
};