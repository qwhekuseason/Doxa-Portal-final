import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      },
      https: {},
      proxy: {
        '/api/token': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/token/, '')
        },
        '/api/generateQuiz': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/generateQuiz/, '/generateQuiz')
        },
        '/api/generateInsight': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/generateInsight/, '/generateInsight')
        },
        '/api/generateChatResponse': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/generateChatResponse/, '/generateChatResponse')
        }
      }
    },
    plugins: [react(), basicSsl()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      chunkSizeWarningLimit: 1500, // Agora SDK is ~1.3MB, we've already split it into its own chunk
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Split Firebase into its own chunk
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            // Split Agora SDK into its own chunk
            if (id.includes('agora')) {
              return 'vendor-agora';
            }
            // Split Lucide icons into its own chunk
            if (id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            // Split React and core libraries
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-core';
            }
          }
        }
      }
    }
  };
});
