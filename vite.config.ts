import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('vite/preload-helper')) return 'vite-preload-helper';
          if (!id.includes('node_modules')) return undefined;
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('@splinetool')) return 'spline-vendor';
          if (normalizedId.includes('/firebase/app')) return 'firebase-core';
          if (normalizedId.includes('/firebase/auth')) return 'firebase-auth';
          if (normalizedId.includes('/firebase/firestore')) return 'firebase-firestore';
          if (normalizedId.includes('/firebase/storage')) return 'firebase-storage';
          if (normalizedId.includes('firebase')) return 'firebase-vendor';
          if (
            normalizedId.includes('framer-motion') ||
            normalizedId.includes('/motion-dom/') ||
            normalizedId.includes('/motion-utils/')
          ) return 'motion-vendor';
          return 'vendor';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
