import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Package, TrendingUp } from 'lucide-react';
import { Listing, DataManager } from '@/lib/mockData';
import { useNavigate } from 'react-router-dom';

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const navigate = useNavigate();

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'new': return 'Sıfır';
      case 'used': return '2. El';
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
    e.stopPropagation(); // Prevent card click when button is clicked
    navigate(`/listing/${listing.id}`);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors line-clamp-2">
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
          <Badge variant="outline">{getConditionText(listing.condition)}</Badge>
          <Badge variant="outline">
            <Package className="h-3 w-3 mr-1" />
            {getDeliveryText(listing.deliveryType)}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">Bütçe: </span>
            <span className="font-semibold text-green-600">
              {DataManager.formatPrice(listing.budgetMin)} - {DataManager.formatPrice(listing.budgetMax)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{DataManager.getOffersForListing(listing.id).length} teklif</span>
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
          <div className="text-xs text-muted-foreground">
            <span>İlan sahibi: </span>
            <span className="font-medium">{listing.buyerName}</span>
            {/* Kullanıcı puanı ve değerlendirme sayısı sadece >0 ise göster */}
            {(() => {
              const reviewCount = DataManager.getUserReviewCount(listing.buyerId);
              const averageRating = DataManager.getUserAverageRating(listing.buyerId);
              if (reviewCount > 0) {
                return (
                  <span className="ml-2 flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD700" className="inline-block"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    {averageRating.toFixed(1)}
                    <span className="text-gray-400">({reviewCount})</span>
                  </span>
                );
              }
              return null;
            })()}
          </div>
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
  );
}