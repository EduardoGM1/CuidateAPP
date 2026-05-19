import path from 'path';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { securityHeadersDev, securityHeadersProd } from './vite.security-headers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Escribe version.json en dist para detectar nuevos deploys en el cliente. */
function buildVersionPlugin() {
  let buildId = '';
  return {
    name: 'cuidate-build-version',
    buildStart() {
      buildId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    },
    closeBundle() {
      writeFileSync(
        path.resolve(__dirname, 'dist/version.json'),
        JSON.stringify({ buildId, builtAt: new Date().toISOString() }),
        'utf8'
      );
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === 'production' ? buildVersionPlugin() : null].filter(Boolean),
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
    chunkSizeWarningLimit: 1600,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        /**
         * Separa solo librerías muy pesadas para caché y paralelismo.
         * El resto de node_modules queda en chunks compartidos (sin chunk `vendor` genérico
         * que provocaba ciclos con antd/socket.io).
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('exceljs')) return 'vendor-exceljs';
          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('antd') || id.includes('@ant-design')) return 'vendor-antd';
          if (id.includes('@tanstack')) return 'vendor-react-query';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('socket.io')) return 'vendor-socket';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
}));
