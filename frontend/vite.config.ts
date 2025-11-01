import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const url = `${env.VITE_FRONTEND_URL}:${env.VITE_PORT}`;

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: url,
          changeOrigin: true,
        },
      },
    },
  }
});
