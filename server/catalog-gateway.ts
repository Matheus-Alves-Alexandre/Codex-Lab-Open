export interface CatalogResult {
  status: number;
  body: Buffer;
  retryAfter?: string;
  cache: 'HIT' | 'MISS' | 'SHARED' | 'STALE' | 'BYPASS';
}
interface CacheEntry { result: CatalogResult; freshUntil: number; staleUntil: number }
interface Job {
  key: string;
  url: URL;
  atHome: boolean;
  deadline: number;
  followers: number;
  promise: Promise<CatalogResult>;
  resolve: (result: CatalogResult) => void;
}
export interface GatewayOptions {
  intervalMs?: number;
  atHomeIntervalMs?: number;
  maxPending?: number;
  maxConcurrent?: number;
  maxWaitMs?: number;
  maxFollowers?: number;
  maxCacheBytes?: number;
  maxCacheEntries?: number;
  ttlMs?: number;
  staleMs?: number;
  timeoutMs?: number;
}
const failure = (status: number, error: string, retryAfter?: string): CatalogResult => ({
  status, body: Buffer.from(JSON.stringify({ error })), retryAfter, cache: 'BYPASS',
});

// One instance must own all MangaDex traffic for an egress IP. These limits are
// process-local; adding replicas requires a shared cache AND a global scheduler.
export class CatalogGateway {
  private cache = new Map<string, CacheEntry>();
  private pending = new Map<string, Job>();
  private queue: Job[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private active = 0;
  private bytes = 0;
  private nextStart = 0;
  private nextAtHome = 0;
  private cooldownUntil = 0;
  private counters = { upstreamRequests: 0, cacheHits: 0, coalesced: 0, staleHits: 0, rejected: 0 };
  private options: Required<GatewayOptions>;

  constructor(private fetchUpstream: typeof fetch = fetch, options: GatewayOptions = {}) {
    this.options = {
      intervalMs: 275, atHomeIntervalMs: 1550, maxPending: 32,
      maxConcurrent: 4, maxWaitMs: 5000, maxFollowers: 2000,
      maxCacheBytes: 32 * 1024 * 1024, maxCacheEntries: 256,
      ttlMs: 60000, staleMs: 15 * 60000, timeoutMs: 15000, ...options,
    };
  }

  getStats() {
    return { ...this.counters, pending: this.pending.size, active: this.active,
      cachedEntries: this.cache.size, cacheBytes: this.bytes };
  }

  async get(path: string): Promise<CatalogResult> {
    if (path.length > 2048) return failure(414, 'Catalog URL too long');
    if (!path.startsWith('/')) return failure(400, 'Invalid catalog path');
    const url = new URL(`https://api.mangadex.org${path}`);
    if (!/^\/(manga(?:\/[a-z0-9-]+(?:\/feed)?)?|chapter\/[a-z0-9-]+|at-home\/server\/[a-z0-9-]+)$/i.test(url.pathname)) {
      return failure(400, 'Unsupported catalog endpoint');
    }
    url.searchParams.sort();
    const key = url.pathname + url.search;
    const now = performance.now();
    const cached = this.cache.get(key);
    if (cached && cached.staleUntil > now) {
      this.cache.delete(key); this.cache.set(key, cached);
      if (cached.freshUntil > now) {
        this.counters.cacheHits++;
        return { ...cached.result, cache: 'HIT' };
      }
      this.counters.staleHits++;
      void this.enqueue(key, url);
      return { ...cached.result, cache: 'STALE' };
    }
    if (cached) this.evict(key);
    return this.enqueue(key, url);
  }

  private enqueue(key: string, url: URL): Promise<CatalogResult> {
    const existing = this.pending.get(key);
    if (existing) {
      if (existing.followers >= this.options.maxFollowers) return Promise.resolve(this.busy());
      existing.followers++;
      this.counters.coalesced++;
      return existing.promise.then(result => ({ ...result, cache: 'SHARED' }));
    }
    const remaining = this.cooldownUntil - performance.now();
    if (remaining > 0) return Promise.resolve(this.busy(Math.ceil(remaining / 1000)));
    if (this.pending.size >= this.options.maxPending) return Promise.resolve(this.busy());
    let resolve!: Job['resolve'];
    const promise = new Promise<CatalogResult>(done => { resolve = done; });
    const job: Job = { key, url, atHome: url.pathname.startsWith('/at-home/'),
      deadline: performance.now() + this.options.maxWaitMs, followers: 1, promise, resolve };
    this.pending.set(key, job); this.queue.push(job);
    this.pump();
    return promise;
  }

  private busy(seconds = 2) {
    this.counters.rejected++;
    return failure(503, 'Catalog busy; retry later', String(seconds));
  }

  private pump() {
    if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
    const now = performance.now();
    this.queue = this.queue.filter(job => {
      if (job.deadline > now && now >= this.cooldownUntil) return true;
      this.pending.delete(job.key);
      job.resolve(this.busy(Math.max(2, Math.ceil((this.cooldownUntil - now) / 1000))));
      return false;
    });
    if (!this.queue.length) return;
    const index = this.queue.findIndex(job => !job.atHome || now >= this.nextAtHome);
    if (this.active < this.options.maxConcurrent && now >= this.nextStart && index >= 0) {
      const [job] = this.queue.splice(index, 1);
      this.active++;
      this.nextStart = now + this.options.intervalMs;
      if (job.atHome) this.nextAtHome = now + this.options.atHomeIntervalMs;
      void this.execute(job).then(result => {
        this.active--; this.pending.delete(job.key); job.resolve(result); this.pump();
      });
    }
    if (this.queue.length) {
      const deadline = Math.min(...this.queue.map(job => job.deadline));
      const ready = Math.max(this.nextStart, this.queue.some(job => !job.atHome) ? now : this.nextAtHome);
      const wake = this.active >= this.options.maxConcurrent ? deadline : Math.min(deadline, ready);
      this.timer = setTimeout(() => { this.timer = undefined; this.pump(); }, Math.max(1, wake - now));
    }
  }

  private async execute(job: Job): Promise<CatalogResult> {
    this.counters.upstreamRequests++;
    try {
      const response = await this.fetchUpstream(job.url, {
        method: 'GET', headers: { Accept: 'application/json' }, redirect: 'error',
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
      let retryAfter = response.headers.get('retry-after') || undefined;
      if (response.status === 429 || response.status === 403) {
        const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) :
          retryAfter ? (Date.parse(retryAfter) - Date.now()) / 1000 :
            Number(response.headers.get('x-ratelimit-retry-after')) - Date.now() / 1000;
        const delay = Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
        this.cooldownUntil = Math.max(this.cooldownUntil, performance.now() + delay * 1000);
        retryAfter = String(Math.ceil(delay));
      }
      const contentType = response.headers.get('content-type') || '';
      if (!/^application\/json(;|$)/i.test(contentType)) {
        await response.body?.cancel();
        return failure(502, 'Invalid catalog response', retryAfter);
      }
      const chunks: Buffer[] = [];
      let size = 0;
      const reader = response.body?.getReader();
      if (!reader) return failure(502, 'Empty catalog response');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 10 * 1024 * 1024) {
          await reader.cancel();
          return failure(502, 'Catalog response too large');
        }
        chunks.push(Buffer.from(value));
      }
      const body = Buffer.concat(chunks);
      try { JSON.parse(body.toString('utf8')); }
      catch { return failure(502, 'Invalid catalog JSON'); }
      const result: CatalogResult = { status: response.status, body, retryAfter, cache: 'MISS' };
      if (response.status === 200 && body.length <= this.options.maxCacheBytes) {
        const ttl = job.atHome ? Math.min(5000, this.options.ttlMs) : this.options.ttlMs;
        const now = performance.now();
        this.evict(job.key);
        while (this.cache.size && (this.bytes + body.length > this.options.maxCacheBytes || this.cache.size >= this.options.maxCacheEntries)) {
          this.evict(this.cache.keys().next().value!);
        }
        this.cache.set(job.key, { result, freshUntil: now + ttl,
          staleUntil: now + ttl + (job.atHome ? 0 : this.options.staleMs) });
        this.bytes += body.length;
      }
      return result;
    } catch { return failure(502, 'Catalog proxy unavailable'); }
  }

  private evict(key: string) {
    const entry = this.cache.get(key);
    if (entry) { this.bytes -= entry.result.body.length; this.cache.delete(key); }
  }
}
