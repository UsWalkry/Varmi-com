import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { DataManager } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  listingId: string;
  userId?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showText?: boolean;
  className?: string;
}

export default function FavoriteButton({ 
  listingId, 
  userId, 
  size = 'default', 
  variant = 'default',
  showText = false,
  className 
}: FavoriteButtonProps) {
  // Memoize initial favorite status to prevent unnecessary re-renders
  const initialIsFavorite = useMemo(() => {
    return userId ? DataManager.isFavorite(userId, listingId) : false;
  }, [userId, listingId]);

  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);

  const handleToggleFavorite = useCallback(() => {
    if (!userId) return;

    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);

    try {
      if (newFavoriteState) {
        DataManager.addToFavorites(userId, listingId);
      } else {
        DataManager.removeFromFavorites(userId, listingId);
      }
    } catch (error) {
      // Revert on error
      setIsFavorite(!newFavoriteState);
      console.error('Error toggling favorite:', error);
    }
  }, [userId, listingId, isFavorite]);

  if (!userId) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      className={cn(
        "transition-colors",
        isFavorite && variant === 'ghost' && "text-red-500 hover:text-red-600",
        className
      )}
    >
      <Heart 
        className={cn(
          "h-4 w-4",
          showText && "mr-2",
          isFavorite ? "fill-current text-red-500" : ""
        )} 
      />
      {showText && (isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle')}
    </Button>
  );
}