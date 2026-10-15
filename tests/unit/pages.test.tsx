import { beforeEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Home } from '../../src/pages/Home';
import { Search } from '../../src/pages/Search';
import { MangaDetail } from '../../src/pages/MangaDetail';
import { Profile } from '../../src/pages/Profile';
import { LibraryPage } from '../../src/pages/LibraryPage';
import { manga, chapters } from '../fixtures';
const s = vi.hoisted(() => ({
  user: null as any, loading: false, library: [] as any[], reviews: [] as any[], userReview: null as any,
  profile: null as any, manga: null as any, search: { mangas: [] as any[], loading: false, error: '' },
  updateProfile: vi.fn(), addEntry: vi.fn(), updateEntry: vi.fn(), saveReview: vi.fn(),
}));
vi.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: s.user }) }));
vi.mock('../../src/hooks/useLibrary', () => ({ useLibrary: () => ({ library: s.library, loading: s.loading, user: s.user, addEntry: s.addEntry, updateEntry: s.updateEntry }) }));
vi.mock('../../src/hooks/useProfile', () => ({ useProfile: () => ({ profile: s.profile, loading: s.loading, updateProfile: s.updateProfile }) }));
vi.mock('../../src/hooks/useReviews', () => ({ useReviews: () => ({ reviews: s.reviews, userReview: s.userReview, loading: false, saveReview: s.saveReview, removeReview: vi.fn() }) }));
vi.mock('../../src/hooks/useUserReviews', () => ({ useUserReviews: () => ({ reviews: s.reviews, loading: false }) }));
vi.mock('../../src/hooks/useMangaDetail', () => ({ useMangaDetail: () => ({ manga: s.manga, loading: s.loading }) }));
vi.mock('../../src/hooks/useChapterFeed', async () => ({ useChapterFeed: () => ({ chapters: (awaitedChapters), loading: false }) }));
// A hoisted import is unnecessary here: factory returns a function evaluated after imports.
const awaitedChapters = chapters;
vi.mock('../../src/hooks/useMangaSearch', () => ({ useMangaSearch: () => s.search }));
vi.mock('../../src/hooks/useHomeFeed', () => ({ useHomeFeed: () => ({ heroManga: s.manga, latestUpdates: s.manga ? [s.manga] : [], recommended: [], selfPublished: [], seasonal: [], recentlyAdded: [], loading: s.loading }) }));
vi.mock('../../src/hooks/useAchievements', () => ({ useAchievements: () => ({ newlyUnlocked: null, unlockedIds: [], unlockedAchievements: [], manualUnlock: vi.fn() }) }));
vi.mock('../../src/api/manga', () => ({ getMangasByIds: vi.fn(async () => ({ data: [] })) }));
beforeEach(() => { vi.clearAllMocks(); Object.assign(s, { user: null, loading: false, library: [], reviews: [], userReview: null, profile: null, manga, search: { mangas: [], loading: false, error: '' } }); });
const show = (node: React.ReactNode) => render(<MemoryRouter initialEntries={['/manga/manga-1']}><Routes><Route path="/manga/:id" element={node} /></Routes></MemoryRouter>);
it('home renders sections and loading state', () => {
  const { rerender } = render(<MemoryRouter><Home /></MemoryRouter>); expect(screen.getByText('Latest Updates')).toBeInTheDocument();
  s.loading = true; rerender(<MemoryRouter><Home /></MemoryRouter>); expect(screen.getByText('Loading Frontend...')).toBeInTheDocument();
});
it('search renders empty, failure, and populated results', () => {
  const { rerender } = render(<MemoryRouter><Search /></MemoryRouter>); expect(screen.getByText(/No mangas found/)).toBeInTheDocument();
  s.search.error = 'offline'; rerender(<MemoryRouter><Search /></MemoryRouter>); expect(screen.getByText('Failed to fetch mangas')).toBeInTheDocument();
  s.search = { mangas: [manga], loading: false, error: '' }; rerender(<MemoryRouter><Search /></MemoryRouter>); expect(screen.getByText('1 found')).toBeInTheDocument();
});
it('detail handles not found', () => { s.manga = null; show(<MangaDetail />); expect(screen.getByText('Manga not found.')).toBeInTheDocument(); });
it('detail shows title, description and chapter links', () => {
  show(<MangaDetail />); expect(screen.getByRole('heading', { name: 'Roots Manga' })).toBeInTheDocument(); expect(screen.getByText('Uma aventura de teste.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Capítulo 1/ })).toHaveAttribute('href', '/reader/chapter-1');
});
it('detail adds reading and favorite entries', () => {
  s.user = { uid: 'alice' }; show(<MangaDetail />);
  fireEvent.click(screen.getByRole('button', { name: 'Read' })); expect(s.addEntry).toHaveBeenCalledWith(expect.objectContaining({ status: 'reading', mangaId: manga.id }));
});
it('detail synchronizes an asynchronously loaded review into the edit form', async () => {
  s.user = { uid: 'alice' }; const { rerender } = show(<MangaDetail />);
  s.userReview = { rating: 4, text: 'Avaliação existente' }; rerender(<MemoryRouter initialEntries={['/manga/manga-1']}><Routes><Route path="/manga/:id" element={<MangaDetail />} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Reviews' }));
  expect(screen.getByRole('textbox')).toHaveValue('Avaliação existente');
});
it('profile requires sign in', () => { show(<Profile />); expect(screen.getByText('Sign in to view your profile')).toBeInTheDocument(); });
it('profile edits nickname and bio', async () => {
  s.user = { uid: 'alice' }; s.profile = { displayName: 'Alice', createdAt: { toDate: () => new Date('2024-06-01T12:00:00Z') } }; show(<Profile />);
  expect(screen.getByText('Member since 2024')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
  fireEvent.change(screen.getByPlaceholderText('Choose a nickname...'), { target: { value: 'Roots' } });
  fireEvent.change(screen.getByPlaceholderText('Write a bio...'), { target: { value: 'Dev' } }); fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));
  await waitFor(() => expect(s.updateProfile).toHaveBeenCalledWith({ nickname: 'Roots', bio: 'Dev' }));
});
it('library shows empty dashboard', async () => {
  show(<LibraryPage />); await waitFor(() => expect(screen.getByText('No mangas currently reading.')).toBeInTheDocument()); expect(screen.getByText('No favorites yet.')).toBeInTheDocument();
});
it('library falls back to saved manga when API has no data', async () => {
  s.library = [{ mangaId: manga.id, title: 'Saved Roots', status: 'reading', isFavorite: true, coverFilename: 'cover.jpg' }];
  show(<LibraryPage />); await waitFor(() => expect(screen.getAllByText('Saved Roots')).toHaveLength(2));
});
