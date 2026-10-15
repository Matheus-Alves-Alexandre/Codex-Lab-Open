// Shared by Express and Vercel. Accept only known image origins.
export function isAllowedImageUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      (!url.port || url.port === '443') &&
      (url.hostname === 'uploads.mangadex.org' || url.hostname.endsWith('.mangadex.network'));
  } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed');
  }
  if (!req.query.url) return res.status(400).send('Missing url parameter');
  if (!isAllowedImageUrl(req.query.url)) return res.status(400).send('Invalid image URL');
  const maxBytes = 15 * 1024 * 1024;
  try {
    const response = await fetch(req.query.url, {
      headers: { Referer: 'https://mangadex.org/' },
      redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return res.status(502).send('Upstream image unavailable');
    const contentType = response.headers.get('content-type') || '';
    if (!/^image\/(jpeg|png|gif|webp|avif)(;|$)/i.test(contentType)) {
      await response.body?.cancel();
      return res.status(415).send('Unsupported image type');
    }
    if (Number(response.headers.get('content-length')) > maxBytes) {
      await response.body?.cancel();
      return res.status(413).send('Image too large');
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxBytes) return res.status(413).send('Image too large');
      chunks.push(Buffer.from(chunk));
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    return res.status(200).send(Buffer.concat(chunks));
  } catch { return res.status(502).send('Image proxy failed'); }
}
