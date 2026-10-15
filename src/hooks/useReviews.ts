import { useState, useCallback, useEffect } from "react";
import { collection, query, where, getDocs, setDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { db, firebaseEnabled } from "../lib/firebase";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";

export interface Review {
  id: string;
  userId: string;
  mangaId: string;
  rating: number;
  text: string;
  mangaTitle?: string;
  coverFilename?: string;
  authorName?: string;
  authorPhoto?: string;
  createdAt: any;
  updatedAt: any;
}

export function useReviews(mangaId?: string) {
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!firebaseEnabled) { setReviews([]); setUserReview(null); setLoading(false); return; }
    if (!mangaId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "reviews"),
        where("mangaId", "==", mangaId)
        // Note: To use orderBy with where, Firebase requires an index. 
        // For simplicity without index config, we will sort locally.
      );
      const snapshot = await getDocs(q);
      const entries: Review[] = [];
      snapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as Review);
      });
      
      // Sort descending by date locally
      entries.sort((a, b) => {
         const tA = a.updatedAt?.seconds || 0;
         const tB = b.updatedAt?.seconds || 0;
         return tB - tA;
      });

      setReviews(entries);
      setUserReview(user ? entries.find(r => r.userId === user.uid) || null : null);
    } catch (err) {
      console.error("Failed to fetch reviews", err);
    } finally {
      setLoading(false);
    }
  }, [mangaId, user]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const saveReview = async (rating: number, text: string, mangaTitle: string, coverFilename: string) => {
    if (!user || (!rating && !text) || !mangaId) return;

    const reviewId = `${user.uid}_${mangaId}`;
    const docRef = doc(db, "reviews", reviewId);
    
    // We compose the review data
    const reviewData = {
      userId: user.uid,
      mangaId: mangaId,
      rating: rating,
      text: text,
      mangaTitle: mangaTitle,
      coverFilename: coverFilename,
      authorName: profile?.nickname || profile?.displayName || user.email?.split("@")[0] || "Anonymous",
      authorPhoto: profile?.photoURL || user.photoURL || "",
    };

    try {
      const isUpdate = !!userReview;
      
      await setDoc(docRef, {
        ...reviewData,
        updatedAt: serverTimestamp(),
        ...(!isUpdate && { createdAt: serverTimestamp() })
      }, { merge: true });

      // Refresh list
      await fetchReviews();
    } catch (err) {
      console.error("Failed to save review", err);
      alert("Failed to save review. Check permissions.");
    }
  };

  const removeReview = async () => {
    if (!user || !mangaId) return;
    const reviewId = `${user.uid}_${mangaId}`;
    try {
      await deleteDoc(doc(db, "reviews", reviewId));
      setUserReview(null);
      await fetchReviews();
    } catch (err) {
      console.error("Failed to delete review", err);
    }
  };

  return { reviews, userReview, loading, saveReview, removeReview, refresh: fetchReviews };
}
