import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { securityHeadersDev, securityHeadersProd } from './vite.security-headers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5174,
    headers: securityHeadersDev,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    headers: securityHeadersProd,
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  resolve: {
    alias: {
      // Fuerza resolución de exceljs desde node_modules (evita fallo en build Vite/Rollup)
      exceljs: path.resolve(__dirname, 'node_modules/exceljs'),
    },
  },
  optimizeDeps: {
    include: ['exceljs'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    cssTarget: 'chrome91',
    chunkSizeWarningLimit: 1200,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
}));
