import React from "react";
import { Link } from "react-router-dom";
import { Manga } from "../types/mangadex";
import { getCoverUrl } from "../api/cover";
import { useLibrary } from "../hooks/useLibrary";
import { useAuth } from "../hooks/useAuth";
import { Heart } from "lucide-react";

interface MangaCardProps {
  key?: string | number;
  manga: Manga;
}

export function MangaCard({ manga }: MangaCardProps) {
  const { user } = useAuth();
  const { library, addEntry, updateEntry } = useLibrary();

  const titleObj = manga.attributes?.title || {};
  const title = titleObj.en || Object.values(titleObj)[0] || "Unknown Title";
  const coverArtRel = manga.relationships?.find((r: any) => r.type === "cover_art");
  const coverFile = coverArtRel ? coverArtRel.attributes?.fileName : null;
  const coverUrl = coverFile ? getCoverUrl(manga.id, coverFile, "512") : "";

  const libraryEntry = library.find(entry => entry.mangaId === manga.id);
  const isFavorite = libraryEntry?.isFavorite;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to the manga details
    e.stopPropagation(); // Stop bubbling up
    if (!user) return; // Note: Could add a toast here telling them to login
    
    if (libraryEntry) {
       updateEntry(manga.id, { isFavorite: !isFavorite });
    } else {
       addEntry({
         mangaId: manga.id,
         title,
         coverFilename: coverFile || "",
         status: "plan_to_read",
         isFavorite: true
       });
    }
  };

  return (
    <Link to={`/manga/${manga.id}`} className="group bento-card p-3 flex flex-col gap-3 h-full hover:-translate-y-1 transition-transform relative">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-dark border border-border">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs uppercase tracking-widest mono">No Cover</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Quick Favorite Overlay Button */}
        {user && (
           <button 
             onClick={handleFavoriteClick}
             className={`absolute top-2 right-2 p-1.5 rounded-full z-10 transition-all duration-300 ${isFavorite ? 'bg-red-500 text-white opacity-100' : 'bg-dark/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-dark hover:text-red-400'}`}
             title="Toggle Favorite"
           >
             <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
           </button>
        )}

      </div>
      <div className="flex flex-col flex-1 justify-between">
        <h3 className="font-bold text-sm line-clamp-2 group-hover:text-accent transition-colors">
          {title}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-dark border border-border text-gray-400">
            {manga.attributes.status}
          </span>
          <span className="text-gray-500 text-[10px] mono">ID: {manga.id.split('-')[0]}</span>
        </div>
      </div>
    </Link>
  );
}
