import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function createFirebaseEnv(values) {
  const fields = ['projectId', 'apiKey', 'authDomain', 'appId'];
  for (const field of fields) {
    if (typeof values[field] !== 'string' || !values[field].trim() || /[\r\n]/.test(values[field])) {
      throw new Error(`Invalid or missing ${field}`);
    }
  }
  if (!/^[a-z][a-z0-9-]{4,29}$/.test(values.projectId)) throw new Error('Invalid Firebase project ID');
  if (!/^[a-z0-9.-]+$/i.test(values.authDomain)) throw new Error('Auth domain must contain a hostname only');
  const databaseId = values.databaseId || '(default)';
  if (/[\r\n]/.test(databaseId)) throw new Error('Invalid database ID');
  const env = {
    VITE_FIREBASE_PROJECT_ID: values.projectId,
    VITE_FIREBASE_API_KEY: values.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: values.authDomain,
    VITE_FIREBASE_APP_ID: values.appId,
    VITE_FIREBASE_DATABASE_ID: databaseId,
    VITE_FIREBASE_EMULATORS: 'false',
  };
  return '# Local Firebase web configuration. Do not commit this file.\n' +
    Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n';
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log('Use your Firebase WEB app settings, never an Admin SDK service account.');
    const values = {};
    for (const [key, prompt] of [
      ['projectId', 'Project ID'], ['apiKey', 'Web API key'],
      ['authDomain', 'Auth domain'], ['appId', 'Web app ID'],
      ['databaseId', 'Firestore database ID (press Enter for default)'],
    ]) values[key] = (await rl.question(`${prompt}: `)).trim();
    const content = createFirebaseEnv(values);
    await writeFile('.env.local', content, { flag: 'wx', mode: 0o600 });
    console.log('Created .env.local (ignored by Git). Restart the dev server or rebuild.');
  } finally { rl.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.code === 'EEXIST' ? '.env.local already exists. Edit it manually; nothing was overwritten.' : error.message);
    process.exitCode = 1;
  });
}
