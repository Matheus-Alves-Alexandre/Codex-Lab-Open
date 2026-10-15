import { useState, useCallback, useEffect } from "react";
import { collection, query, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";

export interface LibraryEntry {
  mangaId: string;
  userId: string;
  title: string;
  coverFilename?: string;
  status: "reading" | "completed" | "plan_to_read" | "dropped";
  isFavorite: boolean;
  lastReadChapter?: string;
  savedAt: any;
  updatedAt: any;
}

export function useLibrary() {
  const { user } = useAuth();
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLibrary = useCallback(async () => {
    if (!user) {
      setLibrary([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
    const q = query(
       collection(db, `users/${user.uid}/library`)
    );
    const snapshot = await getDocs(q);
    const entries: LibraryEntry[] = [];
    snapshot.forEach((doc) => {
      entries.push(doc.data() as LibraryEntry);
    });
    setLibrary(entries);
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const updateEntry = async (mangaId: string, updates: Partial<LibraryEntry>) => {
    if (!user) return false;
    const docRef = doc(db, `users/${user.uid}/library`, mangaId);
    
    // Store previous state for rollback
    const rollbackEntry = library.find(e => e.mangaId === mangaId);
    
    // Optimistic update
    setLibrary(prev => {
      const existing = prev.find(e => e.mangaId === mangaId);
      if (existing) {
        return prev.map(e => e.mangaId === mangaId ? { ...e, ...updates } : e);
      }
      return prev;
    });

    const finalUpdates = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    try {
      await setDoc(docRef, finalUpdates, { merge: true });
      return true;
    } catch (err) {
      console.error("Failed to update library entry. Reverting UI.", err);
      // Revert optimistic update
      if (rollbackEntry) {
         setLibrary(prev => prev.map(e => e.mangaId === mangaId ? rollbackEntry! : e));
      }
      return false;
    }
  };

  const addEntry = async (entry: Omit<LibraryEntry, "userId" | "savedAt" | "updatedAt">) => {
    if (!user) return false;
    
    // Optimistic Update
    const optimisticEntry: LibraryEntry = {
      ...entry,
      userId: user.uid,
      savedAt: new Date(), // Mock date before server sync
      updatedAt: new Date()
    };
    
    setLibrary(prev => {
      if (prev.some(e => e.mangaId === entry.mangaId)) return prev;
      return [...prev, optimisticEntry];
    });

    const docRef = doc(db, `users/${user.uid}/library`, entry.mangaId);
    const fullEntry = {
      ...entry,
      userId: user.uid,
      savedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    try {
      await setDoc(docRef, fullEntry, { merge: true });
      return true;
    } catch (err) {
      console.error("Failed to save to library. Reverting UI.", err);
      // Revert optimistic update
      setLibrary(prev => prev.filter(e => e.mangaId !== entry.mangaId));
      return false;
    }
  };

  const removeEntry = async (mangaId: string) => {
    if (!user) return;
    const docRef = doc(db, `users/${user.uid}/library`, mangaId);
    await deleteDoc(docRef);
    setLibrary(prev => prev.filter(e => e.mangaId !== mangaId));
  };

  return { library, loading, error, updateEntry, addEntry, removeEntry, fetchLibrary, user };
}
