import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Package, TrendingUp, ShoppingCart } from 'lucide-react';
import { supabaseEnabled } from '@/lib/api';
import { Listing, DataManager } from '@/lib/mockData';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '@/lib/mysql-api';
import { motion } from 'framer-motion';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '@/lib/imageOptimization';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/use-auth-mysql';
import { toast } from 'sonner';

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'new': return 'Sıfır';
      case 'like_new': return 'Sıfır Gibi';
      case 'like-new': return 'Sıfır Gibi';
      case 'used': return '2. El';
      case 'good': return 'İyi';
      case 'fair': return 'Orta';
      case 'poor': return 'Kötü';
      case 'any': return 'Farketmez';
      default: return condition;
    }
  };

  const getDeliveryText = (deliveryType: string) => {
    switch (deliveryType) {
      case 'shipping': return 'Kargo';
      case 'pickup': return 'Elden';
      case 'both': return 'Kargo/Elden';
      default: return deliveryType;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpiringSoon = () => {
    const expiryDate = new Date(listing.expiresAt);
    const now = new Date();
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
  };

  const handleCardClick = () => {
    navigate(`/listing/${listing.id}`);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/listing/${listing.id}`);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!user) {
      toast.error('Sepete eklemek için giriş yapmalısınız');
      navigate('/?login=true');
      return;
    }

    await addToCart(listing.id);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      <Card 
        className="hover:shadow-lg transition-shadow cursor-pointer group"
        onClick={handleCardClick}
      >
        {/* Cover image with sepet button */}
        {listing.images && listing.images.length > 0 && (
          <div className="w-full overflow-hidden rounded-t-lg bg-muted aspect-[16/9] relative [&:hover_.cart-btn]:opacity-100">
            <motion.img 
              src={getOptimizedImageUrl(getImageUrl(listing.images[0]))}
              srcSet={getResponsiveSrcSet(getImageUrl(listing.images[0]), [320, 640, 960])}
              sizes="(max-width: 640px) 320px, (max-width: 960px) 640px, 960px"
              alt={listing.title} 
              className="w-full h-full object-cover" 
              loading="lazy"
              onContextMenu={(e) => e.preventDefault()} 
              draggable={false}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            />
            
            {/* Sepete Ekle İkonu - Hover'da Görünür ve Aktif İlanlar için */}
            {listing.status === 'active' && (
              <button
                className="cart-btn absolute bottom-3 right-3 opacity-0 transition-all duration-300 bg-orange-600 hover:bg-orange-700 shadow-2xl rounded-md p-2 border-2 border-white cursor-pointer"
                style={{ zIndex: 100 }}
                onClick={handleAddToCart}
                title="Sepete Ekle"
              >
                <ShoppingCart className="h-5 w-5 text-white" />
              </button>
            )}}
          </div>
        )}
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg group-hover:text-orange-600 transition-colors line-clamp-2">
                {listing.title}
              </h3>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{listing.city}</span>
                <Clock className="h-4 w-4 ml-2" />
                <span>{DataManager.getTimeAgo(listing.createdAt)}</span>
              </div>
            </div>
            <Badge className={getStatusColor(listing.status)}>
              {listing.status === 'active' ? 'Aktif' : 
               listing.status === 'closed' ? 'Kapandı' : 'Süresi Doldu'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {listing.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="secondary">{listing.category}</Badge>
            <Badge variant="outline">
              <Package className="h-3 w-3 mr-1" />
              {getDeliveryText(listing.deliveryType)}
            </Badge>
            {listing.exactProductOnly && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">Aynı Ürün Zorunlu</Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Maksimum Bütçe: </span>
              <span className="font-semibold text-green-600">
                {DataManager.formatPrice(listing.budgetMax)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>
                {supabaseEnabled() ? (listing.offerCount ?? 0) : DataManager.getOffersForListing(listing.id).filter(o => o.status !== 'withdrawn').length} teklif
              </span>
            </div>
          </div>

          {isExpiringSoon() && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-xs text-orange-700 font-medium">
                ⏰ İlan yakında sona eriyor!
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0">
          <div className="flex items-center justify-between w-full">
            <Button 
              size="sm" 
              onClick={handleButtonClick}
              className="ml-auto"
            >
              Detaylar
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
