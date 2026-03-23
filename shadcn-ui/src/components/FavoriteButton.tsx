import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { DataManager } from '@/lib/mockData';
import { supabaseEnabled, addToFavorites, removeFromFavorites, isFavorite } from '@/lib/api';
import { mysqlAPI } from '@/lib/mysql-api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FavoriteButtonProps {
  listingId: string;
  userId?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showText?: boolean;
  className?: string;
  initialState?: boolean; // Force initial favorite state
  onFavoriteChange?: (listingId: string, isFavorite: boolean) => void; // Callback when favorite status changes
  isOwnListing?: boolean; // Hide button if user is viewing their own listing
}

export default function FavoriteButton({ 
  listingId, 
  userId, 
  size = 'default', 
  variant = 'default',
  showText = false,
  className,
  initialState,
  onFavoriteChange,
  isOwnListing = false
}: FavoriteButtonProps) {
  const [isFavoriteState, setIsFavoriteState] = useState(initialState ?? false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(initialState === undefined);

  // Don't render button for own listings
  if (isOwnListing) {
    return null;
  }

  // Load initial favorite status
  useEffect(() => {
    console.log('🚀 FavoriteButton useEffect triggered:', { userId, listingId, initialState });
    
    if (!userId) {
      console.log('❌ No userId provided, skipping favorite status check');
      setIsInitialLoading(false);
      return;
    }
    
    // If initialState is provided, use it and skip API call
    if (initialState !== undefined) {
      console.log('ℹ️ Using provided initialState:', initialState);
      setIsFavoriteState(initialState);
      setIsInitialLoading(false);
      return;
    }
    
    const loadFavoriteStatus = async () => {
      try {
        // Always use MySQL API since Supabase is disabled
        console.log('🔍 Loading favorite status for:', { listingId, userId });
        const favoriteStatus = await mysqlAPI.isFavorite(listingId);
        console.log('✅ Favorite status loaded:', { listingId, favoriteStatus });
        setIsFavoriteState(favoriteStatus);
      } catch (error) {
        console.error('❌ Error loading favorite status:', error);
        // Fall back to localStorage if API fails
        const favoriteStatus = DataManager.isFavorite(userId, listingId);
        console.log('🔄 Fallback to localStorage:', { listingId, favoriteStatus });
        setIsFavoriteState(favoriteStatus);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadFavoriteStatus();
  }, [userId, listingId, initialState]);

  const handleToggleFavorite = useCallback(async () => {
    if (!userId || isLoading) return;

    const newFavoriteState = !isFavoriteState;
    console.log('🔄 Toggle favorite:', { listingId, userId, currentState: isFavoriteState, newState: newFavoriteState });
    setIsLoading(true);
    setIsFavoriteState(newFavoriteState);

    try {
      // Always use MySQL API since Supabase is disabled
      if (newFavoriteState) {
        console.log('➕ Adding to favorites:', listingId);
        console.log('🔍 FavoriteButton props debug:', { listingId, userId, newFavoriteState });
        const response = await mysqlAPI.addToFavorites(listingId);
        console.log('📥 Add favorites response:', response);
        if (response.success) {
          toast.success(response.message || 'İlan favorilere eklendi');
          onFavoriteChange?.(listingId, true);
        } else {
          throw new Error(response.error || 'Favorilere eklenemedi');
        }
      } else {
        console.log('➖ Removing from favorites:', listingId);
        const response = await mysqlAPI.removeFromFavorites(listingId);
        console.log('📥 Remove favorites response:', response);
        if (response.success) {
          toast.success(response.message || 'İlan favorilerden kaldırıldı');
          onFavoriteChange?.(listingId, false);
        } else {
          throw new Error(response.error || 'Favorilerden kaldırılamadı');
        }
      }
    } catch (error: any) {
      // Revert on error
      setIsFavoriteState(!newFavoriteState);
      console.error('Error toggling favorite:', error);
      
      // Special case: trying to favorite own listing
      if (error?.error?.includes('Kendi ilanınızı') || error?.error?.includes('kendi ilanınızı')) {
        toast.info('Kendi ilanınızı favorilere ekleyemezsiniz');
        return;
      }
      
      // If listing doesn't exist anymore and we're trying to add it,
      // remove it from favorites silently
      if (error?.error === 'Bu ilan artık mevcut değil' && newFavoriteState) {
        console.log('🗑️ Listing no longer exists, removing from favorites silently');
        try {
          await mysqlAPI.removeFromFavorites(listingId);
          setIsFavoriteState(false);
          toast.info('İlan artık mevcut olmadığı için favorilerden kaldırıldı');
          
          // Reload page to update favorites list
          window.location.reload();
          return;
        } catch (removeError) {
          console.error('Failed to remove non-existent listing from favorites:', removeError);
        }
      }
      
      // Show error message
      const message = error?.error || 'Favori işlemi başarısız';
      toast.error(message);
      
      // Fall back to localStorage
      try {
        if (newFavoriteState) {
          DataManager.addToFavorites(userId, listingId);
          setIsFavoriteState(true);
        } else {
          DataManager.removeFromFavorites(userId, listingId);
          setIsFavoriteState(false);
        }
      } catch (fallbackError) {
        console.error('Fallback favorite operation failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, listingId, isFavoriteState, isLoading]);

  if (!userId) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={(e) => {
        e.stopPropagation(); // Prevent event from bubbling to parent Card
        handleToggleFavorite();
      }}
      disabled={isLoading || isInitialLoading}
      className={cn(
        "flex items-center gap-2 transition-colors",
        isFavoriteState 
          ? "text-red-500 hover:text-red-600" 
          : "text-muted-foreground hover:text-red-500",
        className
      )}
    >
      <Heart 
        className={cn(
          "h-4 w-4 transition-all", 
          isFavoriteState && "fill-current",
          isInitialLoading && "animate-pulse"
        )} 
      />
      {showText && (
        <span className="text-sm">
          {isFavoriteState ? 'Favorilerde' : 'Favorilere Ekle'}
        </span>
      )}
    </Button>
  );
}