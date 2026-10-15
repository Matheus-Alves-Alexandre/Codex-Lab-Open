import assert from 'node:assert/strict';
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
async function json(path) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  assert.match(response.headers.get('content-type'), /application\/json/);
  return response.json();
}
assert.equal((await json('/api/health')).status, 'ok');
const result = await json('/api/catalog/manga?limit=1&hasAvailableChapters=true&includes%5B%5D=cover_art');
assert.ok(result.data?.[0]?.id, 'MangaDex must return at least one manga');
const id = result.data[0].id;
assert.equal((await json(`/api/catalog/manga/${id}`)).data.id, id);
const feed = await json(`/api/catalog/manga/${id}/feed?limit=1&order%5Bchapter%5D=asc`);
assert.ok(Array.isArray(feed.data), 'Chapter feed must return an array');
console.log('Live smoke passed: health, catalog, details and chapter feed.');
