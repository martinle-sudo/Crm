import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// In CI, GitHub Actions exports GITHUB_REPOSITORY="<owner>/<repo>". We use the
// repo name as the base path so the build works on https://<owner>.github.io/<repo>/.
// Override with VITE_BASE if hosting under a different path (e.g. custom domain).
const ghRepo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const basePath = process.env.VITE_BASE ?? (ghRepo ? `/${ghRepo}/` : '/');

export default defineConfig(({ command }) => ({
  base: command === 'build' ? basePath : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          rrule: ['rrule'],
          dnd: ['@dnd-kit/core', '@dnd-kit/utilities'],
          framer: ['framer-motion'],
        },
      },
    },
  },
}));
