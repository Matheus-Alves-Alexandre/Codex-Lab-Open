import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useMangaDetail } from "../hooks/useMangaDetail";
import { useChapterFeed } from "../hooks/useChapterFeed";
import { useLibrary } from "../hooks/useLibrary";
import { useReviews } from "../hooks/useReviews";
import { getCoverUrl } from "../api/cover";
import { Loader2, ArrowLeft, Heart, BookOpen, Play, Star, Trash2, PenLine } from "lucide-react";
import { ChapterList } from "../components/ChapterList";
import { StarRating } from "../components/StarRating";
import { ReviewCard } from "../components/ReviewCard";

export function MangaDetail() {
  const { id } = useParams<{ id: string }>();
  const { manga, loading: loadingManga } = useMangaDetail(id);
  const [selectedLang, setSelectedLang] = useState<string>("");
  const { chapters, loading: loadingChapters } = useChapterFeed(id, selectedLang);
  const { library, addEntry, updateEntry, user } = useLibrary();
  const { reviews, userReview, saveReview, removeReview, loading: loadingReviews } = useReviews(id);

  const [activeTab, setActiveTab] = useState<"chapters" | "reviews">("chapters");
  const [reviewRating, setReviewRating] = useState<number>(userReview?.rating || 0);
  const [reviewText, setReviewText] = useState<string>(userReview?.text || "");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  const reviewSectionRef = useRef<HTMLDivElement>(null);

  // Sync state if userReview arrives later
  useEffect(() => {
    if (userReview) {
      setReviewRating(userReview.rating);
      setReviewText(userReview.text);
    }
  }, [userReview]);

  if (loadingManga) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!manga) {
    return <div className="text-center py-20 text-gray-500">Manga not found.</div>;
  }

  const titleObj = manga.attributes?.title || {};
  const title = titleObj.en || Object.values(titleObj)[0] || "Unknown Title";
  const descObj = manga.attributes?.description || {};
  const desc = descObj.en || Object.values(descObj)[0] || "No description available.";
  
  const coverArtRel = manga.relationships?.find((r: any) => r.type === "cover_art");
  const authorRel = manga.relationships?.find((r: any) => r.type === "author");
  
  const coverFile = coverArtRel ? coverArtRel.attributes?.fileName : null;
  const coverUrl = coverFile ? getCoverUrl(manga.id, coverFile) : "";
  const authorName = authorRel ? authorRel.attributes?.name : "Unknown Author";

  const availableLanguages = manga.attributes?.availableTranslatedLanguages || [];

  const libraryEntry = library.find(entry => entry.mangaId === id);

  const toggleReading = () => {
    if (!id || !user) return;
    if (libraryEntry && libraryEntry.status === "reading") {
       updateEntry(id, { status: "plan_to_read" });
    } else if (libraryEntry) {
       updateEntry(id, { status: "reading" });
    } else {
       addEntry({
         mangaId: id,
         title,
         coverFilename: coverFile || "",
         status: "reading",
         isFavorite: false
       });
    }
  };

  const toggleFavorite = () => {
    if (!id || !user) return;
    if (libraryEntry) {
       updateEntry(id, { isFavorite: !libraryEntry.isFavorite });
    } else {
       addEntry({
         mangaId: id,
         title,
         coverFilename: coverFile || "",
         status: "plan_to_read",
         isFavorite: true
       });
    }
  };

  const handleReviewSubmit = async () => {
    if (reviewRating === 0 || !reviewText.trim()) return;
    setIsSubmittingReview(true);
    await saveReview(reviewRating, reviewText, title, coverUrl);
    setIsSubmittingReview(false);
  };
  
  const scrollToReview = () => {
    setActiveTab("reviews");
    setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-4">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-xs font-bold tracking-widest uppercase mb-2">
        <ArrowLeft className="w-4 h-4" />
        Back to search
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Cover Art Bento */}
        <div className="bento-card p-4 md:col-span-4 lg:col-span-3 flex flex-col gap-4 justify-between">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-dark">
            {coverUrl ? (
              <img src={coverUrl} alt={title} className="w-full h-full object-cover block" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs uppercase tracking-widest text-gray-600 mono">No Cover</div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {user ? (
               <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={toggleReading}
                     className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border font-bold text-xs uppercase tracking-wider transition-colors ${libraryEntry?.status === 'reading' ? 'bg-accent border-accent text-white hover:bg-accent/80' : 'bg-dark border-border text-gray-400 hover:text-foreground hover:border-gray-500'}`}
                   >
                     <BookOpen className="w-3.5 h-3.5" />
                     {libraryEntry?.status === 'reading' ? 'Reading' : 'Read'}
                   </button>
                   <button 
                     onClick={toggleFavorite}
                     className={`shrink-0 flex items-center justify-center px-3 py-2.5 rounded-lg border font-bold text-xs transition-colors ${libraryEntry?.isFavorite ? 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20' : 'bg-dark border-border text-gray-400 hover:text-red-400 hover:border-red-400/50'}`}
                     title="Favorite"
                   >
                     <Heart className={`w-4 h-4 ${libraryEntry?.isFavorite ? 'fill-current' : ''}`} />
                   </button>
                 </div>
                 
                 {libraryEntry?.lastReadChapter && (
                   <Link
                     to={`/reader/${libraryEntry.lastReadChapter}`}
                     state={{ mangaId: manga.id, title }}
                     className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-accent/20 bg-accent/10 text-accent font-bold text-xs uppercase tracking-wider hover:bg-accent hover:border-accent hover:text-white transition-all group"
                   >
                     <Play className="w-3 h-3 group-hover:scale-110 transition-transform" />
                     Continue Reading
                   </Link>
                 )}
                 
                 <button
                   onClick={scrollToReview}
                   className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg shadow-sm border border-border bg-dark text-gray-300 font-bold text-xs uppercase tracking-wider hover:bg-card hover:text-white transition-colors"
                 >
                    <PenLine className="w-3.5 h-3.5" />
                    Write a Review
                 </button>
               </div>
            ) : (
               <div className="flex flex-col gap-2">
                 <div className="text-center p-3 bg-dark/50 border border-border/50 rounded-xl">
                   <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Sign in to track progress</span>
                 </div>
                 <button
                   onClick={scrollToReview}
                   className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg shadow-sm border border-border bg-dark text-gray-400 font-bold text-xs uppercase tracking-wider hover:bg-card hover:text-white transition-colors"
                 >
                    <PenLine className="w-3 h-3" />
                    Read Reviews
                 </button>
               </div>
            )}
          </div>
          <div className="code-block flex flex-col gap-1 text-[10px]">
             <span className="text-gray-500 font-bold uppercase">ID</span>
             <span className="text-foreground mono tracking-wider truncate">{manga.id}</span>
          </div>
        </div>
        
        {/* Main Info Bento */}
        <div className="bento-card md:col-span-8 lg:col-span-9 flex flex-col gap-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-foreground">{title}</h1>
              <p className="text-accent uppercase tracking-[0.2em] text-xs font-bold">{authorName}</p>
            </div>
            <span className="px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider bg-dark border border-border text-gray-300 whitespace-nowrap">
              {manga.attributes?.status || "Unknown"}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(manga.attributes?.tags || []).map((tag: any) => (
              <span key={tag.id} className="px-2 py-1 rounded bg-dark border border-border text-[10px] uppercase font-bold tracking-wider text-gray-400 hover:text-white hover:border-gray-500 cursor-default transition-colors shrink-0">
                {tag.attributes?.name?.en || "Unknown Tag"}
              </span>
            ))}
          </div>

          <div className="mt-4 p-4 bg-dark rounded-xl border border-border flex-1">
            <h3 className="text-[10px] text-gray-500 font-bold uppercase mb-3">Synopsis</h3>
            <p className="whitespace-pre-line leading-relaxed text-sm text-gray-300 font-serif">
              {desc}
            </p>
          </div>
        </div>

        {/* Content Tabs (Chapters / Reviews) */}
        <div className="bento-card col-span-1 md:col-span-12 flex flex-col gap-4">
          <div className="flex items-center gap-6 border-b border-border pb-[-1px]">
             <button 
               onClick={() => setActiveTab('chapters')}
               className={`pb-4 text-sm font-bold tracking-widest uppercase transition-colors relative ${activeTab === 'chapters' ? 'text-accent' : 'text-gray-500 hover:text-gray-300'}`}
             >
               Chapters
               {activeTab === 'chapters' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full shadow-[0_0_8px_rgba(255,103,64,0.6)]" />}
             </button>
             <button 
               onClick={() => setActiveTab('reviews')}
               className={`pb-4 text-sm font-bold tracking-widest uppercase transition-colors relative ${activeTab === 'reviews' ? 'text-accent' : 'text-gray-500 hover:text-gray-300'}`}
             >
               Reviews
               {activeTab === 'reviews' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full shadow-[0_0_8px_rgba(255,103,64,0.6)]" />}
             </button>
          </div>

          <div className="pt-2">
            {activeTab === 'chapters' ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold">Chapters Feed</h2>
                  <div className="flex items-center gap-2">
                    <select 
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                      className="bg-dark text-gray-300 border border-border rounded px-2 py-1 text-xs mono focus:outline-none focus:border-accent"
                    >
                      <option value="">EN / PT-BR</option>
                      {availableLanguages.map((lang: string) => (
                        <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                      ))}
                    </select>
                    <span className="text-xs px-2 py-1 bg-dark text-gray-400 border border-border rounded mono min-w-[3.5rem] text-center flex justify-center">
                      {loadingChapters ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : `${chapters.length}`}
                    </span>
                  </div>
                </div>
                
                {loadingChapters ? (
                  <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  </div>
                ) : chapters.length === 0 ? (
                  <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20 flex gap-4 items-center">
                     <div className="w-10 h-10 flex-shrink-0 bg-accent rounded-full flex items-center justify-center font-bold text-black">!</div>
                     <p className="text-xs text-gray-300 italic">No chapters available in {selectedLang ? selectedLang.toUpperCase() : "English/Portuguese"} for this title.</p>
                  </div>
                ) : (
                  <ChapterList chapters={chapters} />
                )}
              </div>
            ) : (
              <div ref={reviewSectionRef} className="flex flex-col gap-10">
                
                {/* Leave a Review Section */}
                <div className="flex flex-col gap-4 p-4 md:p-6 bg-dark border border-border rounded-xl">
                  {user ? (
                    <>
                      <div className="flex justify-between items-center">
                         <h3 className="text-lg font-bold text-foreground">
                           {userReview ? "Edit your review" : "Leave a review"}
                         </h3>
                         {userReview && (
                           <button 
                             onClick={removeReview}
                             className="text-red-500 hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 transition-colors"
                             title="Delete Review"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                         <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Rating</span>
                         <StarRating 
                           rating={reviewRating} 
                           onRatingChange={setReviewRating} 
                           size="lg"
                         />
                      </div>

                      <div className="flex flex-col gap-2 mt-2">
                         <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Review</span>
                         <textarea 
                           className="bg-background border border-border rounded-lg p-3 text-foreground font-serif text-sm focus:outline-none focus:border-accent min-h-[100px] resize-y"
                           placeholder="What did you think about this manga?"
                           value={reviewText}
                           onChange={(e) => setReviewText(e.target.value)}
                           maxLength={2000}
                         />
                      </div>

                      <button
                        onClick={handleReviewSubmit}
                        disabled={reviewRating === 0 || !reviewText.trim() || isSubmittingReview}
                        className="mt-2 self-end bg-accent text-dark font-bold hover:bg-accent/80 transition-colors px-6 py-2 rounded uppercase tracking-widest text-xs shadow-lg shadow-accent/20 disabled:opacity-50 disabled:shadow-none"
                      >
                        {isSubmittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : (userReview ? "Update" : "Publish")}
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-400 font-mono">You must be signed in to leave a review.</p>
                    </div>
                  )}
                </div>

                {/* Community Reviews List */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm uppercase tracking-widest text-gray-500 font-bold">Community Reviews ({reviews.length})</h3>
                  
                  {loadingReviews ? (
                     <div className="flex justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                     </div>
                  ) : reviews.length === 0 ? (
                     <p className="text-sm text-gray-500 italic font-serif">No reviews yet. Be the first to share your thoughts!</p>
                  ) : (
                     <div className="flex flex-col gap-4">
                        {reviews.map(review => (
                          <ReviewCard key={review.id} review={review} />
                        ))}
                     </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
