import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');

  const apiUrl = env.MIRA_API_URL || 'http://localhost:8000';
  const beta = env.BETA || '';
  // Default on for the website so Google sign-in is visible without a local .env tweak; set VITE_ENABLE_BROWSER_OAUTH=false to hide.
  const browserOAuth = env.VITE_ENABLE_BROWSER_OAUTH === 'false' ? 'false' : 'true';

  return {
    plugins: [react()],
    envDir: __dirname,
    base: '/',
    define: {
      'process.env.MIRA_API_URL': JSON.stringify(apiUrl),
      'process.env.BETA': JSON.stringify(beta),
      'process.env.VITE_ENABLE_BROWSER_OAUTH': JSON.stringify(browserOAuth),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@mira/ui': path.resolve(__dirname, '../../packages/ui/src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      strictPort: true,
    },
  };
});
