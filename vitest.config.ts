import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'], restoreMocks: true,
    coverage: {
      provider: 'v8', reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}', 'api/**/*.js', 'server/**/*.ts'],
      exclude: ['src/main.tsx', 'src/types/**'],
      thresholds: { lines: 65, functions: 65, branches: 60, statements: 65 },
    },
  },
});
