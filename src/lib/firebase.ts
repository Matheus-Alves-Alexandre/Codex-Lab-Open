import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { readFirebaseConfig } from './firebaseConfig';
const settings = readFirebaseConfig(import.meta.env);
export const firebaseEnabled = settings.enabled;

const app = initializeApp(settings.config);

export const db = getFirestore(app, settings.databaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

if (settings.emulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
