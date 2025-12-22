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
      https: {}, // Set to empty object to satisfy Vite 6 types while remaining truthy for SSL
      proxy: {
        '/api/token': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/token/, '')
        }
      }
    },
    plugins: [react(), basicSsl()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.HUGGINGFACE_API_KEY': JSON.stringify(env.HUGGINGFACE_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
