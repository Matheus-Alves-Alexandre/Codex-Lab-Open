import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { createApiApp } from './server/app';

const app = createApiApp();
const port = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV !== 'production' && !process.argv.includes('--production')) {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve('dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}
app.listen(port, '0.0.0.0', () => console.log(`Server running on http://localhost:${port}`));
