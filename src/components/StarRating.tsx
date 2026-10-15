import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({ rating, maxRating = 5, onRatingChange, readOnly = false, size = "md" }: StarRatingProps) {
  const sizeClass = {
    sm: "w-3 h-3 md:w-4 md:h-4",
    md: "w-5 h-5 md:w-6 md:h-6",
    lg: "w-7 h-7 md:w-8 md:h-8"
  }[size];

  return (
    <div className="flex items-center gap-1">
      {[...Array(maxRating)].map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= Math.round(rating); // handle half stars via rounding for UI simplicity
        
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => onRatingChange?.(starValue)}
            className={`${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"} focus:outline-none`}
            title={`${starValue} Stars`}
          >
            <Star 
              className={`${sizeClass} ${isFilled ? "fill-accent text-accent" : "text-border"}`} 
            />
          </button>
        );
      })}
    </div>
  );
}
