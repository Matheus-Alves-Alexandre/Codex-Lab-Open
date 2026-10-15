import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useChapterPages } from "../hooks/useChapterPages";
import { useReaderStore } from "../store/useReaderStore";
import { PageViewer } from "../components/PageViewer";
import { Loader2, ArrowLeft, Info, CheckCircle, Maximize, Minimize, Heart } from "lucide-react";
import { useLibrary } from "../hooks/useLibrary";
import { getChapter } from "../api/chapter";
import { useChapterFeed } from "../hooks/useChapterFeed";

export function Reader() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { pages, loading, error } = useChapterPages(chapterId);
  const { currentPage, setCurrentPage } = useReaderStore();
  const { library, loading: libraryLoading, updateEntry, addEntry, user } = useLibrary();
  
  const [synced, setSynced] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resolvedMangaId, setResolvedMangaId] = useState<string | null>(location.state?.mangaId || null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const progressAttempt = useRef('');

  // Manage favorite status dynamically
  const entry = library.find(e => e.mangaId === resolvedMangaId);
  const isFavorite = entry?.isFavorite || false;

  const handleToggleFavorite = async () => {
    if (!resolvedMangaId || !user) return;
    try {
      if (entry) {
        await updateEntry(resolvedMangaId, { isFavorite: !isFavorite });
      } else {
        await addEntry({
           mangaId: resolvedMangaId,
           title: location.state?.title || "Tracking...",
           status: "reading",
           isFavorite: true,
           lastReadChapter: chapterId
        });
      }
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  };

  // Handle Fullscreen Detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Error toggling fullscreen", err);
    }
  };

  // Fetch mangaId if not provided by route state
  useEffect(() => {
    if (!resolvedMangaId && chapterId) {
      getChapter(chapterId).then(res => {
        const mangaRef = res.data?.relationships?.find((r: any) => r.type === "manga");
        if (mangaRef) setResolvedMangaId(mangaRef.id);
      }).catch(console.error);
    }
  }, [chapterId, resolvedMangaId]);

  // Fetch full chapter list for navigation
  const { chapters } = useChapterFeed(resolvedMangaId || undefined, "");

  // Determine prev/next chapters
  let nextChapterId: string | null = null;
  let prevChapterId: string | null = null;
  
  if (chapters.length > 0 && chapterId) {
    const currentIndex = chapters.findIndex(c => c.id === chapterId);
    if (currentIndex !== -1) {
      if (currentIndex > 0) prevChapterId = chapters[currentIndex - 1].id;
      if (currentIndex < chapters.length - 1) nextChapterId = chapters[currentIndex + 1].id;
    }
  }

  // Reset page when chapter changes
  useEffect(() => {
    setCurrentPage(1);
    setSynced(false);
    window.scrollTo({ top: 0 });
  }, [chapterId, setCurrentPage]);

  // Track progress when chapter loads
  useEffect(() => {
    if (!user || !chapterId || synced || !resolvedMangaId || libraryLoading || loading || error) return;
    const attemptKey = `${user.uid}:${chapterId}`;
    if (progressAttempt.current === attemptKey) return;
    progressAttempt.current = attemptKey;

    const trackReading = async () => {
      try {
        const entry = library.find(e => e.mangaId === resolvedMangaId);
        let saved: boolean;
        if (entry) {
          saved = await updateEntry(resolvedMangaId, {
             status: 'reading', 
             lastReadChapter: chapterId 
          });
        } else {
           saved = await addEntry({
             mangaId: resolvedMangaId,
             title: location.state?.title || "Tracking...",
             status: "reading",
             isFavorite: false,
             lastReadChapter: chapterId
           });
        }
        setSynced(saved);
      } catch (err) {
        console.error("Failed to track reading progress", err);
      }
    };

    trackReading();
  }, [chapterId, library, synced, updateEntry, addEntry, user, resolvedMangaId, location.state, libraryLoading, loading, error]);

  const handleNavigateChapter = (id: string) => {
    navigate(`/reader/${id}`, { state: { mangaId: resolvedMangaId, title: location.state?.title } });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
        <p className="text-gray-500 mono text-xs animate-pulse tracking-widest uppercase">Fetching pages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
          <Info className="w-8 h-8" />
        </div>
        <p className="text-red-500 font-bold uppercase tracking-widest text-sm">{error}</p>
        <button 
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 border border-border bg-dark rounded hover:border-accent hover:text-accent transition-colors uppercase text-xs font-bold tracking-widest"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={isFullscreen ? "bg-[#000] w-screen h-screen overflow-y-auto" : "max-w-7xl mx-auto flex flex-col gap-6"}>
      <div className={`flex items-center justify-between ${isFullscreen ? 'fixed top-0 left-0 right-0 p-4 z-50 bg-gradient-to-b from-black/80 to-transparent opacity-0 md:opacity-20 hover:opacity-100 transition-opacity pointer-events-none' : ''}`}>
        <div className={`flex items-center gap-4 ${isFullscreen ? 'pointer-events-auto' : ''}`}>
          <button 
            onClick={() => {
               if (isFullscreen) document.exitFullscreen?.();
               window.history.back();
            }}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-[10px] font-bold tracking-widest uppercase"
          >
            <ArrowLeft className="w-3 h-3" />
            Exit Reader
          </button>
          
          {user && synced && !isFullscreen && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-accent text-[8px] uppercase tracking-widest font-bold">
               <CheckCircle className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        
        <div className={`flex items-center gap-2 sm:gap-3 ${isFullscreen ? 'pointer-events-auto' : ''}`}>
          {user && (
            <button 
              onClick={handleToggleFavorite}
              className={`p-1 border text-xs sm:p-1.5 ${isFavorite ? 'bg-accent/10 border-accent text-accent' : 'bg-dark border-border text-gray-400 hover:text-white'} rounded transition-colors`}
              title="Toggle Favorite"
            >
              <Heart className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
            </button>
          )}
          <div className="px-2 sm:px-3 py-1 bg-dark border border-border rounded text-[10px] mono text-gray-400">
            Page <span className="text-white font-bold">{currentPage}</span> / {pages.length}
          </div>
          <button 
            onClick={toggleFullscreen} 
            className="p-1 sm:p-1.5 bg-dark border border-border rounded text-gray-400 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      <PageViewer 
        pages={pages} 
        nextChapterId={nextChapterId}
        prevChapterId={prevChapterId}
        onNavigateChapter={handleNavigateChapter}
        isFullscreen={isFullscreen}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
}
