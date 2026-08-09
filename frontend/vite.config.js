import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// UNSORTED static frontend config.
// Dev server proxies data routes to the local Express backend on :3001
// so Sprint 2 can wire up the API without CORS work.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/images': 'http://localhost:3001',
      '/image': 'http://localhost:3001',
      '/admin': 'http://localhost:3001'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020'
  }
});