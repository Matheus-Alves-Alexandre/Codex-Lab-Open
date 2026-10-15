type PublicEnv = Record<string, string | boolean | undefined>;

export function readFirebaseConfig(env: PublicEnv) {
  const projectId = String(env.VITE_FIREBASE_PROJECT_ID || 'demo-codex-lab');
  const emulator = env.VITE_FIREBASE_EMULATORS === 'true';
  const demo = projectId.startsWith('demo-');
  const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_APP_ID'];
  if (!demo) {
    const missing = required.filter(key => !env[key]);
    if (missing.length) throw new Error(`Incomplete Firebase setup: ${missing.join(', ')}. Run npm run setup:firebase.`);
  }
  return {
    enabled: emulator || !demo,
    emulator,
    databaseId: String(env.VITE_FIREBASE_DATABASE_ID || '(default)'),
    config: {
      projectId,
      apiKey: String(env.VITE_FIREBASE_API_KEY || 'demo-key'),
      authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-codex-lab.firebaseapp.com'),
      appId: String(env.VITE_FIREBASE_APP_ID || 'demo-app'),
    },
  };
}
