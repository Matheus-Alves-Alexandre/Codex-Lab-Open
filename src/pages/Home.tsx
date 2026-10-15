import { useHomeFeed } from "../hooks/useHomeFeed";
import { MangaCard } from "../components/MangaCard";
import { HeroMangaCard } from "../components/HeroMangaCard";
import { CompactMangaCard } from "../components/CompactMangaCard";
import { Loader2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function Home() {
  const { heroManga, latestUpdates, recommended, selfPublished, seasonal, recentlyAdded, loading } = useHomeFeed();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold mono">Loading Frontend...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-10">
      
      {/* Hero Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
           <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Popular New Titles</h2>
        </div>
        {heroManga && <HeroMangaCard manga={heroManga} />}
      </section>

      {/* Latest Updates Grid */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
           <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">Latest Updates</h2>
           <Link to="/search" className="text-gray-500 hover:text-white transition-colors">
             <ArrowRight className="w-5 h-5" />
           </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {latestUpdates.map(manga => (
            <CompactMangaCard key={manga.id} manga={manga} />
          ))}
        </div>
      </section>

      {/* Recommended Horizontal Scroll */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
           <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">Recommended</h2>
           <Link to="/search" className="text-gray-500 hover:text-white transition-colors">
             <ArrowRight className="w-5 h-5" />
           </Link>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar">
          {recommended.map(manga => (
            <div key={manga.id} className="min-w-[160px] max-w-[160px] md:min-w-[200px] md:max-w-[200px] snap-start">
               <MangaCard manga={manga} />
            </div>
          ))}
        </div>
      </section>

      {/* Self-Published Horizontal Scroll */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
           <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">Self-Published</h2>
           <Link to="/search" className="text-gray-500 hover:text-white transition-colors">
             <ArrowRight className="w-5 h-5" />
           </Link>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar">
          {selfPublished.map(manga => (
            <div key={manga.id} className="min-w-[160px] max-w-[160px] md:min-w-[200px] md:max-w-[200px] snap-start">
               <MangaCard manga={manga} />
            </div>
          ))}
        </div>
      </section>

      {/* Seasonal Horizontal Scroll */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
           <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">Seasonal: Spring 2026</h2>
           <Link to="/search" className="text-gray-500 hover:text-white transition-colors">
             <ArrowRight className="w-5 h-5" />
           </Link>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar">
          {seasonal.map(manga => (
            <div key={manga.id} className="min-w-[160px] max-w-[160px] md:min-w-[200px] md:max-w-[200px] snap-start">
               <MangaCard manga={manga} />
            </div>
          ))}
        </div>
      </section>
      
      {/* Recently Added Horizontal Scroll */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
           <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">Recently Added</h2>
           <Link to="/search" className="text-gray-500 hover:text-white transition-colors">
             <ArrowRight className="w-5 h-5" />
           </Link>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar">
          {recentlyAdded.map(manga => (
            <div key={manga.id} className="min-w-[160px] max-w-[160px] md:min-w-[200px] md:max-w-[200px] snap-start">
               <MangaCard manga={manga} />
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
