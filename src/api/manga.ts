const BASE_URL = "/api/catalog";

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function searchManga(title: string, offset = 0, limit = 20, extraParams?: Record<string, string>) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    "hasAvailableChapters": "true",
  });
  
  if (title) {
    params.append("title", title);
  }
  
  let hasOrder = false;
  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      params.append(key, value);
      if (key.startsWith('order')) hasOrder = true;
    });
  }
  
  if (!hasOrder) {
    params.append("order[followedCount]", "desc");
  }
  
  // Ensure cover_art is always included and prevent duplicates
  const includes = params.getAll("includes[]");
  if (!includes.includes("cover_art")) {
    params.append("includes[]", "cover_art");
  }

  return fetchJson(`${BASE_URL}/manga?${params.toString()}`);
}

export async function getMangaDetails(id: string) {
  const params = new URLSearchParams([
    ["includes[]", "author"],
    ["includes[]", "artist"],
    ["includes[]", "cover_art"],
  ]);
  return fetchJson(`${BASE_URL}/manga/${id}?${params.toString()}`);
}

export async function getMangasByIds(ids: string[]) {
  if (!ids.length) return { data: [] };
  const params = new URLSearchParams();
  ids.forEach(id => params.append('ids[]', id));
  params.append('limit', '100');
  params.append('includes[]', 'cover_art');
  return fetchJson(`${BASE_URL}/manga?${params.toString()}`);
}
