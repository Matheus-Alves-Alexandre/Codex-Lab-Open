// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApiApp } from '../../server/app';
const upstream = vi.fn<typeof fetch>();
beforeEach(() => { upstream.mockReset().mockResolvedValue(Response.json({ data: [] })); });
it('forwards the catalog path and filters to a fixed HTTPS origin', async () => {
  const res = await request(createApiApp(upstream)).get('/api/catalog/manga?title=roots&includes%5B%5D=cover_art').set('Cookie', 'private=secret');
  expect(res.status).toBe(200); expect(res.body).toEqual({ data: [] });
  const [url, options] = upstream.mock.calls[0];
  expect(String(url)).toBe('https://api.mangadex.org/manga?title=roots&includes%5B%5D=cover_art');
  expect(options).toMatchObject({ redirect: 'error', headers: { Accept: 'application/json' } });
  expect(JSON.stringify(options)).not.toContain('private=secret');
});
it('cannot turn a path into an arbitrary upstream', async () => {
  await request(createApiApp(upstream)).get('/api/catalog//evil.test/path');
  expect(new URL(String(upstream.mock.calls[0][0])).origin).toBe('https://api.mangadex.org');
});
it('blocks write methods without contacting the upstream', async () => {
  expect((await request(createApiApp(upstream)).post('/api/catalog/manga')).status).toBe(405); expect(upstream).not.toHaveBeenCalled();
});
it('supports HEAD without a body', async () => {
  const res = await request(createApiApp(upstream)).head('/api/catalog/manga'); expect(res.status).toBe(200); expect(res.text).toBeUndefined();
});
it('preserves HTTP errors and Retry-After for API clients', async () => {
  upstream.mockResolvedValue(Response.json({ error: 'rate limit' }, { status: 429, headers: { 'retry-after': '30' } }));
  const res = await request(createApiApp(upstream)).get('/api/catalog/manga'); expect(res.status).toBe(429); expect(res.headers['retry-after']).toBe('30');
});
it('rejects non-JSON upstream content', async () => {
  upstream.mockResolvedValue(new Response('<html>blocked</html>', { headers: { 'content-type': 'text/html' } }));
  expect((await request(createApiApp(upstream)).get('/api/catalog/manga')).status).toBe(502);
});
it('limits streamed responses', async () => {
  upstream.mockResolvedValue(new Response(new Uint8Array(11 * 1024 * 1024), { headers: { 'content-type': 'application/json' } }));
  const res = await request(createApiApp(upstream)).get('/api/catalog/manga'); expect(res.status).toBe(502); expect(res.body.error).toContain('too large');
});
it('returns a controlled error on upstream failure', async () => {
  upstream.mockRejectedValue(new Error('offline')); const res = await request(createApiApp(upstream)).get('/api/catalog/manga'); expect(res.status).toBe(502); expect(res.body.error).toBe('Catalog proxy unavailable');
});
