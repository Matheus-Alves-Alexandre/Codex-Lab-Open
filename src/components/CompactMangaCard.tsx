import { Link } from "react-router-dom";
import { Manga } from "../types/mangadex";
import { getCoverUrl } from "../api/cover";
import { MessageSquare } from "lucide-react";

interface CompactMangaCardProps {
  key?: string | number;
  manga: Manga;
}

export function CompactMangaCard({ manga }: CompactMangaCardProps) {
  const titleObj = manga.attributes?.title || {};
  const title = titleObj.en || Object.values(titleObj)[0] || "Unknown Title";
  
  const coverArtRel = manga.relationships?.find((r: any) => r.type === "cover_art");
  const coverFile = coverArtRel ? coverArtRel.attributes?.fileName : null;
  const coverUrl = coverFile ? getCoverUrl(manga.id, coverFile, "256") : "";

  return (
    <Link to={`/manga/${manga.id}`} className="flex gap-3 p-2 bento-card border border-border/50 hover:border-accent/50 transition-colors group">
      <div className="w-14 h-20 shrink-0 bg-dark rounded overflow-hidden border border-border object-cover">
        {coverUrl && <img src={coverUrl} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />}
      </div>
      <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
         <h4 className="font-bold text-xs text-foreground truncate group-hover:text-accent transition-colors">{title}</h4>
         <div className="flex flex-col gap-1 mt-1">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                 {/* Dummy flag icon logic, since language is not directly on manga obj without chapter includes */}
                 <span className="shrink-0 w-3 h-3 rounded-full bg-accent/20 flex items-center justify-center text-[7px]" title="Simulation">US</span>
                 <span className="text-[10px] text-gray-400 truncate mono">Ch. ?</span>
              </div>
              <MessageSquare className="w-3 h-3 text-gray-600 shrink-0" />
           </div>
           <div className="flex items-center justify-between">
              <span className="text-[9px] text-gray-500 truncate mt-0.5 max-w-[80px]">Scanlation Grp</span>
              <span className="text-[9px] text-gray-500 mono">Just now</span>
           </div>
         </div>
      </div>
    </Link>
  );
}
