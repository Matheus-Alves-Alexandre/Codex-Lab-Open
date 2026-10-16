import { it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLibrary, LibraryProvider } from '../../src/hooks/useLibrary';
import { useProfile } from '../../src/hooks/useProfile';
import { useReviews } from '../../src/hooks/useReviews';
import { useUserReviews } from '../../src/hooks/useUserReviews';
import * as fs from 'firebase/firestore';
const state = vi.hoisted(() => ({ user: null as any }));
vi.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('../../src/lib/firebase', () => ({ db: {}, firebaseEnabled: true }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args) => args.slice(1).join('/')), doc: vi.fn((...args) => args.slice(1).join('/')),
  query: vi.fn((...args) => args), where: vi.fn((...args) => args), orderBy: vi.fn(),
  getDocs: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), serverTimestamp: vi.fn(() => 'SERVER_TIME'),
}));
const entry = { mangaId: 'm', userId: 'alice', title: 'Roots', status: 'reading' as const, isFavorite: false, savedAt: 1, updatedAt: 1 };
const docs = (data: any[]) => ({ forEach: (callback: any) => data.forEach((value, i) => callback({ id: `doc-${i}`, data: () => value })) });
const renderLibrary = () => renderHook(() => useLibrary(), { wrapper: LibraryProvider });
beforeEach(() => {
  vi.clearAllMocks(); state.user = { uid: 'alice', displayName: 'Alice', photoURL: '', email: 'alice@example.test' };
  vi.mocked(fs.getDocs).mockResolvedValue(docs([]) as any);
  vi.mocked(fs.getDoc).mockResolvedValue({ exists: () => true, data: () => ({ displayName: 'Alice', nickname: 'Roots' }) } as any);
  vi.mocked(fs.setDoc).mockResolvedValue(undefined); vi.mocked(fs.deleteDoc).mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {}); vi.stubGlobal('alert', vi.fn());
});
it('does not access the library while signed out', async () => {
  state.user = null; const { result } = renderLibrary();
  expect(result.current.library).toEqual([]); expect(result.current.loading).toBe(false);
  await act(async () => { await result.current.addEntry(entry); await result.current.updateEntry('m', {}); await result.current.removeEntry('m'); });
  expect(fs.getDocs).not.toHaveBeenCalled(); expect(fs.setDoc).not.toHaveBeenCalled(); expect(fs.deleteDoc).not.toHaveBeenCalled();
});
it('loads the current user library path', async () => {
  vi.mocked(fs.getDocs).mockResolvedValue(docs([entry]) as any);
  const { result } = renderLibrary(); await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.library).toEqual([entry]); expect(fs.collection).toHaveBeenCalledWith({}, 'users/alice/library');
});
it('ends loading and exposes a library fetch error', async () => {
  vi.mocked(fs.getDocs).mockRejectedValue(new Error('permission denied'));
  const { result } = renderLibrary(); await waitFor(() => expect(result.current.loading).toBe(false)); expect(result.current.error).toBe('permission denied');
});
it('adds an entry with server timestamps and ownership', async () => {
  const { result } = renderLibrary(); await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { await result.current.addEntry(entry); });
  expect(fs.setDoc).toHaveBeenCalledWith('users/alice/library/m', expect.objectContaining({ userId: 'alice', savedAt: 'SERVER_TIME', updatedAt: 'SERVER_TIME' }), { merge: true });
  expect(result.current.library).toHaveLength(1);
});
it('rolls back a failed add', async () => {
  const { result } = renderLibrary(); await waitFor(() => expect(result.current.loading).toBe(false));
  vi.mocked(fs.setDoc).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await result.current.addEntry(entry); }); expect(result.current.library).toEqual([]);
});
it('updates favorite and restores it after failed write', async () => {
  vi.mocked(fs.getDocs).mockResolvedValue(docs([entry]) as any);
  const { result } = renderLibrary(); await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { await result.current.updateEntry('m', { isFavorite: true }); }); expect(result.current.library[0].isFavorite).toBe(true);
  vi.mocked(fs.setDoc).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await result.current.updateEntry('m', { isFavorite: false }); }); expect(result.current.library[0].isFavorite).toBe(true);
});
it('removes an entry only after successful delete', async () => {
  vi.mocked(fs.getDocs).mockResolvedValue(docs([entry]) as any);
  const { result } = renderLibrary(); await waitFor(() => expect(result.current.loading).toBe(false));
  vi.mocked(fs.deleteDoc).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await expect(result.current.removeEntry('m')).rejects.toThrow('offline'); }); expect(result.current.library).toHaveLength(1);
  await act(async () => { await result.current.removeEntry('m'); }); expect(result.current.library).toEqual([]);
});
it('shares one library read and favorite changes across 24 consumers', async () => {
  vi.mocked(fs.getDocs).mockResolvedValue(docs([entry]) as any);
  const { result } = renderHook(() => Array.from({ length: 24 }, () => useLibrary()), { wrapper: LibraryProvider });
  await waitFor(() => expect(result.current.every(consumer => !consumer.loading)).toBe(true));
  expect(fs.getDocs).toHaveBeenCalledTimes(1);
  await act(async () => { await result.current[0].updateEntry('m', { isFavorite: true }); });
  expect(result.current.every(consumer => consumer.library[0].isFavorite)).toBe(true);
});
it('isolates a new session from a late library response and clears data on logout', async () => {
  let resolveAlice: (value: any) => void;
  vi.mocked(fs.getDocs).mockImplementationOnce(() => new Promise(resolve => { resolveAlice = resolve; }));
  const { result, rerender } = renderLibrary();
  state.user = { uid: 'bob' };
  vi.mocked(fs.getDocs).mockResolvedValue(docs([{ ...entry, userId: 'bob', title: 'Bob library' }]) as any);
  rerender();
  await waitFor(() => expect(result.current.library[0]?.title).toBe('Bob library'));
  await act(async () => { resolveAlice!(docs([entry])); });
  expect(result.current.library[0].userId).toBe('bob');
  state.user = null; rerender();
  expect(result.current.library).toEqual([]);
});
it('returns no profile when logged out', () => {
  state.user = null; const { result } = renderHook(() => useProfile()); expect(result.current.profile).toBeNull(); expect(result.current.loading).toBe(false);
});
it('creates a missing profile using server time', async () => {
  vi.mocked(fs.getDoc).mockResolvedValue({ exists: () => false } as any);
  const { result } = renderHook(() => useProfile()); await waitFor(() => expect(result.current.loading).toBe(false));
  expect(fs.setDoc).toHaveBeenCalledWith('users/alice', expect.objectContaining({ displayName: 'Alice', createdAt: 'SERVER_TIME' }));
  expect(result.current.profile?.createdAt.toDate()).toBeInstanceOf(Date);
});
it('updates profile fields', async () => {
  const { result } = renderHook(() => useProfile()); await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { await result.current.updateProfile({ bio: 'Programador roots' }); });
  expect(result.current.profile?.bio).toBe('Programador roots'); expect(fs.updateDoc).toHaveBeenCalledWith('users/alice', { bio: 'Programador roots' });
});
it('ends profile loading on failure', async () => {
  vi.mocked(fs.getDoc).mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useProfile()); await waitFor(() => expect(result.current.loading).toBe(false)); expect(result.current.error).toBe('offline');
});
const reviews = [
  { userId: 'alice', mangaId: 'm', rating: 5, text: 'Bom', updatedAt: { seconds: 1 } },
  { userId: 'bob', mangaId: 'm', rating: 4, text: 'Legal', updatedAt: { seconds: 2 } },
];
it('loads and sorts reviews, selects own review', async () => {
  vi.mocked(fs.getDocs).mockResolvedValue(docs(reviews) as any);
  const { result } = renderHook(() => useReviews('m')); await waitFor(() => expect(result.current.reviews).toHaveLength(2));
  expect(result.current.reviews[0].userId).toBe('bob'); expect(result.current.userReview?.userId).toBe('alice');
});
it('creates review with deterministic id and timestamps', async () => {
  const { result } = renderHook(() => useReviews('m')); await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { await result.current.saveReview(5, 'Bom', 'Roots', 'cover'); });
  expect(fs.setDoc).toHaveBeenCalledWith('reviews/alice_m', expect.objectContaining({ rating: 5, text: 'Bom', createdAt: 'SERVER_TIME', updatedAt: 'SERVER_TIME' }), { merge: true });
});
it('preserves createdAt when editing review', async () => {
  vi.mocked(fs.getDocs).mockResolvedValue(docs(reviews) as any);
  const { result } = renderHook(() => useReviews('m')); await waitFor(() => expect(result.current.userReview).not.toBeNull());
  await act(async () => { await result.current.saveReview(4, 'Editado', 'Roots', 'cover'); });
  expect(vi.mocked(fs.setDoc).mock.calls.at(-1)?.[1]).not.toHaveProperty('createdAt');
});
it('removes own review', async () => {
  const { result } = renderHook(() => useReviews('m')); await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { await result.current.removeReview(); }); expect(fs.deleteDoc).toHaveBeenCalledWith('reviews/alice_m');
});
it('does not submit anonymous reviews', async () => {
  state.user = null; const { result } = renderHook(() => useReviews('m'));
  await act(async () => { await result.current.saveReview(5, 'x', 'x', 'x'); }); expect(fs.setDoc).not.toHaveBeenCalled();
});
it('handles review load errors', async () => {
  vi.mocked(fs.getDocs).mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useReviews('m')); await waitFor(() => expect(result.current.loading).toBe(false)); expect(result.current.reviews).toEqual([]);
});
it('loads user reviews and clears them on logout', async () => {
  vi.mocked(fs.getDocs).mockResolvedValue(docs(reviews) as any);
  const { result, rerender } = renderHook(({ id }: { id?: string }) => useUserReviews(id), { initialProps: { id: 'alice' } });
  await waitFor(() => expect(result.current.reviews).toHaveLength(2)); expect(fs.where).toHaveBeenCalledWith('userId', '==', 'alice');
  rerender({ id: undefined }); expect(result.current.reviews).toEqual([]);
});
