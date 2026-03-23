import { Star } from 'lucide-react';
import { coerceNumber } from '@/lib/number-utils';

const STAR_COUNT = 5;

export interface StarRatingDisplayProps {
  rating?: number | string | null;
  reviewCount?: number | string | null;
  className?: string;
}

export function StarRatingDisplay({
  rating,
  reviewCount,
  className
}: StarRatingDisplayProps) {
  const numericRating = coerceNumber(rating, 0);
  const safeRating = Number.isFinite(numericRating)
    ? Math.min(Math.max(numericRating, 0), 5)
    : 0;
  const numericCount = coerceNumber(reviewCount, 0);
  const safeCount = Number.isFinite(numericCount) && numericCount > 0
    ? Math.round(numericCount)
    : 0;
  const hasReviews = safeCount > 0 && safeRating > 0;
  const displayRating = hasReviews ? safeRating : 0;
  const fillPercentage = hasReviews ? (displayRating / 5) * 100 : 0;

  const rootClassName = ['inline-flex items-center gap-2', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName} aria-label={`Ortalama puan ${safeRating.toFixed(1)} / 5`}>
      <div className="relative flex text-gray-300" aria-hidden="true">
        <div className="flex">
          {Array.from({ length: STAR_COUNT }).map((_, idx) => (
            <Star key={`base-${idx}`} className="h-4 w-4" strokeWidth={1.5} fill="none" />
          ))}
        </div>
        {hasReviews && (
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercentage}%` }}>
            <div className="flex text-yellow-400">
              {Array.from({ length: STAR_COUNT }).map((_, idx) => (
                <Star key={`fill-${idx}`} className="h-4 w-4 fill-current" strokeWidth={1.2} />
              ))}
            </div>
          </div>
        )}
      </div>
      {hasReviews ? (
        <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
          {displayRating.toFixed(1)} / 5 ({safeCount})
        </span>
      ) : (
        <span className="text-sm text-gray-500 whitespace-nowrap">Henüz değerlendirme yok</span>
      )}
    </div>
  );
}

export default StarRatingDisplay;
