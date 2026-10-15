import { Link } from "react-router-dom";
import { Manga } from "../types/mangadex";
import { getCoverUrl } from "../api/cover";

interface HeroMangaCardProps {
  manga: Manga;
}

export function HeroMangaCard({ manga }: HeroMangaCardProps) {
  const titleObj = manga.attributes?.title || {};
  const title = titleObj.en || Object.values(titleObj)[0] || "Unknown Title";
  
  const descObj = manga.attributes?.description || {};
  const desc = descObj.en || Object.values(descObj)[0] || "";
  
  const coverArtRel = manga.relationships?.find((r: any) => r.type === "cover_art");
  const coverFile = coverArtRel ? coverArtRel.attributes?.fileName : null;
  const coverUrl = coverFile ? getCoverUrl(manga.id, coverFile, "512") : "";
  
  const authorRel = manga.relationships?.find((r: any) => r.type === "author");
  const authorName = authorRel ? authorRel.attributes?.name : "Unknown Author";

  return (
    <div className="relative overflow-hidden bento-card border border-border min-h-[350px] flex group">
       {/* Background Blur Overlay */}
       <div 
         className="absolute inset-0 bg-cover bg-center opacity-10 blur-xl scale-110 pointer-events-none"
         style={{ backgroundImage: `url(${coverUrl})` }}
       />
       
       <Link to={`/manga/${manga.id}`} className="relative flex flex-col md:flex-row w-full h-full p-4 md:p-6 gap-6 z-10 hover:border-accent/50 transition-colors">
         {/* Cover Image */}
         <div className="shrink-0 w-32 md:w-56 aspect-[2/3] rounded-lg overflow-hidden border border-border shadow-2xl group-hover:scale-[1.02] transition-transform duration-500">
           {coverUrl ? (
             <img src={coverUrl} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
           ) : (
             <div className="w-full h-full bg-dark flex justify-center items-center text-xs text-gray-500 lowercase mono">No Cover</div>
           )}
         </div>
         
         {/* Content */}
         <div className="flex-1 flex flex-col justify-between pt-2">
           <div>
             <h1 className="text-2xl md:text-4xl font-bold text-foreground leading-tight line-clamp-2 md:line-clamp-none mb-2 group-hover:text-amber-50 transition-colors">{title}</h1>
             
             <div className="flex items-center flex-wrap gap-2 mb-4">
               {manga.attributes.tags.slice(0, 3).map((tag: any) => (
                 <span key={tag.id} className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/20">
                   {tag.attributes?.name?.en === 'Suggestive' ? 'Suggestive' : tag.attributes?.name?.en}
                 </span>
               ))}
               <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-dark border border-border text-gray-400">
                 {manga.attributes.status}
               </span>
             </div>
             
             <p className="text-xs md:text-sm text-gray-300/80 leading-relaxed line-clamp-4 md:line-clamp-6 font-serif">
               {desc}
             </p>
           </div>
           
           <div className="mt-4 flex justify-between items-end">
             <span className="text-accent text-xs font-bold uppercase tracking-widest">{authorName}</span>
           </div>
         </div>
       </Link>
    </div>
  );
}
