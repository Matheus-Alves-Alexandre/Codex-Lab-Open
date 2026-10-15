import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Reader } from '../../src/pages/Reader';
import { useReaderStore } from '../../src/store/useReaderStore';
import { chapters } from '../fixtures';
const s = vi.hoisted(() => ({
  user: null as any, library: [] as any[], loading: false, libraryLoading: false, error: '', pages: ['1.jpg', '2.jpg'],
  updateEntry: vi.fn(), addEntry: vi.fn(),
}));
vi.mock('../../src/hooks/useLibrary', () => ({ useLibrary: () => ({ user: s.user, library: s.library, loading: s.libraryLoading, updateEntry: s.updateEntry, addEntry: s.addEntry }) }));
vi.mock('../../src/hooks/useChapterPages', () => ({ useChapterPages: () => ({ pages: s.pages, loading: s.loading, error: s.error }) }));
vi.mock('../../src/hooks/useChapterFeed', () => ({ useChapterFeed: () => ({ chapters }) }));
vi.mock('../../src/api/chapter', () => ({ getChapter: vi.fn(async () => ({ data: { relationships: [{ type: 'manga', id: 'manga-1' }] } })) }));
beforeEach(() => { vi.clearAllMocks(); Object.assign(s, { user: null, library: [], loading: false, libraryLoading: false, error: '', pages: ['1.jpg', '2.jpg'] }); s.addEntry.mockResolvedValue(true); s.updateEntry.mockResolvedValue(true); useReaderStore.setState({ currentPage: 1 }); });
const show = (id = 'chapter-2') => render(<MemoryRouter initialEntries={[{ pathname: `/reader/${id}`, state: { mangaId: 'manga-1', title: 'Roots' } }]}><Routes><Route path="/reader/:chapterId" element={<Reader />} /></Routes></MemoryRouter>);
it('shows loading and failure states', () => {
  s.loading = true; const { unmount } = show(); expect(screen.getByText('Fetching pages...')).toBeInTheDocument(); unmount();
  s.loading = false; s.error = 'Failed to load'; show(); expect(screen.getByText('Failed to load')).toBeInTheDocument();
});
it('moves chapters in ascending order and resets page', async () => {
  show(); fireEvent.click(screen.getByRole('button', { name: 'Next Page' })); fireEvent.click(screen.getByRole('button', { name: 'Next Chapter' }));
  await waitFor(() => expect(useReaderStore.getState().currentPage).toBe(1)); expect(screen.getByRole('button', { name: 'Next Page' })).toBeInTheDocument();
});
it('persists progress once and displays saved only after success', async () => {
  s.user = { uid: 'alice' }; show(); await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());
  expect(s.addEntry).toHaveBeenCalledTimes(1); expect(s.addEntry).toHaveBeenCalledWith(expect.objectContaining({ mangaId: 'manga-1', lastReadChapter: 'chapter-2' }));
});
it('does not display Saved when persistence failed', async () => {
  s.user = { uid: 'alice' }; s.addEntry.mockResolvedValue(false); show();
  await waitFor(() => expect(s.addEntry).toHaveBeenCalledTimes(1)); expect(screen.queryByText('Saved')).not.toBeInTheDocument();
});
it('does not mark failed chapter as read', () => {
  s.user = { uid: 'alice' }; s.error = 'Unavailable'; show(); expect(s.addEntry).not.toHaveBeenCalled();
});
it('waits for the library to load before tracking', () => {
  s.user = { uid: 'alice' }; s.libraryLoading = true; show(); expect(s.addEntry).not.toHaveBeenCalled();
});
it('updates existing progress and toggles favorite', async () => {
  s.user = { uid: 'alice' }; s.library = [{ mangaId: 'manga-1', isFavorite: false }]; show();
  await waitFor(() => expect(s.updateEntry).toHaveBeenCalledWith('manga-1', { status: 'reading', lastReadChapter: 'chapter-2' }));
  fireEvent.click(screen.getByTitle('Toggle Favorite')); await waitFor(() => expect(s.updateEntry).toHaveBeenCalledWith('manga-1', { isFavorite: true }));
});
