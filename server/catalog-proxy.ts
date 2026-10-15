import type { RequestHandler } from 'express';

// Fixed-origin, read-only JSON proxy. No glob matching or forwarded credentials.
export function createCatalogProxy(fetchUpstream: typeof fetch = fetch): RequestHandler {
  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    try {
      const url = new URL(`https://api.mangadex.org${req.url}`);
      const response = await fetchUpstream(url, {
        method: req.method,
        headers: { Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
      if (req.method === 'HEAD') {
        await response.body?.cancel();
        res.status(response.status).end();
        return;
      }
      const contentType = response.headers.get('content-type') || '';
      if (!/^application\/json(;|$)/i.test(contentType)) {
        await response.body?.cancel();
        res.status(502).json({ error: 'Invalid catalog response' });
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      const reader = response.body?.getReader();
      if (!reader) { res.status(502).json({ error: 'Empty catalog response' }); return; }
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 10 * 1024 * 1024) {
          await reader.cancel();
          res.status(502).json({ error: 'Catalog response too large' });
          return;
        }
        chunks.push(Buffer.from(value));
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter) res.setHeader('Retry-After', retryAfter);
      res.status(response.status).send(Buffer.concat(chunks));
    } catch {
      res.status(502).json({ error: 'Catalog proxy unavailable' });
    }
  };
}
