// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import request from 'supertest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
it('preserves rewritten nested paths and query filters through the protected adapter', async () => {
  const upstream = vi.fn<typeof fetch>(async () => Response.json({ data: [] }));
  vi.stubGlobal('fetch', upstream);
  const { default: app } = await import('../../api/catalog');
  const response = await request(app).get('/api/catalog?__catalog_path=manga/roots/feed&limit=6&translatedLanguage%5B%5D=en');
  expect(response.status).toBe(200);
  expect(String(upstream.mock.calls[0][0])).toBe('https://api.mangadex.org/manga/roots/feed?limit=6&translatedLanguage%5B%5D=en');
  const cached = await request(app).get('/api/catalog?__catalog_path=manga/roots/feed&limit=6&translatedLanguage%5B%5D=en');
  expect(cached.headers['x-catalog-cache']).toBe('HIT');
  expect(upstream).toHaveBeenCalledTimes(1);
});
it('rejects missing, duplicated and untrusted rewritten paths', async () => {
  const upstream = vi.fn<typeof fetch>(async () => Response.json({ data: [] })); vi.stubGlobal('fetch', upstream);
  const { default: app } = await import('../../api/catalog');
  for (const path of ['', '?__catalog_path=manga&__catalog_path=chapter/one', '?__catalog_path=//evil.test/path']) {
    expect((await request(app).get(`/api/catalog${path}`)).status).toBe(400);
  }
  expect(upstream).not.toHaveBeenCalled();
});
