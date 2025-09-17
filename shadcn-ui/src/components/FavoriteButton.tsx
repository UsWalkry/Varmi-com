import { useState } from 'react';
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
  const [isFavorite, setIsFavorite] = useState(
    userId ? DataManager.isFavorite(userId, listingId) : false
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId) {
      toast.error('Favorilere eklemek için giriş yapın');
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorite) {
        const removed = DataManager.removeFromFavorites(userId, listingId);
        if (removed) {
          setIsFavorite(false);
          toast.success('Favorilerden kaldırıldı');
        }
      } else {
        DataManager.addToFavorites(userId, listingId);
        setIsFavorite(true);
        toast.success('Favorilere eklendi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

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