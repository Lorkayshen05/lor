/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { target: 'es2022', sourcemap: false },
  // `npm run dev` with VITE_ORDER_API=/api forwards API calls to the local server (`npm run server`).
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
