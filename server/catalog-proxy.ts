import type { RequestHandler } from 'express';
import { CatalogGateway, type GatewayOptions } from './catalog-gateway';

export function createCatalogProxy(fetchUpstream: typeof fetch = fetch, options?: GatewayOptions): RequestHandler {
  const gateway = new CatalogGateway(fetchUpstream, options);
  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    try {
      const result = await gateway.get(req.url);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Catalog-Cache', result.cache);
      res.setHeader('Cache-Control', result.status === 200 && result.cache !== 'STALE' && !req.path.startsWith('/at-home/')
        ? 'public, max-age=15, s-maxage=30' : 'no-store');
      if (result.retryAfter) res.setHeader('Retry-After', result.retryAfter);
      res.status(result.status);
      if (req.method === 'HEAD') res.end();
      else res.send(result.body);
    } catch { res.status(502).json({ error: 'Catalog proxy unavailable' }); }
  };
}
