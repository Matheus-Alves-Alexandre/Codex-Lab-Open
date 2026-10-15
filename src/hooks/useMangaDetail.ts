import { useState, useEffect } from "react";
import { getMangaDetails } from "../api/manga";
import { Manga } from "../types/mangadex";

export function useMangaDetail(id: string | undefined) {
  const [manga, setManga] = useState<Manga | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setManga(null);
    if (!id) { setLoading(false); return; }
    
    const fetchManga = async () => {
      setLoading(true);
      try {
        const mangaData = await getMangaDetails(id);
        if (active && mangaData.data) setManga(mangaData.data);
      } catch (err) {
        console.error("Failed to fetch manga details", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    
    fetchManga();
    return () => { active = false; };
  }, [id]);

  return { manga, loading };
}
