import { useLibrary } from "../hooks/useLibrary";
import { MangaCard } from "../components/MangaCard";
import { MangaCarousel } from "../components/MangaCarousel";
import { useEffect, useState, useMemo } from "react";
import { getMangasByIds } from "../api/manga";
import { Manga } from "../types/mangadex";
import { Loader2 } from "lucide-react";
import { useUserReviews } from "../hooks/useUserReviews";
import { ReviewCard } from "../components/ReviewCard";
import { useAuth } from "../hooks/useAuth";
import { ReadingStatsRadar } from "../components/ReadingStatsRadar";
import { useAchievements } from "../hooks/useAchievements";
import { AchievementsPanel } from "../components/AchievementsPanel";
import { AchievementToast } from "../components/AchievementToast";

export function LibraryPage() {
  const { user } = useAuth();
  const { library, loading, updateEntry } = useLibrary();
  const { reviews, loading: loadingReviews } = useUserReviews(user?.uid);
  const { newlyUnlocked } = useAchievements();
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loadingMangas, setLoadingMangas] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    const fetchMangaData = async () => {
      if (library.length === 0) {
        setMangas([]);
        setLoadingMangas(false);
        return;
      }
      
      setLoadingMangas(true);
      const ids = library.map(entry => entry.mangaId);
      
      try {
        // Fetch up to 100 max per request, assuming < 100 library mostly
        const res = await getMangasByIds(ids.slice(0, 100));
        if (res && res.data) {
          setMangas(res.data);
        }
      } catch (err) {
        console.error("Failed to load library manga details", err);
      } finally {
        setLoadingMangas(false);
      }
    };

    fetchMangaData();
  }, [library]);

  const reading = library.filter(e => e.status === "reading");
  const favorites = library.filter(e => e.isFavorite === true);

  // Helper to get favorite mangas (raw objects) for the radar chart
  const favoriteMangaObjects = useMemo(() => {
    return mangas.filter(liveManga => 
       favorites.some(fav => fav.mangaId === liveManga.id)
    );
  }, [mangas, favorites]);

  // Helper to map DB entries back to Manga Dex live format to render in MangaCard
  const getRenderMangas = (filterList: typeof library) => {
    return filterList.map(entry => {
      const liveManga = mangas.find(m => m.id === entry.mangaId);
      
      if (!liveManga) {
         return {
            id: entry.mangaId,
            type: 'manga',
            attributes: {
               title: { en: entry.title },
               status: entry.status,
            },
            relationships: entry.coverFilename ? [
               { type: 'cover_art', attributes: { fileName: entry.coverFilename } }
            ] : []
         } as unknown as Manga & { _isNewUpdate?: boolean };
      }
      
      const isNew = liveManga.attributes?.lastChapter !== entry.lastReadChapter;
      
      return {
        ...liveManga,
        _isNewUpdate: isNew 
      } as unknown as Manga & { _isNewUpdate?: boolean };
    }).filter(Boolean);
  };

  if (loading || loadingMangas) {
      return (
        <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      );
  }

  return (
    <div className="max-w-[1400px] w-full mx-auto flex flex-col gap-6 md:gap-10 py-6 md:py-10 px-4 md:px-8">
      <AchievementToast achievement={newlyUnlocked} />
      
      {/* Intro & Radar Dashboard Header */}
      <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-stretch w-full overflow-hidden">
        <div className="flex flex-col gap-4 flex-1 pt-2 w-full min-w-0">
          
          <div className="bento-card border border-border/50 p-4 md:p-5 flex flex-col gap-4 md:gap-5 w-full min-w-0 justify-center">
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
               <span className="w-1.5 h-5 md:w-2 md:h-6 bg-accent rounded-sm"></span> Experience Stats
            </h2>

            <div className="flex flex-col gap-3 md:gap-5 w-full min-w-0">
              {[
                { label: "Titles in Library", value: library.length },
                { label: "Mangas Read", value: library.filter(e => e.status === "completed").length },
                { label: "Favorites", value: favorites.length },
                { label: "Reviews Written", value: reviews.length }
              ].map((stat, i) => {
                const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
                const goal = milestones.find(m => m > stat.value) || stat.value + 100;
                const percentage = Math.min(100, (stat.value / goal) * 100);

                return (
                  <div key={i} className="flex flex-col gap-1 md:gap-1.5 w-full min-w-0">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-gray-300">{stat.label}</span>
                      <span className="text-[9px] md:text-[10px] font-mono font-bold text-accent shrink-0 ml-2">
                         {stat.value} / <span className="text-gray-500">{goal}</span>
                      </span>
                    </div>
                    <div className="h-1.5 md:h-2.5 w-full bg-dark border border-border/50 rounded-full overflow-hidden shadow-inner shrink-0">
                      <div 
                        className="h-full bg-accent rounded-full relative"
                        style={{ width: `${percentage}%` }}
                      >
                         <div className="absolute inset-0 bg-white/20 w-full" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch gap-6 w-full xl:w-auto min-w-0">
            {favorites.length > 0 && favoriteMangaObjects.length > 0 && (
            <div className="bento-card border border-border/50 md:w-[350px] w-full shrink-0 relative overflow-hidden bg-gradient-to-br from-dark-surface to-background shadow-[0_0_20px_rgba(249,115,22,0.05)] flex items-center justify-center min-w-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-dark border-x border-b border-border/20 px-4 py-1 rounded-b-lg shadow-lg z-10 w-max max-w-full">
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">Reading Archetype</span>
                </div>
                <div className="w-full h-full min-w-0 flex items-center justify-center">
                   <ReadingStatsRadar mangas={favoriteMangaObjects} />
                </div>
            </div>
            )}

            <div className="w-full md:w-[400px] shrink-0 min-w-0">
                <AchievementsPanel />
            </div>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-4">
           <h2 className="text-xl font-bold tracking-tight text-foreground">My Reviews</h2>
           {reviews.length > 4 && (
             <button
               onClick={() => setShowAllReviews(!showAllReviews)}
               className="text-xs uppercase tracking-widest font-bold text-gray-500 hover:text-accent transition-colors"
             >
               {showAllReviews ? "Show less" : `View all (${reviews.length})`}
             </button>
           )}
        </div>
        {loadingReviews ? (
           <div className="flex justify-center py-4 text-accent">
             <Loader2 className="w-6 h-6 animate-spin" />
           </div>
        ) : reviews.length === 0 ? (
           <p className="text-sm text-gray-500 font-mono">You haven't reviewed any mangas yet.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(showAllReviews ? reviews : reviews.slice(0, 4)).map((review) => (
               <ReviewCard key={review.id} review={review} showMangaInfo />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center border-b border-border/50 pb-2 mb-4">
           <h2 className="text-xl font-bold tracking-tight text-foreground">Reading</h2>
        </div>
        {reading.length === 0 ? (
          <p className="text-sm text-gray-500 font-mono">No mangas currently reading.</p>
        ) : (
          <MangaCarousel mangas={getRenderMangas(reading)} />
        )}
      </section>

      <section>
        <div className="flex items-center border-b border-border/50 pb-2 mb-4">
           <h2 className="text-xl font-bold tracking-tight text-foreground">Favorites</h2>
        </div>
        {favorites.length === 0 ? (
           <p className="text-sm text-gray-500 font-mono">No favorites yet.</p>
        ) : (
          <MangaCarousel mangas={getRenderMangas(favorites)} />
        )}
      </section>
    </div>
  );
}
