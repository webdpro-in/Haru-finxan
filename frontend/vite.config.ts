import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Asset optimization for CDN
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'pixi-vendor': ['pixi.js', 'pixi-live2d-display-lipsyncpatch'],
          'markdown-vendor': ['react-markdown', 'remark-gfm'],
        },
        // Asset naming with content hash for cache busting
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const ext = info?.[info.length - 1];
          
          // Keep Live2D model files in their original structure
          if (assetInfo.name?.includes('haru_greeter_pro_jp')) {
            return 'assets/[name][extname]';
          }
          
          // Images and fonts with content hash
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext || '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|ttf|otf|eot/i.test(ext || '')) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          
          // Other assets
          return 'assets/[name]-[hash][extname]';
        },
        // JS chunks with content hash
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Compression settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    // Asset size warnings
    chunkSizeWarningLimit: 1000, // 1MB
  },
});
