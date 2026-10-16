// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CatalogGateway } from '../../server/catalog-gateway';

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] }));
afterEach(() => vi.useRealTimers());
const json = () => Response.json({ data: ['roots'] });
const flush = async () => { await vi.advanceTimersByTimeAsync(1); };

it('rejects authority-like input before contacting any host', async () => {
  const upstream = vi.fn(async () => json()); const gateway = new CatalogGateway(upstream);
  for (const path of ['@evil.test/manga', '//evil.test/manga', '/auth/login']) {
    expect((await gateway.get(path)).status).toBe(400);
  }
  expect(upstream).not.toHaveBeenCalled();
});

it('coalesces 1,000 concurrent identical misses into one upstream request', async () => {
  const upstream = vi.fn(async () => { await new Promise(resolve => setTimeout(resolve, 50)); return json(); });
  const gateway = new CatalogGateway(upstream);
  const requests = Array.from({ length: 1000 }, () => gateway.get('/manga?limit=6'));
  await vi.advanceTimersByTimeAsync(100);
  expect((await Promise.all(requests)).every(result => result.status === 200)).toBe(true);
  expect(upstream).toHaveBeenCalledTimes(1);
  expect(gateway.getStats()).toMatchObject({ coalesced: 999, pending: 0 });
  expect((await gateway.get('/manga?limit=6')).cache).toBe('HIT');
});

it('paces distinct requests globally and applies a separate AtHome budget', async () => {
  const starts: { time: number; url: string }[] = [];
  const gateway = new CatalogGateway(async url => { starts.push({ time: performance.now(), url: String(url) }); return json(); });
  const tasks = ['/at-home/server/one', '/at-home/server/two', '/manga', '/chapter/one'].map(path => gateway.get(path));
  await vi.advanceTimersByTimeAsync(2000); await Promise.all(tasks);
  expect(starts).toHaveLength(4);
  for (let i = 1; i < starts.length; i++) expect(starts[i].time - starts[i - 1].time).toBeGreaterThanOrEqual(275);
  const atHome = starts.filter(start => start.url.includes('/at-home/'));
  expect(atHome[1].time - atHome[0].time).toBeGreaterThanOrEqual(1550);
  expect(starts[1].url).toContain('/manga');
});

it('normalizes parameter order without merging distinct searches', async () => {
  const upstream = vi.fn(async () => json()); const gateway = new CatalogGateway(upstream);
  await gateway.get('/manga?title=roots&limit=6');
  expect((await gateway.get('/manga?limit=6&title=roots')).cache).toBe('HIT');
  const next = gateway.get('/manga?title=other&limit=6'); await vi.advanceTimersByTimeAsync(300); await next;
  expect(upstream).toHaveBeenCalledTimes(2);
});

it('bounds active upstream work during slow distinct requests', async () => {
  let active = 0; let peak = 0;
  const gateway = new CatalogGateway(async () => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 1500));
    active--; return json();
  });
  const tasks = Array.from({ length: 8 }, (_, i) => gateway.get(`/manga?title=${i}`));
  await vi.advanceTimersByTimeAsync(5000);
  expect((await Promise.all(tasks)).every(result => result.status === 200)).toBe(true);
  expect(peak).toBe(4);
  expect(gateway.getStats()).toMatchObject({ pending: 0, active: 0 });
});

it('does not shorten an existing long cooldown when another request also gets limited', async () => {
  const gateway = new CatalogGateway(async url => {
    const first = String(url).includes('first');
    await new Promise(resolve => setTimeout(resolve, first ? 500 : 300));
    return Response.json({}, { status: 429, headers: { 'Retry-After': first ? '7200' : '2' } });
  });
  const first = gateway.get('/manga?title=first'); const second = gateway.get('/manga?title=second');
  await vi.advanceTimersByTimeAsync(1000); await first; await second;
  expect(Number((await gateway.get('/manga?title=third')).retryAfter)).toBeGreaterThan(7000);
});

it('bounds pending unique work, follower count and queue wait', async () => {
  const gateway = new CatalogGateway(async () => { await new Promise(resolve => setTimeout(resolve, 100)); return json(); },
    { maxPending: 2, maxFollowers: 2, intervalMs: 500, maxWaitMs: 50 });
  const first = gateway.get('/manga?title=one');
  const follower = gateway.get('/manga?title=one');
  expect((await gateway.get('/manga?title=one')).status).toBe(503);
  const second = gateway.get('/manga?title=two');
  expect((await gateway.get('/manga?title=three')).status).toBe(503);
  await vi.advanceTimersByTimeAsync(200);
  expect((await second).status).toBe(503); expect((await first).status).toBe(200); await follower;
  expect(gateway.getStats().pending).toBe(0);
});

it.each([429, 403])('pauses the whole gateway after upstream %i and resumes after cooldown', async status => {
  const upstream = vi.fn(async () => json()).mockResolvedValueOnce(Response.json({ error: 'limited' }, { status, headers: { 'Retry-After': '2' } }));
  const gateway = new CatalogGateway(upstream);
  const first = gateway.get('/manga'); const queued = gateway.get('/chapter/one');
  expect((await first).status).toBe(status); await flush();
  expect((await queued).status).toBe(503);
  expect((await gateway.get('/chapter/two')).retryAfter).toBe('2');
  expect(upstream).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(2100);
  expect((await gateway.get('/chapter/two')).status).toBe(200);
});

it('honors MangaDex epoch cooldown and a missing-header default even for HTML errors', async () => {
  const upstream = vi.fn(async () => new Response('blocked', { status: 429, headers: {
    'x-ratelimit-retry-after': String(Math.ceil(Date.now() / 1000) + 30),
  } }));
  const gateway = new CatalogGateway(upstream);
  expect((await gateway.get('/manga')).status).toBe(502);
  expect(Number((await gateway.get('/manga?title=next')).retryAfter)).toBeGreaterThanOrEqual(29);
  expect(upstream).toHaveBeenCalledTimes(1);
  const fallback = new CatalogGateway(async () => new Response('blocked', { status: 403 }));
  await fallback.get('/manga');
  expect((await fallback.get('/manga')).retryAfter).toBe('60');
});

it('serves stale metadata during an outage with only one background refresh', async () => {
  const upstream = vi.fn(async () => json());
  const gateway = new CatalogGateway(upstream, { ttlMs: 100, staleMs: 500, intervalMs: 1 });
  await gateway.get('/manga'); await vi.advanceTimersByTimeAsync(101);
  upstream.mockRejectedValue(new Error('offline'));
  const results = await Promise.all(Array.from({ length: 100 }, () => gateway.get('/manga')));
  await flush();
  expect(results.every(result => result.status === 200 && result.cache === 'STALE')).toBe(true);
  expect(upstream).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(600);
  expect((await gateway.get('/manga')).status).toBe(502);
});

it('never serves stale chapter server addresses', async () => {
  const upstream = vi.fn(async () => json());
  const gateway = new CatalogGateway(upstream, { intervalMs: 1, atHomeIntervalMs: 1, ttlMs: 10, staleMs: 1000 });
  await gateway.get('/at-home/server/chapter'); await vi.advanceTimersByTimeAsync(11);
  upstream.mockRejectedValue(new Error('offline'));
  expect((await gateway.get('/at-home/server/chapter')).status).toBe(502);
});

it('bounds cache bytes and entries using LRU eviction', async () => {
  const gateway = new CatalogGateway(async () => json(), { intervalMs: 1, maxCacheEntries: 2, maxCacheBytes: 60 });
  for (let i = 0; i < 10; i++) { const task = gateway.get(`/manga?title=${i}`); await flush(); await task; }
  expect(gateway.getStats().cachedEntries).toBeLessThanOrEqual(2);
  expect(gateway.getStats().cacheBytes).toBeLessThanOrEqual(60);
  expect((await gateway.get('/manga?title=9')).cache).toBe('HIT');
});

it('does not cache errors or malformed JSON and rejects oversized URLs', async () => {
  const upstream = vi.fn(async () => Response.json({ error: 'missing' }, { status: 404 }));
  const gateway = new CatalogGateway(upstream, { intervalMs: 1 });
  await gateway.get('/manga'); const task = gateway.get('/manga'); await flush(); await task;
  expect(upstream).toHaveBeenCalledTimes(2); expect(gateway.getStats().cachedEntries).toBe(0);
  upstream.mockResolvedValue(new Response('{broken', { headers: { 'Content-Type': 'application/json' } }));
  const bad = gateway.get('/manga'); await flush(); expect((await bad).status).toBe(502);
  expect((await gateway.get(`/manga?title=${'x'.repeat(2050)}`)).status).toBe(414);
});
