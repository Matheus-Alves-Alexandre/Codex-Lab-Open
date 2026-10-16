// Only launched by the local load runner. No real upstream or Firebase SDK.
import express from 'express';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { createApiApp } from '../../server/app';

const config = JSON.parse(process.argv[2]);
let mode = config.upstream || 'healthy';
let calls = 0;
let limited = 0;
const starts: number[] = [];
const atHomeStarts: number[] = [];
let peakRss = process.memoryUsage().rss;
const lag = monitorEventLoopDelay({ resolution: 20 }); lag.enable();
const sampler = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 50);

const upstream: typeof fetch = async input => {
  const url = new URL(String(input));
  // Fail closed if the app ever attempts to change its fixed upstream.
  if (url.origin !== 'https://api.mangadex.org') throw new Error('Unexpected fixture origin');
  calls++;
  const now = performance.now();
  const recent = starts.filter(time => time > now - 1000).length;
  const atHome = url.pathname.startsWith('/at-home/');
  const recentChapters = atHomeStarts.filter(time => time > now - 60000).length;
  starts.push(now); if (atHome) atHomeStarts.push(now);
  if (mode === 'limited' || recent >= 5 || (atHome && recentChapters >= 40)) {
    limited++;
    return Response.json({ error: 'fixture quota exceeded' }, { status: 429, headers: { 'Retry-After': '2' } });
  }
  await new Promise(resolve => setTimeout(resolve, config.latencyMs || 30));
  if (mode === 'offline') throw new Error('Synthetic outage');
  const manga = (i: number) => ({ id: `manga-${i}`, type: 'manga', attributes: {
    title: { en: `Synthetic Manga ${i}` }, description: { en: 'Synthetic load-test content. '.repeat(24) },
    status: 'ongoing', tags: [], originalLanguage: 'ja', contentRating: 'safe',
  }, relationships: [{ id: `cover-${i}`, type: 'cover_art', attributes: { fileName: 'fixture.jpg' } }] });
  let data: unknown;
  if (url.pathname === '/manga') data = { result: 'ok', data: Array.from({ length: Math.min(Number(url.searchParams.get('limit')) || 6, 16) }, (_, i) => manga(i)), total: 100 };
  else if (url.pathname.endsWith('/feed')) data = { result: 'ok', data: [{ id: 'chapter-1', attributes: { chapter: '1', translatedLanguage: 'en' } }], total: 1 };
  else if (atHome) data = { result: 'ok', baseUrl: 'https://fixture.mangadex.network', chapter: { hash: 'synthetic', data: ['1.jpg'], dataSaver: ['1.jpg'] } };
  else if (url.pathname.startsWith('/chapter/')) data = { result: 'ok', data: { id: 'chapter-1', type: 'chapter', relationships: [{ type: 'manga', id: 'manga-1' }] } };
  else data = { result: 'ok', data: manga(1) };
  return Response.json(data);
};

// The load process cannot accidentally fall back to the public Internet.
globalThis.fetch = async () => { throw new Error('External network disabled in load fixture'); };
const app = config.baseline ? express() : createApiApp(upstream, config.gateway);
if (config.baseline) {
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/catalog', async (req, res) => {
    const response = await upstream(new URL(`https://api.mangadex.org${req.url}`));
    res.status(response.status).json(await response.json());
  });
}
const server = app.listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address !== 'string') process.send?.({ type: 'ready', port: address.port });
});
process.on('message', (message: { command: string; mode?: string }) => {
  if (message.command === 'mode') { mode = message.mode!; process.send?.({ type: 'mode' }); }
  if (message.command === 'stats') process.send?.({ type: 'stats', calls, limited,
    peakRssMiB: +(peakRss / 1024 / 1024).toFixed(1), eventLoopP99Ms: +(lag.percentile(99) / 1e6).toFixed(1),
    maxStartsPerSecond: Math.max(0, ...starts.map(time => starts.filter(other => other >= time && other < time + 1000).length)),
  });
  if (message.command === 'stop') {
    clearInterval(sampler); lag.disable(); server.closeAllConnections(); server.close(() => process.exit(0));
  }
});
process.on('disconnect', () => process.exit(0));
