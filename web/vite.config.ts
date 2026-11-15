import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// media on R2 (see src/lib/media.ts): empty locally, so index.html's %VITE_MEDIA_URL% becomes '' instead of staying as text
process.env.VITE_MEDIA_URL ??= '';

export default defineConfig({
  plugins: [react()],
  // ffmpeg.wasm (video compression in the dashboard) starts its own worker; pre-bundling breaks it
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000', '/uploads': 'http://localhost:4000', '/robots.txt': 'http://localhost:4000', '/sitemap.xml': 'http://localhost:4000' },
  },
});
