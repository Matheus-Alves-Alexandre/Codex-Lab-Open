export function buildImageUrl(mangaId: string, fileName: string, size?: '512' | '256'): string {
  if (!fileName) return '';
  const suffix = size ? `.${size}.jpg` : '';
  const url = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}${suffix}`;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}
