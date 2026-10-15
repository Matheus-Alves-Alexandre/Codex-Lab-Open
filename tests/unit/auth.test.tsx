import { it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../src/hooks/useAuth';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
const config = vi.hoisted(() => ({ enabled: true }));
vi.mock('../../src/lib/firebase', () => ({ auth: {}, googleProvider: {}, get firebaseEnabled() { return config.enabled; } }));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: vi.fn(), signInWithPopup: vi.fn(), signOut: vi.fn() }));
const unsubscribe = vi.fn();
beforeEach(() => {
  config.enabled = true;
  vi.clearAllMocks(); vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback: any) => { callback(null); return unsubscribe; });
  vi.spyOn(console, 'error').mockImplementation(() => {}); vi.stubGlobal('alert', vi.fn());
});
it('keeps catalog-only mode offline from Firebase', async () => {
  config.enabled = false;
  const { result } = renderHook(() => useAuth());
  expect(result.current.loading).toBe(false); expect(onAuthStateChanged).not.toHaveBeenCalled();
  await act(async () => { await result.current.loginWithGoogle(); });
  expect(signInWithPopup).not.toHaveBeenCalled(); expect(alert).toHaveBeenCalledWith(expect.stringContaining('setup:firebase'));
});
it('resolves auth state and unsubscribes on unmount', () => {
  const { result, unmount } = renderHook(() => useAuth()); expect(result.current.user).toBeNull(); expect(result.current.loading).toBe(false);
  unmount(); expect(unsubscribe).toHaveBeenCalledTimes(1);
});
it('updates signed in user', () => {
  vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback: any) => { callback({ uid: 'alice' }); return unsubscribe; });
  expect(renderHook(() => useAuth()).result.current.user?.uid).toBe('alice');
});
it('delegates Google sign in and sign out', async () => {
  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.loginWithGoogle(); await result.current.logout(); });
  expect(signInWithPopup).toHaveBeenCalledWith({}, {}); expect(signOut).toHaveBeenCalledWith({});
});
it('reports login failure', async () => {
  vi.mocked(signInWithPopup).mockRejectedValueOnce(new Error('popup blocked'));
  const { result } = renderHook(() => useAuth()); await act(async () => { await result.current.loginWithGoogle(); }); expect(alert).toHaveBeenCalledWith('Login failed: popup blocked');
});
it('handles logout failure', async () => {
  vi.mocked(signOut).mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useAuth()); await act(async () => { await result.current.logout(); }); expect(console.error).toHaveBeenCalled();
});
