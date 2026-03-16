import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_SURREALDB_URL': JSON.stringify(env.VITE_SURREALDB_URL),
      'process.env.VITE_SURREALDB_NS': JSON.stringify(env.VITE_SURREALDB_NS),
      'process.env.VITE_SURREALDB_DB': JSON.stringify(env.VITE_SURREALDB_DB),
      'process.env.VITE_SURREALDB_USER': JSON.stringify(env.VITE_SURREALDB_USER),
      'process.env.VITE_SURREALDB_PASS': JSON.stringify(env.VITE_SURREALDB_PASS),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
