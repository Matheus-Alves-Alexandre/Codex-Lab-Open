import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
afterEach(() => { cleanup(); if (typeof window !== 'undefined') window.localStorage?.clear(); vi.unstubAllGlobals(); });
if (typeof window !== 'undefined') {
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
Object.defineProperty(window, 'matchMedia', { value: vi.fn().mockImplementation(() => ({
  matches: false, addListener: vi.fn(), removeListener: vi.fn(),
  addEventListener: vi.fn(), removeEventListener: vi.fn(),
})), writable: true });
}
