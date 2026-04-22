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
          if (!id.includes('node_modules')) return undefined;
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('/three/')) return 'three-vendor';
          if (id.includes('/firebase/app')) return 'firebase-core';
          if (id.includes('/firebase/auth')) return 'firebase-auth';
          if (id.includes('/firebase/firestore')) return 'firebase-firestore';
          if (id.includes('/firebase/storage')) return 'firebase-storage';
          if (id.includes('firebase')) return 'firebase-vendor';
          if (id.includes('framer-motion') || id.includes('motion') || id.includes('gsap')) return 'motion-vendor';
          if (id.includes('react')) return 'react-vendor';
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
