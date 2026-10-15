// @vitest-environment node
import { it, expect, vi, afterEach } from 'vitest';
import handler, { isAllowedImageUrl } from '../../api/image-proxy.js';
afterEach(() => vi.unstubAllGlobals());
it.each([
  undefined, ['https://uploads.mangadex.org/a'], 'bad', 'http://uploads.mangadex.org/a',
  'https://127.0.0.1/a', 'https://localhost/a', 'https://169.254.169.254/a',
  'https://uploads.mangadex.org.evil.test/a', 'https://evil.test/a',
  'https://user:pass@uploads.mangadex.org/a', 'https://uploads.mangadex.org:8080/a',
])('rejects unsafe image origin: %s', value => expect(isAllowedImageUrl(value)).toBe(false));
it.each(['https://uploads.mangadex.org/covers/a.jpg', 'https://node.mangadex.network/data-saver/a.jpg'])('accepts known origin %s', value => expect(isAllowedImageUrl(value)).toBe(true));
const run = async (url: any = 'https://uploads.mangadex.org/a.jpg', method = 'GET') => {
  const res = { status: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis(), setHeader: vi.fn() };
  await handler({ query: { url }, method }, res); return res;
};
it('rejects missing URL without fetching', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  expect((await run('')).status).toHaveBeenCalledWith(400); expect(fetch).not.toHaveBeenCalled();
});
it('rejects repeated URL query parameters', async () => expect((await run(['a', 'b'])).status).toHaveBeenCalledWith(400));
it('rejects POST', async () => expect((await run(undefined, 'POST')).status).toHaveBeenCalledWith(405));
it('returns bytes with safe headers and redirect protection', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'image/jpeg' } }));
  vi.stubGlobal('fetch', fetch); const res = await run();
  expect(res.status).toHaveBeenCalledWith(200); expect(res.send).toHaveBeenCalledWith(Buffer.from([1, 2]));
  expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: 'error', signal: expect.any(AbortSignal) });
});
it.each([['text/html', 415], ['image/svg+xml', 415], ['', 415]])('rejects content type %s', async (type, code) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { headers: { 'content-type': type } })));
  expect((await run()).status).toHaveBeenCalledWith(code);
});
it('rejects oversized declared body', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { headers: { 'content-type': 'image/png', 'content-length': '20000000' } })));
  expect((await run()).status).toHaveBeenCalledWith(413);
});
it('limits streamed body even without content length', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array(16 * 1024 * 1024), { headers: { 'content-type': 'image/png' } })));
  expect((await run()).status).toHaveBeenCalledWith(413);
});
it('maps upstream HTTP failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
  expect((await run()).status).toHaveBeenCalledWith(502);
});
it('handles timeout and network failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
  expect((await run()).status).toHaveBeenCalledWith(502);
});
