import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/market': {
        target: 'https://tbh-market.com',
        changeOrigin: true,
        rewrite: path => path.replace('/api/market', '/api/items'),
      },
    },
  },
});
