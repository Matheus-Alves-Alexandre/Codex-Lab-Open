import { useState, useEffect, useRef } from 'react';
import { useLibrary } from './useLibrary';
import { useAuth } from './useAuth';
import { useUserReviews } from './useUserReviews';
import { ACHIEVEMENTS, Achievement } from '../lib/achievementsList';

// Helper to store unlocked achievements in local storage for the simulated popups
// In a real app we'd save this to Firestore.
const getStoredAchievements = (uid: string) => {
  try {
    const raw = localStorage.getItem(`achievements_${uid}`);
    if (raw) {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) return ids.filter(id => typeof id === 'string' && ACHIEVEMENTS.some(a => a.id === id));
    }
  } catch (e) {}
  return [];
};

const setStoredAchievements = (uid: string, ids: string[]) => {
  try { localStorage.setItem(`achievements_${uid}`, JSON.stringify(ids)); } catch {}
};

export function useAchievements() {
  const { user } = useAuth();
  const { library } = useLibrary();
  const { reviews } = useUserReviews(user?.uid);
  
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (achievement: Achievement) => {
    if (timer.current) clearTimeout(timer.current);
    setNewlyUnlocked(achievement);
    timer.current = setTimeout(() => setNewlyUnlocked(null), 5000);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Load initial unlocked
  useEffect(() => {
    setUnlockedIds(user?.uid ? getStoredAchievements(user.uid) : []);
    setNewlyUnlocked(null);
  }, [user?.uid]);

  // Evaluate conditions when library or reviews change
  useEffect(() => {
    if (!user?.uid) return;

    const stats = {
      mangasRead: library.length,
      reviewsCount: reviews.length,
      favoritesCount: library.filter(l => l.isFavorite).length,
    };

    const storedIds: string[] = getStoredAchievements(user.uid);
    let newIds: string[] = [];

    // Check code-based ones
    ACHIEVEMENTS.forEach(ach => {
      if (!storedIds.includes(ach.id) && ach.condition && ach.condition(stats)) {
        newIds.push(ach.id);
      }
    });

    if (newIds.length > 0) {
      const combined = [...storedIds, ...newIds];
      setStoredAchievements(user.uid, combined);
      setUnlockedIds(combined);
      
      // Toast the first one (or multiple, but let's do first)
      const newlyAchieved = ACHIEVEMENTS.find(a => a.id === newIds[0]);
      if (newlyAchieved) {
        showToast(newlyAchieved);
      }
    }
  }, [user?.uid, library.length, reviews.length]);

  return {
    unlockedIds,
    unlockedAchievements: ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id)),
    allAchievements: ACHIEVEMENTS,
    newlyUnlocked,
    // Provide a manual unlock method for all the achievements that don't have code tracked conditions
    manualUnlock: (id: string) => {
       if (!user?.uid || unlockedIds.includes(id) || !ACHIEVEMENTS.some(a => a.id === id)) return;
       const combined = [...unlockedIds, id];
       setStoredAchievements(user.uid, combined);
       setUnlockedIds(combined);
       
       const newlyAchieved = ACHIEVEMENTS.find(a => a.id === id);
       if (newlyAchieved) {
         showToast(newlyAchieved);
       }
    }
  };
}
