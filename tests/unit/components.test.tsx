import { beforeEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Navbar } from '../../src/components/Navbar';
import { StarRating } from '../../src/components/StarRating';
import { PageViewer } from '../../src/components/PageViewer';
import { ChapterList } from '../../src/components/ChapterList';
import { MangaCard } from '../../src/components/MangaCard';
import { HeroMangaCard } from '../../src/components/HeroMangaCard';
import { CompactMangaCard } from '../../src/components/CompactMangaCard';
import { MangaCarousel } from '../../src/components/MangaCarousel';
import { ReviewCard } from '../../src/components/ReviewCard';
import { AchievementToast } from '../../src/components/AchievementToast';
import { AchievementsPanel } from '../../src/components/AchievementsPanel';
import { ReadingStatsRadar } from '../../src/components/ReadingStatsRadar';
import { useReaderStore } from '../../src/store/useReaderStore';
import { manga, chapters } from '../fixtures';
import { ACHIEVEMENTS } from '../../src/lib/achievementsList';
const state = vi.hoisted(() => ({ user: null as any, library: [] as any[], addEntry: vi.fn(), updateEntry: vi.fn(), login: vi.fn(), logout: vi.fn(), unlocked: [] as any[] }));
vi.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user, loading: false, loginWithGoogle: state.login, logout: state.logout }) }));
vi.mock('../../src/hooks/useLibrary', () => ({ useLibrary: () => ({ library: state.library, addEntry: state.addEntry, updateEntry: state.updateEntry }) }));
vi.mock('../../src/hooks/useAchievements', () => ({ useAchievements: () => ({ unlockedIds: state.unlocked.map(a => a.id), unlockedAchievements: state.unlocked, manualUnlock: vi.fn() }) }));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  RadarChart: ({ data, children }: any) => <div data-testid="radar-data">{JSON.stringify(data)}{children}</div>,
  Radar: () => null, PolarGrid: () => null, PolarAngleAxis: () => null, PolarRadiusAxis: () => null, Tooltip: () => null,
}));
beforeEach(() => { vi.clearAllMocks(); state.user = null; state.library = []; state.unlocked = []; useReaderStore.setState({ currentPage: 1 }); });
function Location() { const loc = useLocation(); return <span data-testid="location">{loc.pathname}{loc.search}</span>; }
const show = (node: React.ReactNode) => render(<MemoryRouter>{node}<Location /></MemoryRouter>);
it('navbar trims and encodes search, keyboard shortcut focuses input', () => {
  show(<Navbar />); const input = screen.getByPlaceholderText('Search mangas...');
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true }); expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: ' roots & manga ' } }); fireEvent.submit(input.closest('form')!);
  expect(screen.getByTestId('location')).toHaveTextContent('/search?q=roots%20%26%20manga');
});
it('navbar opens search with empty query', () => { show(<Navbar />); fireEvent.submit(screen.getByPlaceholderText('Search mangas...').closest('form')!); expect(screen.getByTestId('location')).toHaveTextContent('/search'); });
it('navbar invokes sign in', () => { show(<Navbar />); fireEvent.click(screen.getByRole('button', { name: 'Sign In' })); expect(state.login).toHaveBeenCalled(); });
it('navbar displays user and logout', () => {
  state.user = { displayName: 'Alice Roots', photoURL: 'avatar.png' }; show(<Navbar />);
  expect(screen.getByText('Alice')).toBeInTheDocument(); expect(screen.getByAltText('Avatar')).toHaveAttribute('src', 'avatar.png');
  fireEvent.click(screen.getByTitle('Logout')); expect(state.logout).toHaveBeenCalled();
});
it('star rating sends chosen value', () => { const change = vi.fn(); render(<StarRating rating={2} onRatingChange={change} />); fireEvent.click(screen.getByTitle('4 Stars')); expect(change).toHaveBeenCalledWith(4); });
it('read-only stars cannot change', () => { const change = vi.fn(); render(<StarRating rating={3} readOnly onRatingChange={change} />); fireEvent.click(screen.getByTitle('4 Stars')); expect(change).not.toHaveBeenCalled(); });
it('page viewer navigates pages and stays within bounds', () => {
  render(<PageViewer pages={['a.jpg', 'b.jpg']} />);
  expect(screen.getByRole('button', { name: 'Prev Page' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next Page' })); expect(useReaderStore.getState().currentPage).toBe(2);
  fireEvent.click(screen.getByRole('button', { name: 'Prev Page' })); expect(useReaderStore.getState().currentPage).toBe(1);
});
it('renders only the current page and preloads at most the next two pages', async () => {
  vi.useFakeTimers();
  const loaded: string[] = [];
  vi.stubGlobal('Image', class { set src(value: string) { if (value) loaded.push(value); } });
  try {
    const pages = Array.from({ length: 20 }, (_, i) => `${i + 1}.jpg`);
    render(<PageViewer pages={pages} />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(300);
    expect(loaded).toEqual(['2.jpg', '3.jpg']);
    fireEvent.click(screen.getByRole('button', { name: 'Next Page' }));
    await vi.advanceTimersByTimeAsync(300);
    expect(screen.getByRole('img')).toHaveAttribute('src', '2.jpg');
    expect(loaded).toEqual(['2.jpg', '3.jpg', '3.jpg', '4.jpg']);
  } finally { vi.useRealTimers(); }
});
it('page viewer dispatches chapter navigation', () => {
  const navigate = vi.fn(); render(<PageViewer pages={['a.jpg']} prevChapterId="prev" nextChapterId="next" onNavigateChapter={navigate} />);
  fireEvent.click(screen.getByRole('button', { name: 'Prev Chapter' })); expect(navigate).toHaveBeenCalledWith('prev');
  fireEvent.click(screen.getByRole('button', { name: 'Next Chapter' })); expect(navigate).toHaveBeenCalledWith('next');
});
it('page viewer shows finish overlay and favorite action', () => {
  const favorite = vi.fn(); render(<PageViewer pages={['a.jpg']} onToggleFavorite={favorite} />);
  fireEvent.click(screen.getByRole('button', { name: 'Finish' })); expect(screen.getByText("You've caught up!")).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add to Favorites' })); expect(favorite).toHaveBeenCalled();
});
it('renders no viewer for empty pages', () => { const { container } = render(<PageViewer pages={[]} />); expect(container).toBeEmptyDOMElement(); });
it('chapter list links internal and external chapters safely', () => {
  state.library = [{ mangaId: manga.id, lastReadChapter: 'chapter-1' }];
  show(<ChapterList mangaId={manga.id} chapters={[chapters[0], { ...chapters[1], attributes: { ...chapters[1].attributes, externalUrl: 'https://example.org/chapter' } }]} />);
  expect(screen.getByRole('link', { name: /Capítulo 1/ })).toHaveAttribute('href', '/reader/chapter-1');
  expect(screen.getByText('Continue →')).toBeInTheDocument(); expect(screen.getByRole('link', { name: /Capítulo 2/ })).toHaveAttribute('rel', 'noopener noreferrer');
});
it.each([MangaCard, HeroMangaCard, CompactMangaCard])('manga card renders title, cover and route', Card => {
  show(<Card manga={manga} />); expect(screen.getByRole('link', { name: /Roots Manga/ })).toHaveAttribute('href', '/manga/manga-1');
  expect(screen.getByAltText('Roots Manga')).toHaveAttribute('src', expect.stringContaining('/api/image-proxy?'));
});
it('manga card uses title and cover fallbacks', () => {
  show(<MangaCard manga={{ ...manga, attributes: { ...manga.attributes, title: {} }, relationships: [] }} />);
  expect(screen.getByText('Unknown Title')).toBeInTheDocument(); expect(screen.getByText('No Cover')).toBeInTheDocument();
});
it('favorite button creates a library entry without navigating', () => {
  state.user = { uid: 'alice' }; show(<MangaCard manga={manga} />); fireEvent.click(screen.getByTitle('Toggle Favorite'));
  expect(state.addEntry).toHaveBeenCalledWith(expect.objectContaining({ mangaId: manga.id, isFavorite: true, status: 'plan_to_read' }));
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
});
it('favorite button toggles existing entry', () => {
  state.user = { uid: 'alice' }; state.library = [{ mangaId: manga.id, isFavorite: true }]; show(<MangaCard manga={manga} />); fireEvent.click(screen.getByTitle('Toggle Favorite'));
  expect(state.updateEntry).toHaveBeenCalledWith(manga.id, { isFavorite: false });
});
it('carousel is absent with no mangas and shows update badge otherwise', () => {
  const { rerender, container } = render(<MemoryRouter><MangaCarousel mangas={[]} /></MemoryRouter>); expect(container).toBeEmptyDOMElement();
  rerender(<MemoryRouter><MangaCarousel mangas={[{ ...manga, _isNewUpdate: true }]} /></MemoryRouter>); expect(screen.getByText('New!!')).toBeInTheDocument();
});
it('achievement toast is conditional', () => {
  const { rerender, container } = render(<AchievementToast achievement={null} />); expect(container).toBeEmptyDOMElement();
  rerender(<AchievementToast achievement={ACHIEVEMENTS[0]} />); expect(screen.getByText('Primeiro Passo')).toBeInTheDocument();
});
it('achievement panel shows empty and unlocked states', () => {
  const { rerender } = render(<AchievementsPanel />); expect(screen.getByText(/Nenhuma conquista ainda/)).toBeInTheDocument();
  state.unlocked = [ACHIEVEMENTS[0]]; rerender(<AchievementsPanel />); expect(screen.getByText('Primeiro Passo')).toBeInTheDocument();
});
it('radar aggregates and pads genres', () => {
  const tagged = { ...manga, attributes: { ...manga.attributes, tags: [{ id: 'a', attributes: { name: { en: 'Action' } } }] } };
  render(<ReadingStatsRadar mangas={[tagged, tagged]} />); const data = screen.getByTestId('radar-data').textContent!;
  expect(data).toContain('"subject":"Action","A":2'); expect(data).toContain('Misc');
});
it('radar supplies default genres without favorites', () => { render(<ReadingStatsRadar mangas={[]} />); expect(screen.getByTestId('radar-data')).toHaveTextContent('Romance'); });
it('review displays public author and offers copy link', async () => {
  const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }; Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
  show(<ReviewCard review={{ id: 'r', userId: 'alice', mangaId: manga.id, rating: 5, text: 'Excelente', authorName: 'Alice', mangaTitle: 'Roots Manga', createdAt: null, updatedAt: null }} />);
  expect(screen.getByText('Excelente')).toBeInTheDocument(); fireEvent.click(screen.getByTitle('Share Review')); fireEvent.click(screen.getByText('Copy Link'));
  expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining(`/manga/${manga.id}`));
  await waitFor(() => expect(screen.getByText('Copied!')).toBeInTheDocument());
});
