import { useState, useEffect } from "react";
import { getChapterPages } from "../api/pages";

export function useChapterPages(id: string | undefined) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setPages([]);
    if (!id) { setLoading(false); return; }
    
    const fetchPages = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getChapterPages(id);
        if (!active) return;
        if (data.result === "ok") {
          const { baseUrl, chapter } = data;
          const { hash, dataSaver } = chapter;
          
          if (!dataSaver || dataSaver.length === 0) {
             setError("This chapter has no pages available to read.");
             return;
          }

          const pageUrls = dataSaver.map((filename: string) => {
            const externalUrl = `${baseUrl}/data-saver/${hash}/${filename}`;
            return `/api/image-proxy?url=${encodeURIComponent(externalUrl)}`;
          });
          setPages(pageUrls);
        } else {
          setError("Failed to load chapter pages.");
        }
      } catch (err) {
        if (!active) return;
        console.error(err);
        setError("Network error occurred.");
      } finally {
        if (active) setLoading(false);
      }
    };
    
    fetchPages();
    return () => { active = false; };
  }, [id]);

  return { pages, loading, error };
}
