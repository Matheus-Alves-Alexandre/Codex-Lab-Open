import { beforeEach, it, expect, vi } from 'vitest';
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => 'app') }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => 'auth'), GoogleAuthProvider: class {}, connectAuthEmulator: vi.fn() }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => 'db'), connectFirestoreEmulator: vi.fn() }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
it('defaults to a demo project instead of production', async () => {
  await import('../../src/lib/firebase'); expect(initializeApp).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'demo-codex-lab' }));
  expect(connectAuthEmulator).not.toHaveBeenCalled();
});
it('reads public config and connects to explicit local emulators', async () => {
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'demo-custom'); vi.stubEnv('VITE_FIREBASE_DATABASE_ID', 'custom'); vi.stubEnv('VITE_FIREBASE_EMULATORS', 'true');
  try {
    await import('../../src/lib/firebase'); expect(initializeApp).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'demo-custom' }));
    expect(getFirestore).toHaveBeenCalledWith('app', 'custom'); expect(connectFirestoreEmulator).toHaveBeenCalledWith('db', '127.0.0.1', 8080);
    expect(connectAuthEmulator).toHaveBeenCalledWith('auth', 'http://127.0.0.1:9099', { disableWarnings: true });
  } finally { vi.unstubAllEnvs(); }
});
