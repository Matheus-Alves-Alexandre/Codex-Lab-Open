// @vitest-environment node
import { it, expect } from 'vitest';
import { createFirebaseEnv } from '../../scripts/setup-firebase.mjs';
import { readFirebaseConfig } from '../../src/lib/firebaseConfig';
const values = { projectId: 'my-manga-reader', apiKey: 'web-key', authDomain: 'my-manga-reader.firebaseapp.com', appId: 'web-app' };
it('generates portable local configuration with no owner settings', () => {
  const content = createFirebaseEnv(values); expect(content).toContain('VITE_FIREBASE_PROJECT_ID="my-manga-reader"'); expect(content).toContain('VITE_FIREBASE_DATABASE_ID="(default)"'); expect(content).toContain('VITE_FIREBASE_EMULATORS="false"');
});
it.each(['projectId', 'apiKey', 'authDomain', 'appId'])('requires %s', field => expect(() => createFirebaseEnv({ ...values, [field]: '' })).toThrow());
it('rejects multiline configuration injection', () => expect(() => createFirebaseEnv({ ...values, apiKey: 'key\nINJECTED=value' })).toThrow());
it('rejects invalid hostnames and project IDs', () => {
  expect(() => createFirebaseEnv({ ...values, authDomain: 'https://bad.test/path' })).toThrow();
  expect(() => createFirebaseEnv({ ...values, projectId: '../../escape' })).toThrow();
});
it('disables Firebase without user config', () => expect(readFirebaseConfig({}).enabled).toBe(false));
it('requires a complete real project config', () => expect(() => readFirebaseConfig({ VITE_FIREBASE_PROJECT_ID: 'my-manga-reader' })).toThrow('Incomplete Firebase setup'));
it('enables a complete user project', () => expect(readFirebaseConfig({ VITE_FIREBASE_PROJECT_ID: values.projectId, VITE_FIREBASE_API_KEY: values.apiKey, VITE_FIREBASE_AUTH_DOMAIN: values.authDomain, VITE_FIREBASE_APP_ID: values.appId }).enabled).toBe(true));
it('enables explicit demo emulators', () => expect(readFirebaseConfig({ VITE_FIREBASE_EMULATORS: 'true' }).enabled).toBe(true));
