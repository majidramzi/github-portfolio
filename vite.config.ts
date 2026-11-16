import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Using relative base ('./') ensures assets load cleanly across:
 * - Project Pages: https://<username>.github.io/<repo-name>/
 * - User / Org Pages: https://<username>.github.io/
 * - Custom Domains: https://portfolio.example.com/
 *
 * Override with VITE_BASE_PATH if an explicit absolute base path is preferred.
 */
export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          markdown: ['marked', 'dompurify'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
