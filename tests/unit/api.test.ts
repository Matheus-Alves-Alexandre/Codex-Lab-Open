import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchManga, getMangaDetails, getMangasByIds } from '../../src/api/manga';
import { getChapter, getMangaChapters } from '../../src/api/chapter';
import { getChapterPages } from '../../src/api/pages';
import { getCoverUrl } from '../../src/api/cover';
import { useReaderStore } from '../../src/store/useReaderStore';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
  vi.stubGlobal('fetch', fetchMock);
});
const url = () => new URL(fetchMock.mock.calls[0][0], 'http://localhost');
describe('MangaDex client', () => {
  it('encodes title and default search parameters', async () => {
    await searchManga('ação & aventura', 20, 10);
    expect(url().pathname).toBe('/api/catalog/manga');
    expect(Object.fromEntries(url().searchParams)).toMatchObject({ title: 'ação & aventura', limit: '10', offset: '20', 'order[followedCount]': 'desc', hasAvailableChapters: 'true' });
  });
  it('preserves custom order and adds cover without duplicating it', async () => {
    await searchManga('', 0, 20, { 'order[rating]': 'asc', 'includes[]': 'cover_art' });
    expect(url().searchParams.has('order[followedCount]')).toBe(false);
    expect(url().searchParams.getAll('includes[]')).toEqual(['cover_art']);
    expect(url().searchParams.has('title')).toBe(false);
  });
  it('includes author, artist and cover for details', async () => {
    await getMangaDetails('id');
    expect(url().pathname).toBe('/api/catalog/manga/id');
    expect(url().searchParams.getAll('includes[]')).toEqual(['author', 'artist', 'cover_art']);
  });
  it('does not request an empty library', async () => {
    expect(await getMangasByIds([])).toEqual({ data: [] }); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('requests all supplied ids', async () => {
    await getMangasByIds(['a', 'b']); expect(url().searchParams.getAll('ids[]')).toEqual(['a', 'b']);
  });
  it('requests ascending chapters and ignores empty languages', async () => {
    await getMangaChapters('id', 100, 50, ['pt-br', '', 'en']);
    expect(url().searchParams.get('order[chapter]')).toBe('asc');
    expect(url().searchParams.getAll('translatedLanguage[]')).toEqual(['pt-br', 'en']);
    expect(url().searchParams.get('offset')).toBe('100');
  });
  it('uses default chapter languages and pagination', async () => {
    await getMangaChapters('id'); expect(url().searchParams.get('limit')).toBe('500');
    expect(url().searchParams.getAll('translatedLanguage[]')).toEqual(['en', 'pt-br']);
  });
  it('requests chapter with manga relation', async () => {
    await getChapter('c'); expect(url().searchParams.get('includes[]')).toBe('manga');
  });
  it('requests page server', async () => {
    await getChapterPages('c'); expect(url().pathname).toBe('/api/catalog/at-home/server/c');
  });
  it.each([() => searchManga('x'), () => getChapter('x'), () => getChapterPages('x')])('propagates HTTP errors', async (request) => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests' });
    await expect(request()).rejects.toThrow('429 Too Many Requests');
  });
});
describe('covers and reader state', () => {
  it.each([undefined, '256', '512'] as const)('builds a proxied cover (%s)', size => {
    const target = new URL(getCoverUrl('id', 'cover.jpg', size), 'http://localhost').searchParams.get('url');
    expect(target).toBe(`https://uploads.mangadex.org/covers/id/cover.jpg${size ? `.${size}.jpg` : ''}`);
  });
  it('returns empty URL without a filename', () => expect(getCoverUrl('id', '')).toBe(''));
  it('updates page state', () => {
    useReaderStore.getState().setCurrentPage(3); expect(useReaderStore.getState().currentPage).toBe(3);
    useReaderStore.getState().setCurrentPage(1);
  });
});
