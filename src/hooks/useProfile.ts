import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface UserProfile {
  displayName: string;
  photoURL?: string;
  nickname?: string;
  bio?: string;
  createdAt?: any;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchOrCreateProfile = async () => {
      setLoading(true);
      setError('');
      try {
      const docRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        setProfile(snapshot.data() as UserProfile);
      } else {
        const newProfile: UserProfile = {
          displayName: user.displayName || 'Anonymous',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
        };
        await setDoc(docRef, newProfile);
        
        // Emulate local creation timestamp correctly to prevent errors pending sync
        setProfile({
          ...newProfile,
          createdAt: { toDate: () => new Date() } // temporary optimistic date
        } as unknown as UserProfile);
      }
      } catch (err) { setError((err as Error).message); }
      finally { setLoading(false); }
    };

    fetchOrCreateProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, updates);
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  return { profile, loading, error, updateProfile };
}
