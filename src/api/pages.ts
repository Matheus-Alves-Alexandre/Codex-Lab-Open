const BASE_URL = "/api/catalog";

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getChapterPages(chapterId: string) {
  return fetchJson(`${BASE_URL}/at-home/server/${chapterId}`);
}
