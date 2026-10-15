import { it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useMangaDetail } from '../../src/hooks/useMangaDetail';
import { useChapterFeed } from '../../src/hooks/useChapterFeed';
import { useChapterPages } from '../../src/hooks/useChapterPages';
import { useHomeFeed } from '../../src/hooks/useHomeFeed';
import { useMangaSearch } from '../../src/hooks/useMangaSearch';
import * as mangaApi from '../../src/api/manga';
import * as chapterApi from '../../src/api/chapter';
import * as pagesApi from '../../src/api/pages';
import { manga, chapters } from '../fixtures';
vi.mock('../../src/api/manga'); vi.mock('../../src/api/chapter'); vi.mock('../../src/api/pages');
beforeEach(() => {
  vi.resetAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(mangaApi.getMangaDetails).mockResolvedValue({ data: manga });
  vi.mocked(mangaApi.searchManga).mockResolvedValue({ data: [manga] });
  vi.mocked(chapterApi.getMangaChapters).mockResolvedValue({ data: chapters });
  vi.mocked(pagesApi.getChapterPages).mockResolvedValue({ result: 'ok', baseUrl: 'https://node.mangadex.network', chapter: { hash: 'hash', dataSaver: ['1.jpg', '2.jpg'] } });
});
it('loads manga details and stops the spinner', async () => {
  const { result } = renderHook(() => useMangaDetail('manga-1'));
  await waitFor(() => expect(result.current.loading).toBe(false)); expect(result.current.manga).toEqual(manga);
});
it('handles absent detail id', () => expect(renderHook(() => useMangaDetail(undefined)).result.current.loading).toBe(false));
it('handles detail request failure', async () => {
  vi.mocked(mangaApi.getMangaDetails).mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useMangaDetail('m')); await waitFor(() => expect(result.current.loading).toBe(false)); expect(result.current.manga).toBeNull();
});
it('ignores obsolete manga detail response', async () => {
  let resolve!: (value: any) => void;
  vi.mocked(mangaApi.getMangaDetails).mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const { result, rerender } = renderHook(({ id }) => useMangaDetail(id), { initialProps: { id: 'old' } });
  rerender({ id: 'new' }); await waitFor(() => expect(result.current.manga).toEqual(manga));
  await act(async () => resolve({ data: { ...manga, id: 'old' } })); expect(result.current.manga?.id).toBe('manga-1');
});
it('loads chapters in selected language', async () => {
  const { result } = renderHook(() => useChapterFeed('manga-1', 'pt-br'));
  await waitFor(() => expect(result.current.chapters).toHaveLength(3));
  expect(chapterApi.getMangaChapters).toHaveBeenCalledWith('manga-1', 0, 100, ['pt-br']);
});
it('defaults chapter languages', async () => {
  const { result } = renderHook(() => useChapterFeed('m', '')); await waitFor(() => expect(result.current.loading).toBe(false));
  expect(chapterApi.getMangaChapters).toHaveBeenCalledWith('m', 0, 100, ['en', 'pt-br']);
});
it('handles chapter feed failure', async () => {
  vi.mocked(chapterApi.getMangaChapters).mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useChapterFeed('m', '')); await waitFor(() => expect(result.current.loading).toBe(false)); expect(result.current.chapters).toEqual([]);
});
it('builds reader page URLs', async () => {
  const { result } = renderHook(() => useChapterPages('c')); await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.pages).toHaveLength(2); expect(decodeURIComponent(result.current.pages[0])).toContain('https://node.mangadex.network/data-saver/hash/1.jpg');
});
it.each([
  [{ result: 'ok', chapter: { hash: 'h', dataSaver: [] } }, 'no pages'],
  [{ result: 'error' }, 'Failed to load'],
])('reports invalid page response', async (response, message) => {
  vi.mocked(pagesApi.getChapterPages).mockResolvedValue(response);
  const { result } = renderHook(() => useChapterPages('c')); await waitFor(() => expect(result.current.loading).toBe(false)); expect(result.current.error).toContain(message);
});
it('reports page network errors', async () => {
  vi.mocked(pagesApi.getChapterPages).mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useChapterPages('c')); await waitFor(() => expect(result.current.error).toContain('Network')); expect(result.current.pages).toEqual([]);
});
it('stops loading without a chapter id', () => expect(renderHook(() => useChapterPages(undefined)).result.current.loading).toBe(false));
it('clears previous pages after chapter changes', async () => {
  const { result, rerender } = renderHook(({ id }) => useChapterPages(id), { initialProps: { id: 'one' } });
  await waitFor(() => expect(result.current.pages).toHaveLength(2));
  vi.mocked(pagesApi.getChapterPages).mockResolvedValue({ result: 'error' }); rerender({ id: 'two' });
  await waitFor(() => expect(result.current.error).toContain('Failed')); expect(result.current.pages).toEqual([]);
});
it('loads all home feed sections', async () => {
  const { result } = renderHook(() => useHomeFeed()); await waitFor(() => expect(result.current.loading).toBe(false));
  expect(mangaApi.searchManga).toHaveBeenCalledTimes(6); expect(result.current.heroManga).toEqual(manga);
  for (const key of ['latestUpdates', 'recommended', 'selfPublished', 'seasonal', 'recentlyAdded'] as const) expect(result.current[key]).toEqual([manga]);
});
it('stops home loading on error', async () => {
  vi.mocked(mangaApi.searchManga).mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useHomeFeed()); await waitFor(() => expect(result.current.loading).toBe(false)); expect(result.current.heroManga).toBeNull();
});
const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter initialEntries={['/search?q=roots']}>{children}</MemoryRouter>;
it('reads search query from URL and debounces requests', async () => {
  const { result } = renderHook(() => useMangaSearch(), { wrapper });
  act(() => { result.current.setQuery('r'); result.current.setQuery('roots final'); });
  await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 2000 });
  expect(mangaApi.searchManga).toHaveBeenCalledTimes(1); expect(mangaApi.searchManga).toHaveBeenCalledWith('roots final'); expect(result.current.mangas).toEqual([manga]);
});
it('reports search HTTP failure', async () => {
  vi.mocked(mangaApi.searchManga).mockRejectedValue(new Error('429'));
  const { result } = renderHook(() => useMangaSearch(), { wrapper }); await waitFor(() => expect(result.current.error).toBe('429'), { timeout: 2000 });
});
it('reports malformed search payload', async () => {
  vi.mocked(mangaApi.searchManga).mockResolvedValue({});
  const { result } = renderHook(() => useMangaSearch(), { wrapper }); await waitFor(() => expect(result.current.error).toContain('Invalid response'), { timeout: 2000 });
});
