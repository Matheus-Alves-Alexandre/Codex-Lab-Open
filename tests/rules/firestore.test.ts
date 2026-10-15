import { beforeAll, afterAll, beforeEach, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-codex-lab', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
});
beforeEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env?.cleanup(); });
const db = (uid?: string) => uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();
const profile = () => ({ displayName: 'Alice', createdAt: serverTimestamp() });
const library = () => ({ userId: 'alice', mangaId: 'm', status: 'reading', isFavorite: false, savedAt: serverTimestamp(), updatedAt: serverTimestamp() });
const review = () => ({ userId: 'alice', mangaId: 'm', rating: 5, text: 'Bom', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
it('allows owner profile create/read/update, denies delete', async () => {
  const ref = doc(db('alice'), 'users/alice');
  await assertSucceeds(setDoc(ref, profile())); await assertSucceeds(getDoc(ref));
  await assertSucceeds(updateDoc(ref, { bio: 'Roots', nickname: 'Alice' })); await assertFails(deleteDoc(ref));
});
it('blocks anonymous profile reads and writes', async () => {
  await assertFails(getDoc(doc(db(), 'users/alice'))); await assertFails(setDoc(doc(db(), 'users/alice'), profile()));
});
it('blocks cross-user profiles and user enumeration', async () => {
  await assertFails(setDoc(doc(db('bob'), 'users/alice'), profile()));
  await assertFails(getDoc(doc(db('bob'), 'users/alice'))); await assertFails(getDocs(collection(db('alice'), 'users')));
});
it.each([{ isAdmin: true }, { role: 'admin' }, { displayName: 'x'.repeat(101) }, { bio: 'x'.repeat(2001) }, { createdAt: Timestamp.fromMillis(1) }])('blocks invalid profile payload %s', async extra => {
  await assertFails(setDoc(doc(db('alice'), 'users/alice'), { ...profile(), ...extra }));
});
it('prevents createdAt modification', async () => {
  const ref = doc(db('alice'), 'users/alice'); await setDoc(ref, profile());
  await assertFails(updateDoc(ref, { createdAt: Timestamp.fromMillis(1) }));
});
it('supports complete library lifecycle for owner', async () => {
  const ref = doc(db('alice'), 'users/alice/library/m');
  await assertSucceeds(setDoc(ref, library())); await assertSucceeds(getDoc(ref));
  await assertSucceeds(getDocs(collection(db('alice'), 'users/alice/library')));
  await assertSucceeds(updateDoc(ref, { isFavorite: true, lastReadChapter: 'c', updatedAt: serverTimestamp() }));
  await assertSucceeds(deleteDoc(ref));
});
it('isolates private libraries', async () => {
  await setDoc(doc(db('alice'), 'users/alice/library/m'), library());
  for (const visitor of [db(), db('bob')]) {
    await assertFails(getDoc(doc(visitor, 'users/alice/library/m')));
    await assertFails(getDocs(collection(visitor, 'users/alice/library')));
    await assertFails(setDoc(doc(visitor, 'users/alice/library/m'), library()));
    await assertFails(deleteDoc(doc(visitor, 'users/alice/library/m')));
  }
});
it.each([{ userId: 'bob' }, { mangaId: 'other' }, { status: 'invalid' }, { isFavorite: 'yes' }, { savedAt: Timestamp.fromMillis(1) }, { isAdmin: true }])('rejects malformed library entry %s', async extra => {
  await assertFails(setDoc(doc(db('alice'), 'users/alice/library/m'), { ...library(), ...extra }));
});
it('does not permit library ownership transfer', async () => {
  const ref = doc(db('alice'), 'users/alice/library/m'); await setDoc(ref, library());
  await assertFails(updateDoc(ref, { userId: 'bob', updatedAt: serverTimestamp() }));
});
it('allows public review reads and owner lifecycle', async () => {
  const ref = doc(db('alice'), 'reviews/alice_m'); await assertSucceeds(setDoc(ref, review()));
  await assertSucceeds(getDoc(doc(db(), 'reviews/alice_m'))); await assertSucceeds(getDocs(collection(db(), 'reviews')));
  await assertSucceeds(updateDoc(ref, { rating: 4, text: 'Editado', updatedAt: serverTimestamp() }));
  await assertSucceeds(deleteDoc(ref));
});
it('blocks anonymous reviews and editing another author', async () => {
  await assertFails(setDoc(doc(db(), 'reviews/alice_m'), review()));
  await setDoc(doc(db('alice'), 'reviews/alice_m'), review());
  await assertFails(updateDoc(doc(db('bob'), 'reviews/alice_m'), { text: 'Invadido', updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(doc(db('bob'), 'reviews/alice_m')));
});
it.each([0, 6, 2.5, '5'])('rejects invalid rating %s', async rating => {
  await assertFails(setDoc(doc(db('alice'), 'reviews/alice_m'), { ...review(), rating }));
});
it('rejects duplicate review with arbitrary id', async () => { await assertFails(setDoc(doc(db('alice'), 'reviews/random'), review())); });
it('rejects oversized review and extra fields', async () => {
  await assertFails(setDoc(doc(db('alice'), 'reviews/alice_m'), { ...review(), text: 'x'.repeat(5001) }));
  await assertFails(setDoc(doc(db('alice'), 'reviews/alice_m'), { ...review(), isAdmin: true }));
});
it('preserves review identity and creation timestamp', async () => {
  const ref = doc(db('alice'), 'reviews/alice_m'); await setDoc(ref, review());
  for (const patch of [{ mangaId: 'other' }, { userId: 'bob' }, { createdAt: Timestamp.fromMillis(1) }]) {
    await assertFails(updateDoc(ref, { ...patch, updatedAt: serverTimestamp() }));
  }
});
it('denies access to unknown collections', async () => {
  await assertFails(setDoc(doc(db('alice'), 'secrets/key'), { value: 1 })); await assertFails(getDoc(doc(db('alice'), 'secrets/key')));
});
