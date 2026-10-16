import assert from 'node:assert/strict';
import http from 'node:http';
import { fork, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';

// This runner only starts its own loopback fixture. It accepts NO target URL.
const args = process.argv.slice(2);
const usersArg = args.find(arg => arg.startsWith('--users='));
const soakArg = args.find(arg => arg.startsWith('--soak-seconds='));
const scenarioArg = args.find(arg => arg.startsWith('--scenario='));
const selectedScenario = scenarioArg?.split('=')[1];
assert.ok(args.every(arg => arg === usersArg || arg === soakArg || arg === scenarioArg), 'Only --users, --soak-seconds and --scenario are supported; external targets are prohibited');
const users = Number(usersArg?.split('=')[1] || 1000);
const soakSeconds = Number(soakArg?.split('=')[1] || 0);
assert.ok(Number.isInteger(users) && users >= 1 && users <= 1000, 'Users must be between 1 and 1,000');
assert.ok(Number.isInteger(soakSeconds) && soakSeconds >= 0 && soakSeconds <= 120, 'Soak duration must be 0–120 seconds');
const home = [
  'limit=1&order%5Brating%5D=desc&includes%5B%5D=author',
  'limit=16&order%5BlatestUploadedChapter%5D=desc',
  'limit=6&order%5BfollowedCount%5D=desc',
  'limit=6&order%5Brelevance%5D=desc&originalLanguage%5B%5D=ja',
  'limit=6&order%5Brating%5D=desc&year=2024',
  'limit=6&order%5BcreatedAt%5D=desc',
].map(query => `/api/catalog/manga?${query}&offset=0&hasAvailableChapters=true&includes%5B%5D=cover_art`);
const reader = ['/api/catalog/manga/manga-1', '/api/catalog/manga/manga-1/feed', '/api/catalog/chapter/chapter-1', '/api/catalog/at-home/server/chapter-1'];
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const percentile = (values: number[], fraction: number) => +[...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * fraction))].toFixed(1);
const report: any = { createdAt: new Date().toISOString(), node: process.version, platform: `${os.platform()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, users, maxSockets: 1000,
  scope: 'Local HTTP catalog API only; synthetic upstream with enforced quotas; no browsers, images, Firebase, CDN or production infrastructure.', scenarios: [] };

function message(child: ChildProcess, type: string, command?: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error(`Fixture ${type} timeout`)), 20000);
    const onMessage = (value: any) => { if (value.type === type) finish(undefined, value); };
    const onExit = () => finish(new Error(`Fixture exited before ${type}`));
    function finish(error?: Error, value?: any) {
      clearTimeout(timer); child.off('message', onMessage); child.off('exit', onExit);
      if (error) reject(error); else resolve(value);
    }
    child.on('message', onMessage); child.once('exit', onExit);
    if (command) child.send(command);
  });
}

async function scenario(name: string, config: object, paths: (user: number) => string[], options: { warm?: boolean; outage?: boolean; overload?: boolean; baseline?: boolean; limited?: boolean; soak?: boolean } = {}) {
  const child = fork(new URL('../tests/load/fixture-server.ts', import.meta.url), [JSON.stringify(config)], {
    execArgv: ['--import', 'tsx'], stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  });
  // The default maxFreeSockets=256 churns hundreds of connections per burst,
  // exhausting Windows ephemeral ports during a soak (EADDRINUSE).
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1000, maxFreeSockets: 1000, scheduling: 'fifo' });
  const healthAgent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  let healthTimer: ReturnType<typeof setInterval> | undefined;
  const failureReasons: Record<string, number> = {};
  const seenSockets = new WeakSet();
  let connectionsCreated = 0; let reusedConnections = 0;
  let port: number;
  async function get(path: string) {
    const start = performance.now();
    return new Promise<{ status: number; ms: number; cache?: string; bytes: number }>(resolve => {
      let done = false;
      const complete = (status: number, cache?: string, bytes = 0, reason?: string) => {
        if (!done) {
          done = true;
          if (reason) failureReasons[reason] = (failureReasons[reason] || 0) + 1;
          resolve({ status, cache, bytes, ms: performance.now() - start });
        }
      };
      const req = http.get({ hostname: '127.0.0.1', port, path, agent: path === '/api/health' ? healthAgent : agent }, res => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          try {
            const json = JSON.parse(body.toString());
            assert.ok(res.statusCode !== 200 || json.data !== undefined || json.status === 'ok' || json.chapter, 'Invalid success payload');
            complete(res.statusCode!, String(res.headers['x-catalog-cache'] || ''), body.length);
          } catch { complete(0, undefined, body.length, 'invalid-json-or-payload'); }
        });
        res.on('error', (error: NodeJS.ErrnoException) => complete(0, undefined, 0, `response:${error.code || error.message}`));
      });
      req.setTimeout(20000, () => req.destroy(new Error('load request timeout')));
      req.on('socket', socket => {
        if (path === '/api/health') return;
        if (seenSockets.has(socket)) reusedConnections++;
        else { seenSockets.add(socket); connectionsCreated++; }
      });
      req.on('error', (error: NodeJS.ErrnoException) => complete(0, undefined, 0,
        `request:${error.code || error.message}:reused=${req.reusedSocket}`));
    });
  }
  try {
    ({ port } = await message(child, 'ready'));
    if (options.warm) {
      assert.ok((await Promise.all(paths(0).map(get))).every(result => result.status === 200), 'Warm-up failed');
    }
    if (options.outage) { await delay(50); await message(child, 'mode', { command: 'mode', mode: 'offline' }); }
    const before = await message(child, 'stats', { command: 'stats' });
    const started = performance.now();
    const outcomes: Awaited<ReturnType<typeof get>>[] = [];
    const journeys: number[] = [];
    const healthChecks: ReturnType<typeof get>[] = [];
    healthTimer = setInterval(() => { healthChecks.push(get('/api/health')); }, 200);
    const clients = Array.from({ length: users }, async (_, user) => {
      do {
        const start = performance.now();
        outcomes.push(...await Promise.all(paths(user).map(get)));
        journeys.push(performance.now() - start);
        if (options.soak) await delay(1000);
      } while (options.soak && performance.now() - started < soakSeconds * 1000);
    });
    await Promise.all(clients);
    clearInterval(healthTimer);
    const durationMs = performance.now() - started;
    if (options.outage) await delay(1800); // Observe actual failed background refreshes.
    const health = await get('/api/health');
    const healthResults = await Promise.all(healthChecks);
    assert.ok(healthResults.every(result => result.status === 200), 'Health must stay available during load');
    const stats = await message(child, 'stats', { command: 'stats' });
    const statuses: Record<string, number> = {};
    const caches: Record<string, number> = {};
    for (const result of outcomes) { statuses[result.status] = (statuses[result.status] || 0) + 1; caches[result.cache!] = (caches[result.cache!] || 0) + 1; }
    const result = { name, requests: outcomes.length, statuses, caches, failureReasons, connectionsCreated, reusedConnections,
      durationMs: +durationMs.toFixed(1), requestP95Ms: percentile(outcomes.map(r => r.ms), .95),
      journeyP95Ms: percentile(journeys, .95), requestsPerSecond: +(outcomes.length / durationMs * 1000).toFixed(1),
      responseMiB: +(outcomes.reduce((sum, r) => sum + r.bytes, 0) / 1024 / 1024).toFixed(1),
      upstreamRequests: stats.calls - before.calls, upstream429s: stats.limited - before.limited,
      maxUpstreamStartsPerSecond: stats.maxStartsPerSecond, peakServerRssMiB: stats.peakRssMiB,
      serverEventLoopP99Ms: stats.eventLoopP99Ms, healthMs: +health.ms.toFixed(1),
      healthChecksDuringLoad: healthResults.length,
      healthP95Ms: percentile([...healthResults, health].map(result => result.ms), .95), passed: false };
    report.scenarios.push(result);
    assert.equal(health.status, 200, `${name}: health failed`);
    assert.equal(statuses[0] || 0, 0, `${name}: transport or invalid payload errors`);
    if (options.baseline) assert.ok((statuses[429] || 0) > 0, 'Baseline must demonstrate quota pressure');
    else if (options.overload) {
      assert.ok(Object.keys(statuses).every(status => status === '200' || status === '503'));
      if (users > 32) assert.ok(statuses[503] > 0, 'High-cardinality overload must be bounded');
      assert.equal(result.upstream429s, 0);
    } else if (options.limited) {
      assert.ok(Object.keys(statuses).every(status => status === '429' || status === '503'));
      assert.equal(result.upstreamRequests, 1, 'Cooldown must suppress further calls');
    } else {
      assert.equal(statuses[200], outcomes.length, `${name}: every journey must succeed`);
      assert.equal(result.upstream429s, 0);
      if (options.outage) assert.ok(result.upstreamRequests > 0, 'Outage fixture must actually be exercised');
      assert.ok(result.requestP95Ms < 10000, `${name}: p95 exceeded the local regression budget`);
      if (!options.soak && !options.outage) assert.equal(result.upstreamRequests, options.warm ? 0 : paths(0).length, 'Requests must be coalesced/cached');
    }
    if (!options.baseline) assert.ok(stats.maxStartsPerSecond <= 4, 'Global outbound pacing exceeded');
    result.passed = true;
    console.log(`${name}: ${outcomes.length} requests, HTTP ${JSON.stringify(statuses)}, p95 ${result.requestP95Ms}ms, upstream ${result.upstreamRequests}, ${result.peakServerRssMiB}MiB RSS`);
  } finally {
    clearInterval(healthTimer);
    healthAgent.destroy();
    agent.destroy();
    if (child.connected) { const exited = once(child, 'exit'); child.send({ command: 'stop' }); await exited; }
    else child.kill();
  }
}

try {
  const scenarios: Record<string, () => Promise<void>> = {
    'baseline-home-without-protection': () => scenario('baseline-home-without-protection', { baseline: true }, () => home, { baseline: true }),
    'cold-home': () => scenario('cold-home', {}, () => home),
    'warm-home': () => scenario('warm-home', {}, () => home, { warm: true }),
    'popular-reader-journey': () => scenario('popular-reader-journey', {}, () => [...home, ...reader]),
    'slow-upstream': () => scenario('slow-upstream', { latencyMs: 800 }, () => home),
    'stale-home-during-outage': () => scenario('stale-home-during-outage', { gateway: { ttlMs: 20 } }, () => home, { warm: true, outage: true }),
    'upstream-429-cooldown': () => scenario('upstream-429-cooldown', { upstream: 'limited' }, () => [home[0]], { limited: true }),
    'unique-search-overload': () => scenario('unique-search-overload', {}, user => [`/api/catalog/manga?title=unique-${user}&limit=6`], { overload: true }),
  };
  if (soakSeconds) scenarios['warm-home-soak'] = () => scenario('warm-home-soak', {}, () => home, { warm: true, soak: true });
  assert.ok(!selectedScenario || scenarios[selectedScenario], 'Unknown scenario, or soak requested without --soak-seconds');
  for (const [name, run] of Object.entries(scenarios)) if (!selectedScenario || name === selectedScenario) await run();
} catch (error) {
  report.error = String(error); process.exitCode = 1;
  console.error(error);
} finally {
  await mkdir('test-results/load', { recursive: true });
  const serialized = JSON.stringify(report, null, 2) + '\n';
  await writeFile('test-results/load/latest.json', serialized);
  if (report.scenarios.some((result: { name: string }) => result.name === 'warm-home-soak')) {
    await writeFile('test-results/load/soak.json', serialized);
  }
  console.log('Load report: test-results/load/latest.json');
}
