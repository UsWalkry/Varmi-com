import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { DataManager } from '@/lib/mockData';
import { toast } from 'sonner';

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
  variant = 'outline',
  showText = false,
  className = ''
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Only check favorite status once when component mounts
  useEffect(() => {
    if (userId && listingId) {
      try {
        const favoriteStatus = DataManager.isFavorite(userId, listingId);
        setIsFavorite(favoriteStatus);
      } catch (error) {
        console.error('Error checking favorite status:', error);
        setIsFavorite(false);
      }
    }
  }, []); // Empty dependency array - only run once

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId) {
      toast.error('Favorilere eklemek için giriş yapın');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);

    try {
      if (isFavorite) {
        DataManager.removeFromFavorites(userId, listingId);
        setIsFavorite(false);
        toast.success('Favorilerden kaldırıldı');
      } else {
        DataManager.addToFavorites(userId, listingId);
        setIsFavorite(true);
        toast.success('Favorilere eklendi');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`${className} ${isFavorite ? 'text-red-500 hover:text-red-600' : ''}`}
    >
      <Heart 
        className={`h-4 w-4 ${showText ? 'mr-2' : ''} ${
          isFavorite ? 'fill-current' : ''
        }`} 
      />
      {showText && (isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle')}
    </Button>
  );
}