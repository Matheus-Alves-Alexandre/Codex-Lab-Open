import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MangaCard } from "./MangaCard";
import { Manga } from "../types/mangadex";

interface MangaCarouselProps {
  mangas: (Manga & { _isNewUpdate?: boolean })[];
}

export function MangaCarousel({ mangas }: MangaCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth * 0.75 : scrollLeft + clientWidth * 0.75;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (mangas.length === 0) return null;

  return (
    <div className="relative group max-w-[240px] mx-auto md:max-w-none md:mx-0 md:-mx-4 px-2 md:px-4">
      <button
        onClick={() => scroll("left")}
        className="absolute -left-6 md:left-0 top-[40%] md:top-1/2 -translate-y-1/2 z-20 bg-black/80 p-1 md:p-3 rounded-full md:rounded-r-xl md:rounded-l-none text-white opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:text-accent border border-border md:border-l-0 shadow-2xl"
        title="Scroll Left"
      >
        <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
      </button>

      <div 
        ref={scrollRef}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar py-2 md:py-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {mangas.map((manga) => (
          <div key={manga.id} className="w-[calc(50%-6px)] min-w-[calc(50%-6px)] sm:min-w-[140px] sm:w-[140px] md:min-w-[160px] md:w-[160px] flex-none snap-start relative transition-transform duration-300 hover:-translate-y-1">
            {manga._isNewUpdate && (
               <div className="absolute -top-2 -right-2 z-10 bg-accent text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg animate-pulse border border-accent-foreground/20">
                 New!!
               </div>
            )}
            <MangaCard manga={manga} />
          </div>
        ))}
      </div>

      <button
        onClick={() => scroll("right")}
        className="absolute -right-6 md:right-0 top-[40%] md:top-1/2 -translate-y-1/2 z-20 bg-black/80 p-1 md:p-3 rounded-full md:rounded-l-xl md:rounded-r-none text-white opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:text-accent border border-border md:border-r-0 shadow-2xl"
        title="Scroll Right"
      >
        <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
      </button>
    </div>
  );
}
