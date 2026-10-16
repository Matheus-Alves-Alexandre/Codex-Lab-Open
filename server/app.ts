import express from 'express';
import { createCatalogProxy } from './catalog-proxy';
import imageProxy from '../api/image-proxy.js';
import type { GatewayOptions } from './catalog-gateway';

export function createApiApp(fetchUpstream: typeof fetch = fetch, catalogOptions?: GatewayOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/image-proxy', imageProxy);
  app.use('/api/catalog', createCatalogProxy(fetchUpstream, catalogOptions));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  return app;
}
