import { beforeEach, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAchievements } from '../../src/hooks/useAchievements';
import { ACHIEVEMENTS } from '../../src/lib/achievementsList';
const s = vi.hoisted(() => ({ user: { uid: 'alice' } as any, library: [] as any[], reviews: [] as any[] }));
vi.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: s.user }) }));
vi.mock('../../src/hooks/useLibrary', () => ({ useLibrary: () => ({ library: s.library }) }));
vi.mock('../../src/hooks/useUserReviews', () => ({ useUserReviews: () => ({ reviews: s.reviews }) }));
beforeEach(() => { s.user = { uid: 'alice' }; s.library = []; s.reviews = []; });
it('achievement ids are unique', () => expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length));
it('automatically unlocks tracked conditions', () => {
  s.library = [{ isFavorite: true }]; s.reviews = [{}];
  const { result } = renderHook(() => useAchievements()); expect(result.current.unlockedIds).toEqual(expect.arrayContaining(['recruta_1', 'avent_6']));
  expect(JSON.parse(localStorage.getItem('achievements_alice')!)).toEqual(result.current.unlockedIds);
});
it('preserves stored manual achievements while unlocking automatic ones', () => {
  localStorage.setItem('achievements_alice', JSON.stringify(['recruta_2'])); s.library = [{}];
  expect(renderHook(() => useAchievements()).result.current.unlockedIds).toEqual(['recruta_2', 'recruta_1']);
});
it.each(['broken json', '{}', '[1,"unknown"]'])('handles invalid persisted data %s', raw => {
  localStorage.setItem('achievements_alice', raw); expect(renderHook(() => useAchievements()).result.current.unlockedIds).toEqual([]);
});
it('manual unlock accepts known ids and prevents duplicates', () => {
  const { result } = renderHook(() => useAchievements()); act(() => result.current.manualUnlock('recruta_2'));
  act(() => result.current.manualUnlock('recruta_2')); act(() => result.current.manualUnlock('unknown'));
  expect(result.current.unlockedIds).toEqual(['recruta_2']); expect(result.current.newlyUnlocked?.id).toBe('recruta_2');
});
it('clears user achievements after logout', () => {
  localStorage.setItem('achievements_alice', JSON.stringify(['recruta_2']));
  const { result, rerender } = renderHook(() => useAchievements()); s.user = null; rerender(); expect(result.current.unlockedIds).toEqual([]);
  act(() => result.current.manualUnlock('recruta_1')); expect(result.current.unlockedIds).toEqual([]);
});
