import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Review } from "./useReviews";

export function useUserReviews(userId?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setReviews([]);
    setLoading(false);
    async function fetchUserReviews() {
      if (!userId) return;
      setLoading(true);
      try {
        const q = query(collection(db, "reviews"), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        const entries: Review[] = [];
        snapshot.forEach((doc) => {
          entries.push({ id: doc.id, ...doc.data() } as Review);
        });
        
        entries.sort((a, b) => {
           const tA = a.updatedAt?.seconds || 0;
           const tB = b.updatedAt?.seconds || 0;
           return tB - tA;
        });

        if (active) setReviews(entries);
      } catch (err) {
        console.error("Failed to fetch user reviews", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    
    fetchUserReviews();
    return () => { active = false; };
  }, [userId]);

  return { reviews, loading };
}
