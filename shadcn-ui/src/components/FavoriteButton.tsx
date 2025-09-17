import { useState, useEffect, useCallback } from 'react';
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize the check to prevent infinite loops
  const checkFavoriteStatus = useCallback(() => {
    if (userId && listingId) {
      try {
        const favoriteStatus = DataManager.isFavorite(userId, listingId);
        setIsFavorite(favoriteStatus);
      } catch (error) {
        console.error('Error checking favorite status:', error);
        setIsFavorite(false);
      }
    } else {
      setIsFavorite(false);
    }
  }, [userId, listingId]);

  // Only run effect when userId or listingId changes
  useEffect(() => {
    checkFavoriteStatus();
  }, [checkFavoriteStatus]);

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId || isLoading) return;
    
    setIsLoading(true);
    
    try {
      if (isFavorite) {
        DataManager.removeFromFavorites(userId, listingId);
        setIsFavorite(false);
      } else {
        DataManager.addToFavorites(userId, listingId);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, listingId, isFavorite, isLoading]);

  // Don't render if no user
  if (!userId) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "transition-colors",
        isFavorite && "text-red-500 hover:text-red-600",
        className
      )}
    >
      <Heart 
        className={cn(
          "h-4 w-4",
          size === 'sm' && "h-3 w-3",
          size === 'lg' && "h-5 w-5",
          isFavorite && "fill-current"
        )} 
      />
      {showText && (
        <span className="ml-2">
          {isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
        </span>
      )}
    </Button>
  );
}