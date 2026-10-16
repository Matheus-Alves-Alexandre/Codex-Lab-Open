// @vitest-environment node
import { it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
const require = createRequire(import.meta.url);
const cliRequire = createRequire(require.resolve('firebase-tools/package.json'));
it('Firebase CLI watcher still observes literal rules files after the Chokidar override', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'codex-rules-'));
  const file = join(dir, 'firestore.rules'); await writeFile(file, 'initial');
  const watcher = cliRequire('chokidar').watch(file, { persistent: true, ignoreInitial: true });
  try {
    await once(watcher, 'ready');
    const changed = once(watcher, 'change', { signal: AbortSignal.timeout(4000) });
    await writeFile(file, 'updated rules'); expect((await changed)[0]).toBe(file);
  } finally { await watcher.close(); await rm(dir, { recursive: true, force: true }); }
});
it('Firebase CLI gaxios can still construct multipart uploads with the patched uuid', async () => {
  const { Gaxios } = cliRequire('gaxios');
  let contentType = '';
  const response = await new Gaxios().request({
    url: 'https://example.test/upload', method: 'POST',
    multipart: [{ headers: { 'Content-Type': 'application/json' }, body: '{"test":true}' }],
    adapter: async (options: any) => {
      contentType = options.headers['Content-Type'];
      return { status: 200, statusText: 'OK', headers: {}, config: options, data: 'ok' };
    },
  });
  expect(response.data).toBe('ok'); expect(contentType).toMatch(/^multipart\/related; boundary=[0-9a-f-]{36}$/);
});
it('Firebase CLI PubSub initializes tracing with the patched OpenTelemetry core', async () => {
  const { PubSub } = cliRequire('@google-cloud/pubsub');
  const pubsub = new PubSub({ projectId: 'demo-codex-lab' });
  expect(pubsub.topic('test-topic').name).toBe('projects/demo-codex-lab/topics/test-topic');
  await pubsub.close();
}, 20000); // Cold SDK module loading under coverage can exceed five seconds on Windows.
