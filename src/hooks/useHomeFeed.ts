import { useState, useEffect } from "react";
import { searchManga } from "../api/manga";
import { Manga } from "../types/mangadex";

export function useHomeFeed() {
  const [heroManga, setHeroManga] = useState<Manga | null>(null);
  const [latestUpdates, setLatestUpdates] = useState<Manga[]>([]);
  const [recommended, setRecommended] = useState<Manga[]>([]);
  const [selfPublished, setSelfPublished] = useState<Manga[]>([]);
  const [seasonal, setSeasonal] = useState<Manga[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const [
          heroRes,
          latestRes,
          recRes,
          selfPubRes,
          seasonalRes,
          recentRes
        ] = await Promise.all([
          // Popular new titles (using high rating / followed)
          searchManga("", 0, 1, { "order[rating]": "desc", "includes[]": "author" }),
          // Latest Updates
          searchManga("", 0, 16, { "order[latestUploadedChapter]": "desc" }),
          // Recommended (Popular)
          searchManga("", 0, 6, { "order[followedCount]": "desc" }),
          // Self-Published (simulated with status or tag)
          searchManga("", 0, 6, { "order[relevance]": "desc", "originalLanguage[]": "ja" }),
          // Seasonal (simulated)
          searchManga("", 0, 6, { "order[rating]": "desc", "year": "2024" }),
          // Recently Added
          searchManga("", 0, 6, { "order[createdAt]": "desc" }),
        ]);

        if (heroRes.data && heroRes.data.length > 0) setHeroManga(heroRes.data[0]);
        setLatestUpdates(latestRes.data || []);
        setRecommended(recRes.data || []);
        setSelfPublished(selfPubRes.data || []);
        setSeasonal(seasonalRes.data || []);
        setRecentlyAdded(recentRes.data || []);
      } catch (err) {
        console.error("Home feed fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  return { heroManga, latestUpdates, recommended, selfPublished, seasonal, recentlyAdded, loading };
}
