import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import generalAssets from './plugins/general-assets';

export default defineConfig({
  plugins: [solidPlugin(), generalAssets()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
  base: '',
});

