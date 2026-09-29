import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const redirect = (req, res, next) => {
  if (req.url === '/energy-prices' || req.url.startsWith('/energy-prices#')) { res.writeHead(302, { Location: '/energy-prices/' + req.url.slice('/energy-prices'.length) }); res.end(); } else next();
};

export default defineConfig({
  base: '/energy-prices/',
  plugins: [react(), { name: 'energy-prices-dev', configureServer(server) { server.middlewares.use(redirect); }, configurePreviewServer(server) { server.middlewares.use(redirect); } }],
  build: { outDir: 'dist/energy-prices' },
});
