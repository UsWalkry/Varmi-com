import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Clock, Package2, CheckCircle, XCircle, Scale, Star, Award, ShoppingCart } from 'lucide-react';
import { Offer, DataManager } from '@/lib/mockData';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageLightbox from '@/components/ImageLightbox';
import SellerReviewsModal from '@/components/SellerReviewsModal';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface OfferCardProps {
  offer: Offer;
  showActions?: boolean;
  currentUserId?: string; // Mevcut kullanıcı ID'si
  currentUserEmail?: string; // Email-based ownership için
  listingOwnerId?: string; // İlan sahibinin ID'si
  listingId?: string; // İlan ID'si (sepete eklemek için)
  onAccept?: (offerId: string) => void;
  onReject?: (offerId: string) => void;
  onWithdraw?: (offerId: string) => void; // teklif sahibi için sil/geri çek
  onPurchase?: (offerId: string) => void; // diğer kullanıcı için satın al
  onImageClick?: (images: string[], index: number) => void; // Custom lightbox handler
}

export default function OfferCard({ 
  offer, 
  showActions = false,
  currentUserId,
  currentUserEmail,
  listingOwnerId,
  listingId,
  onAccept, 
  onReject, 
  onWithdraw,
  onPurchase,
  onImageClick,
}: OfferCardProps) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  
  const handleUserClick = () => {
    // Doğrulanmış satıcı ise mağaza profiline, değilse kullanıcı profiline git
    if (offer.isVerifiedSeller && offer.storeName) {
      navigate(`/store/${offer.sellerId}`);
    } else {
      navigate(`/profile/${offer.sellerId}`);
    }
  };
  
  const handleRatingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (offer.sellerId) {
      setReviewsModalOpen(true);
    }
  };
  
  const handleAddToCart = async () => {
    if (!listingId) {
      toast.error('İlan bilgisi eksik');
      return;
    }
    
    if (!currentUserId) {
      toast.error('Sepete eklemek için giriş yapmalısınız');
      navigate('/?login=true');
      return;
    }
    
    // İlan detay sayfasından - belirli teklifi seç
    await addToCart(listingId, 1, offer.id);
  };
  
  const getImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '/placeholder-image.jpg';
    
    // If it's already a full HTTP URL, extract the path part
    if (imagePath.startsWith('http://localhost:8787')) {
      imagePath = imagePath.replace('http://localhost:8787', '');
    }
    
    // If it's any other HTTP URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // If it starts with /uploads/, return as is (Vite proxy will handle)
    if (imagePath.startsWith('/uploads/')) {
      return imagePath;
    }
    
    // If it's just a filename, try both /uploads/ and /uploads/images/
    if (imagePath.includes('.')) {
      // Check if it's a direct filename (has extension)
      return `/uploads/${imagePath}`;
    }
    
    // Default fallback
    return `/uploads/images/${imagePath}`;
  };
  
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
      case 'active': return 'bg-orange-100 text-orange-800';
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
  const [descExpanded, setDescExpanded] = useState(false);

  const MAX_DESC = 240;
  const fullDesc = offer.description || '';
  const isLongDesc = fullDesc.length > MAX_DESC;
  const shownDesc = !isLongDesc || descExpanded ? fullDesc : truncateAtWord(fullDesc, MAX_DESC);
  const qty = offer.quantity ?? 1;
  const soldToOthers = offer.soldToOthers ?? 0;
  const purchasableLeft = Math.max(0, qty - 1 - soldToOthers);

  // Debug log'u
  console.log('📊 OfferCard Stock Debug:', {
    offerId: offer.id,
    qty,
    soldToOthers,
    purchasableLeft,
    calculation: `${qty} - 1 - ${soldToOthers} = ${purchasableLeft}`
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <button 
                onClick={handleUserClick}
                className="font-semibold text-orange-600 hover:text-orange-800 hover:underline transition-colors cursor-pointer"
              >
                {offer.sellerName || 'İsimsiz Kullanıcı'}
              </button>
              
              {/* Rating Display (always show if rating is defined; show count even if 0) */}
              {typeof offer.sellerRating !== 'undefined' && (
                <button
                  onClick={handleRatingClick}
                  className="flex items-center gap-1 cursor-pointer hover:bg-orange-50 hover:border-orange-300 border border-transparent transition-all rounded-md px-2 py-0.5 -mx-2"
                  title="Değerlendirmeleri görüntüle"
                  disabled={!offer.sellerId}
                >
                  <div className="flex items-center">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium text-gray-700 ml-1">
                      {Number(offer.sellerRating ?? 0).toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    ({offer.sellerRatingCount ?? 0})
                  </span>
                </button>
              )}
              
              {/* Verified User Badge */}
              {offer.sellerEmailVerified && (
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                  <Award className="h-3 w-3 mr-1" />
                  Doğrulanmış Kullanıcı
                </Badge>
              )}
            </div>
            {offer.productName ? (
              <p className="text-sm text-muted-foreground">{offer.productName}</p>
            ) : (offer.brand && offer.model ? (
              <p className="text-sm text-muted-foreground">{offer.brand} - {offer.model}</p>
            ) : null)}
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

          {/* Quantity info */}
          <div className="text-xs text-muted-foreground">
            Toplam adet: {qty} • Diğer kullanıcılara açık: {Math.max(0, qty - 1)} • Kalan: {purchasableLeft}
          </div>

          {/* Description with show more/less */}
          {fullDesc && (
            <div className="text-sm text-muted-foreground">
              {shownDesc}
              {isLongDesc && (
                <button
                  type="button"
                  aria-expanded={descExpanded}
                  className="ml-2 text-primary hover:underline font-medium"
                  onClick={() => setDescExpanded((v) => !v)}
                >
                  {descExpanded ? 'Daha az göster' : 'Daha fazla göster'}
                </button>
              )}
            </div>
          )}

          {/* Images (powered by Google Drive) */}
          {offer.images && offer.images.length > 0 && (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {offer.images.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="w-full bg-muted rounded overflow-hidden aspect-square"
                    onClick={() => {
                      if (onImageClick) {
                        // Use parent's custom lightbox
                        onImageClick(offer.images.map(img => getImageUrl(img)), idx);
                      } else {
                        // Use local lightbox
                        setLightboxIndex(idx);
                        setLightboxOpen(true);
                      }
                    }}
                    aria-label={`Görseli büyüt (${idx + 1})`}
                  >
                    <img src={getImageUrl(src)} alt={`Teklif görseli ${idx+1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                  </button>
                ))}
              </div>

              {/* Only show local lightbox if no custom handler */}
              {!onImageClick && (
                <ImageLightbox
                  images={offer.images.map(img => getImageUrl(img))}
                  startIndex={lightboxIndex}
                  open={lightboxOpen}
                  onClose={() => setLightboxOpen(false)}
                />
              )}
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
            {/* Sepete Ekle Butonu - Sadece ilan sahibi için göster */}
            {listingId && (
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700"
                size="sm"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Sepete Ekle
              </Button>
            )}
          </div>
        </CardFooter>
      )}

      {/* Diğer kullanıcılar için sepete ekleme aksiyonu - kendi teklifinde ve kendi ilanında görünmez */}
      {(() => {
        // UUID-based ownership kontrolü (artık ID uyumsuzluğu yok)
        const isMyOffer = currentUserId === offer.sellerId;
        
        const shouldShowPurchaseButton = 
          (offer.status === 'active' || offer.status === 'accepted') && 
          purchasableLeft > 0 && 
          !isMyOffer && 
          currentUserId !== listingOwnerId &&
          listingId;

        // Debug log
        if (process.env.NODE_ENV === 'development') {
          console.log('🛒 UUID Purchase Button Check:', {
            'offer.id': offer.id,
            'offer.sellerId': offer.sellerId,
            'currentUserId': currentUserId,
            'isMyOffer': isMyOffer,
            'shouldShowPurchaseButton': shouldShowPurchaseButton
          });
        }
        
        return shouldShowPurchaseButton;
      })() && (
        <CardFooter className="pt-0">
          <div className="flex w-full">
            <Button 
              className="ml-auto" 
              size="sm" 
              onClick={() => {
                if (!currentUserId) {
                  toast.error('Sepete eklemek için giriş yapmalısınız');
                  navigate('/?login=true');
                  return;
                }
                // Sepete ekle - listingId prop'unu kullan
                addToCart(listingId!, 1, offer.id);
              }}
              disabled={purchasableLeft <= 0}
            >
              <ShoppingCart className="h-4 w-4 mr-1" /> 
              {purchasableLeft <= 0 ? 'Stokta Yok' : 'Sepete Ekle'}
            </Button>
          </div>
        </CardFooter>
      )}

      {/* Teklif sahibi için Sil/Geri Çek */}
      {offer.status === 'active' && onWithdraw && (
        <CardFooter className="pt-0">
          <div className="flex w-full">
            <Button 
              type="button"
              variant="ghost" 
              size="sm"
              className="ml-auto text-red-600 hover:text-red-700"
              onClick={() => onWithdraw?.(offer.id)}
            >
              Teklifi Geri Çek
            </Button>
          </div>
        </CardFooter>
      )}
      
      {/* Seller Reviews Modal */}
      {offer.sellerId && (
        <SellerReviewsModal
          isOpen={reviewsModalOpen}
          onClose={() => setReviewsModalOpen(false)}
          sellerId={offer.sellerId}
          sellerName={offer.sellerName || 'Satıcı'}
        />
      )}
    </Card>
  );
}

function truncateAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  const lastSpace = slice.lastIndexOf(' ');
  const safe = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return safe.replace(/[\s,.!?:;-]+$/, '') + '…';
}