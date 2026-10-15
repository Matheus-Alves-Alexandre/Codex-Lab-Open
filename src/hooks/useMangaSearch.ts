import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { searchManga } from "../api/manga";
import { Manga } from "../types/mangadex";

export function useMangaSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sync internal query state with URL if it changes from outside
  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    const fetchMangas = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await searchManga(query);
        if (!active) return;
        if (data && data.data) {
          setMangas(data.data);
        } else {
          setError("Invalid response format from MangaDex API.");
        }
      } catch (err) {
        if (!active) return;
        console.error("Failed to fetch mangas", err);
        setError((err as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      // Update URL to match current query for shareability
      if (query) {
        setSearchParams({ q: query }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
      fetchMangas();
    }, 500);
    
    return () => { active = false; clearTimeout(debounceTimer); };
  }, [query, setSearchParams]);

  return { query, setQuery, mangas, loading, error };
}
