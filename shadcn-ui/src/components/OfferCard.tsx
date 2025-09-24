import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Clock, Package2, CheckCircle, XCircle, Scale } from 'lucide-react';
import { Offer, DataManager } from '@/lib/mockData';
import { useState } from 'react';
import ImageLightbox from '@/components/ImageLightbox';

interface OfferCardProps {
  offer: Offer;
  showActions?: boolean;
  onAccept?: (offerId: string) => void;
  onReject?: (offerId: string) => void;
  onMessage?: (offerId: string) => void;
  onWithdraw?: (offerId: string) => void; // teklif sahibi için sil/geri çek
}

export default function OfferCard({ 
  offer, 
  showActions = false, 
  onAccept, 
  onReject, 
  onMessage,
  onWithdraw,
}: OfferCardProps) {
  
  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'new': return 'Sıfır';
      case 'used': return '2. El';
      default: return condition;
    }
  };

  const getDeliveryText = (deliveryType: string) => {
    switch (deliveryType) {
      case 'shipping': return 'Kargo';
      case 'pickup': return 'Elden Teslim';
      default: return deliveryType;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'withdrawn': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'accepted': return 'Kabul Edildi';
      case 'rejected': return 'Reddedildi';
      case 'withdrawn': return 'Geri Çekildi';
      default: return status;
    }
  };

  const isExpiringSoon = () => {
    const expiryDate = new Date(offer.validUntil);
    const now = new Date();
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
  };

  const totalPrice = offer.price + offer.shippingCost;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <h4 className="font-semibold">{offer.sellerName}</h4>
            </div>
            {offer.brand && offer.model && (
              <p className="text-sm text-muted-foreground">
                {offer.brand} - {offer.model}
              </p>
            )}
          </div>
          <Badge className={getStatusColor(offer.status)}>
            {getStatusText(offer.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-3">
          {/* Price */}
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {DataManager.formatPrice(offer.price)}
              </p>
              {offer.shippingCost > 0 && (
                <p className="text-sm text-muted-foreground">
                  + {DataManager.formatPrice(offer.shippingCost)} kargo
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Toplam</p>
              <p className="font-semibold">
                {DataManager.formatPrice(totalPrice)}
              </p>
            </div>
          </div>

          {/* Product details */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{getConditionText(offer.condition)}</Badge>
            <Badge variant="outline">
              <Package2 className="h-3 w-3 mr-1" />
              {getDeliveryText(offer.deliveryType)}
            </Badge>
            {offer.deliveryType === 'shipping' && offer.shippingDesi && (
              <Badge variant="outline">
                <Scale className="h-3 w-3 mr-1" />
                Desi: {offer.shippingDesi}
              </Badge>
            )}
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {offer.etaDays} gün teslimat
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground">
            {offer.description}
          </p>

          {/* Images (optional) */}
          {offer.images && offer.images.length > 0 && (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {offer.images.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="w-full bg-muted rounded overflow-hidden aspect-square"
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                    aria-label={`Görseli büyüt (${idx + 1})`}
                  >
                    <img src={src} alt={`Teklif görseli ${idx+1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                  </button>
                ))}
              </div>

              <ImageLightbox
                images={offer.images}
                startIndex={lightboxIndex}
                open={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
              />
            </>
          )}

          {/* Expiry warning */}
          {isExpiringSoon() && offer.status === 'active' && (
            <div className="p-2 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-xs text-orange-700 font-medium">
                ⏰ Teklif yakında sona eriyor!
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Teklif: {DataManager.getTimeAgo(offer.createdAt)}</span>
            <span>Geçerlilik: {DataManager.formatDate(offer.validUntil)}</span>
          </div>
        </div>
      </CardContent>

      {showActions && offer.status === 'active' && (
        <CardFooter className="pt-0">
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onMessage?.(offer.id)}
            >
              Mesaj Gönder
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onReject?.(offer.id)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reddet
            </Button>
            <Button 
              size="sm"
              onClick={() => onAccept?.(offer.id)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Kabul Et
            </Button>
          </div>
        </CardFooter>
      )}

      {/* Teklif sahibi için Sil/Geri Çek */}
      {offer.status === 'active' && onWithdraw && (
        <CardFooter className="pt-0">
          <div className="flex w-full">
            <Button 
              variant="ghost" 
              size="sm"
              className="ml-auto text-red-600 hover:text-red-700"
              onClick={() => onWithdraw?.(offer.id)}
            >
              Teklifi Sil
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}