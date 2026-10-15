const BASE_URL = "/api/catalog";

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getMangaChapters(id: string, offset = 0, limit = 500, languages: string[] = ['en', 'pt-br']) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    "order[chapter]": "asc",
  });
  
  languages.forEach(lang => {
    if (lang) params.append("translatedLanguage[]", lang);
  });

  return fetchJson(`${BASE_URL}/manga/${id}/feed?${params.toString()}`);
}

export async function getChapter(id: string) {
  const params = new URLSearchParams();
  params.append("includes[]", "manga");
  return fetchJson(`${BASE_URL}/chapter/${id}?${params.toString()}`);
}
