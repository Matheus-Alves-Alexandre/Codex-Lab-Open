import { useState, useEffect } from "react";
import { getMangaChapters } from "../api/chapter";
import { Chapter } from "../types/mangadex";

export function useChapterFeed(id: string | undefined, selectedLang: string) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setChapters([]);
    if (!id) return;

    const fetchChapters = async () => {
      setLoading(true);
      try {
        const langsToFetch = selectedLang ? [selectedLang] : ['en', 'pt-br'];
        const chaptersData = await getMangaChapters(id, 0, 100, langsToFetch);
        if (active && chaptersData.data) {
          setChapters(chaptersData.data);
        }
      } catch (err) {
        console.error("Failed to fetch chapters", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchChapters();
    return () => { active = false; };
  }, [id, selectedLang]);

  return { chapters, loading };
}
