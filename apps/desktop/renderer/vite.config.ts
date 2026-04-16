import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, '..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, desktopRoot, '');

  const apiUrl = env.MIRA_API_URL || 'http://localhost:8000';
  const beta = env.BETA || '';
  const browserOAuth = env.VITE_ENABLE_BROWSER_OAUTH || 'false';
  /** Dedicated dev port (avoids clashing with website Vite on 5173 and other common tools). */
  const rendererDevPort = Number(env.MIRA_RENDERER_DEV_PORT || '59247');

  return {
    root: __dirname,
    envDir: desktopRoot,
    base: './',
    plugins: [react()],
    define: {
      'process.env.MIRA_API_URL': JSON.stringify(apiUrl),
      'process.env.BETA': JSON.stringify(beta),
      'process.env.VITE_ENABLE_BROWSER_OAUTH': JSON.stringify(browserOAuth),
    },
    resolve: {
      alias: {
        '@mira/ui': path.resolve(__dirname, '../../../packages/ui/src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: rendererDevPort,
      strictPort: true,
    },
  };
});
