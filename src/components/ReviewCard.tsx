import { Review } from "../hooks/useReviews";
import { StarRating } from "./StarRating";
import { Link } from "react-router-dom";
import React, { useState } from "react";
import { Share2, Twitter, MessageCircle, Copy, Check } from "lucide-react";

interface ReviewCardProps {
  review: Review;
  showMangaInfo?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, showMangaInfo = false }) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const date = review.createdAt?.seconds 
    ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() 
    : "Recently";

  const shareUrl = `${window.location.origin}/manga/${review.mangaId}`;
  const shareText = `I rated ${review.mangaTitle || "this manga"} ${review.rating}/5 stars!\n\n"${review.text.substring(0, 100)}${review.text.length > 100 ? '...' : ''}"\n\nRead it on Reader:`;

  const handleShareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setShowShareMenu(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="bento-card border border-border/50 hover:border-accent/50 p-2 flex gap-3 w-full relative transition-colors group">
      {showMangaInfo && review.coverFilename ? (
        <Link to={`/manga/${review.mangaId}`} className="shrink-0">
          <div className="w-14 h-20 bg-dark rounded overflow-hidden border border-border object-cover">
             <img 
               src={review.coverFilename} 
               alt={review.mangaTitle} 
               className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
               referrerPolicy="no-referrer"
             />
          </div>
        </Link>
      ) : (
        <div className="shrink-0 flex items-start pt-1">
           <img 
              src={review.authorPhoto || "https://picsum.photos/seed/avatar/100"} 
              alt={review.authorName}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-border"
           />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 justify-between py-0.5">
        <div className="flex justify-between items-start gap-1">
          {showMangaInfo ? (
             <div className="flex flex-col min-w-0 pr-6">
               <Link to={`/manga/${review.mangaId}`} className="font-bold text-xs text-foreground hover:text-accent truncate transition-colors">
                  {review.mangaTitle}
               </Link>
               <span className="text-[9px] text-gray-500 font-mono mt-0.5">{date}</span>
             </div>
          ) : (
            <div className="flex flex-col min-w-0 pr-6">
              <span className="font-bold text-xs text-foreground truncate">{review.authorName}</span>
              <span className="text-[9px] text-gray-500 font-mono mt-0.5">{date}</span>
            </div>
          )}
          
          <div className="shrink-0 flex items-center gap-1 scale-[0.8] origin-top-right">
             <StarRating rating={review.rating} readOnly size="sm" />
          </div>
        </div>
        
        <p className="text-[10px] text-gray-300 leading-tight font-serif whitespace-pre-wrap break-words mt-1 line-clamp-2">
          {review.text}
        </p>

        {/* Action Footer Button */}
        <div className="absolute bottom-2 right-2 flex items-center">
            <div className="relative">
              <button 
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-1 min-w-[20px] h-[20px] flex items-center justify-center rounded text-gray-500 hover:text-accent transition-colors"
                title="Share Review"
              >
                <Share2 className="w-3 h-3" />
              </button>

              {showShareMenu && (
                <div className="absolute bottom-full right-0 mb-1.5 w-32 bg-dark-surface border border-border rounded shadow-xl py-1 z-20 flex flex-col overflow-hidden animate-fade-in shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  <button onClick={handleShareTwitter} className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] uppercase font-bold text-gray-300 hover:bg-dark hover:text-white transition-colors text-left w-full">
                    <Twitter className="w-3 h-3 text-foreground" /> X
                  </button>
                  <button onClick={handleShareWhatsApp} className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] uppercase font-bold text-gray-300 hover:bg-dark hover:text-white transition-colors text-left w-full">
                    <MessageCircle className="w-3 h-3 text-[#25D366]" /> WhatsApp
                  </button>
                  <div className="h-px bg-border/50 my-0.5 w-full" />
                  <button onClick={handleCopyLink} className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] uppercase font-bold text-gray-300 hover:bg-dark hover:text-white transition-colors text-left w-full">
                    {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
