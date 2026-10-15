import React, { useEffect, useState } from "react";
import { useReaderStore } from "../store/useReaderStore";
import { ArrowLeft, ArrowRight, Heart } from "lucide-react";

interface PageViewerProps {
  pages: string[];
  nextChapterId?: string | null;
  prevChapterId?: string | null;
  onNavigateChapter?: (id: string) => void;
  isFullscreen?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function PageViewer({ pages, nextChapterId, prevChapterId, onNavigateChapter, isFullscreen, isFavorite, onToggleFavorite }: PageViewerProps) {
  const { currentPage, setCurrentPage } = useReaderStore();
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  
  // Preload all pages sequentially in the background
  useEffect(() => {
    if (pages.length === 0) return;
    
    let isCancelled = false;
    let currentIndex = 0;
    
    const loadNext = () => {
      if (isCancelled || currentIndex >= pages.length) return;
      const url = pages[currentIndex];
      
      const img = new Image();
      img.onload = () => {
        currentIndex++;
        loadNext();
      };
      img.onerror = () => {
        currentIndex++;
        loadNext();
      };
      img.src = url;
    };
    
    // Give the current page a tiny head start before aggressive preloading
    const timer = setTimeout(loadNext, 300);
    
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [pages]);

  // Reset overlay when chapter changes
  useEffect(() => {
    setShowEndOverlay(false);
  }, [pages]);

  if (pages.length === 0) return null;
  
  // ensure page constraints
  const activeIndex = Math.max(0, Math.min(currentPage - 1, pages.length - 1));

  const handleNext = () => {
    if (currentPage < pages.length) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (nextChapterId && onNavigateChapter) {
      onNavigateChapter(nextChapterId);
      window.scrollTo({ top: 0 });
    } else if (!nextChapterId) {
      setShowEndOverlay(true);
    }
  };

  const handlePrev = () => {
    if (showEndOverlay) {
      setShowEndOverlay(false);
      return;
    }
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (prevChapterId && onNavigateChapter) {
      onNavigateChapter(prevChapterId);
      window.scrollTo({ top: 0 });
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightSide = clickX > rect.width / 2;

    if (isRightSide) {
      handleNext();
    } else {
      handlePrev();
    }
  };

  return (
    <div className={`flex flex-col items-center ${isFullscreen ? '' : 'gap-6'} w-full`}>
      <div className={`w-full flex flex-col items-center relative overflow-hidden ${isFullscreen ? 'h-screen justify-center' : 'max-w-4xl mx-auto bento-card p-2 md:p-4 bg-dark min-h-[60vh] justify-center'}`}>
        
        {showEndOverlay && (
          <div 
            className="absolute inset-0 bg-black/90 flex flex-col justify-center items-center z-20 p-4 text-center cursor-default backdrop-blur-sm transition-all"
            onClick={(e) => {
              // If they click left half of the overlay, dismiss it
              const rect = e.currentTarget.getBoundingClientRect();
              if (e.clientX - rect.left < rect.width / 2) {
                setShowEndOverlay(false);
              }
            }}
          >
            <div className="max-w-md p-8 bg-[#111] border border-border rounded-xl shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-widest">You've caught up!</h2>
                <p className="text-gray-400 mb-8 text-sm mono">There are no more chapters available right now. Click on the left side to go back.</p>
                
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
                  className={`flex w-full items-center justify-center gap-3 px-8 py-4 rounded-lg font-bold transition-all uppercase tracking-widest text-sm ${isFavorite ? 'bg-accent text-dark border border-accent hover:bg-accent/80' : 'bg-dark border border-border text-white hover:border-accent hover:text-accent'}`}
                >
                  <Heart className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
                  {isFavorite ? "Saved to Favorites" : "Add to Favorites"}
                </button>
            </div>
          </div>
        )}

        {pages.map((url, index) => (
          <img 
            key={url}
            src={url} 
            alt={`Page ${index + 1}`} 
            onClick={handleImageClick}
            className={`w-full h-auto object-contain transition-opacity duration-200 cursor-pointer ${index === activeIndex ? 'opacity-100 flex' : 'opacity-0 hidden'} ${isFullscreen ? 'max-h-screen bg-black' : 'bg-[#111]'}`}
            loading={index === activeIndex || index === activeIndex + 1 ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
            title="Click right half to advance, left half to go back"
          />
        ))}
      </div>
      
      {/* Hide fallback formatting if in Fullscreen to force full zen-mode immersion */}
      {!isFullscreen && (
        <div className="flex gap-4 mb-10 w-full max-w-md mx-auto">
          {currentPage === 1 && prevChapterId ? (
            <button 
              onClick={handlePrev}
              className="flex flex-col items-center justify-center flex-1 py-3 px-4 rounded-lg bg-dark border border-border text-foreground hover:border-accent hover:text-accent transition-all uppercase tracking-widest text-xs font-bold"
            >
               <div className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Prev Chapter
               </div>
            </button>
          ) : (
            <button 
              onClick={handlePrev}
              disabled={currentPage === 1}
              className="flex-1 py-3 px-4 rounded-lg bg-dark border border-border text-foreground hover:border-accent hover:text-accent disabled:opacity-50 disabled:hover:border-border disabled:hover:text-foreground transition-all uppercase tracking-widest text-xs font-bold"
            >
              Prev Page
            </button>
          )}

          {currentPage === pages.length && nextChapterId ? (
            <button 
              onClick={handleNext}
              className="flex flex-col items-center justify-center flex-1 py-3 px-4 rounded-lg bg-accent text-dark border border-accent hover:bg-accent/80 transition-all uppercase tracking-widest text-xs font-bold"
            >
               <div className="flex items-center gap-2">
                  Next Chapter <ArrowRight className="w-4 h-4" />
               </div>
            </button>
          ) : currentPage === pages.length && !nextChapterId ? (
            <button 
              onClick={handleNext}
              className="flex flex-col items-center justify-center flex-1 py-3 px-4 rounded-lg bg-dark text-accent border border-border hover:border-accent transition-all uppercase tracking-widest text-xs font-bold"
            >
               <div className="flex items-center gap-2">
                  Finish <ArrowRight className="w-4 h-4" />
               </div>
            </button>
          ) : (
            <button 
              onClick={handleNext}
              disabled={currentPage === pages.length}
              className="flex-1 py-3 px-4 rounded-lg bg-dark border border-border text-foreground hover:border-accent hover:text-accent disabled:opacity-50 disabled:hover:border-border disabled:hover:text-foreground transition-all uppercase tracking-widest text-xs font-bold"
            >
              Next Page
            </button>
          )}
        </div>
      )}
    </div>
  );
}
