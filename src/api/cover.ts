import { buildImageUrl } from "../utils/buildImageUrl";

export function getCoverUrl(mangaId: string, fileName: string, size?: '512' | '256') {
  return buildImageUrl(mangaId, fileName, size);
}
