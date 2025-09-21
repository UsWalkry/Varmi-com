import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Clock, Package, TrendingUp, Plus, Star, MessageCircle, Heart, Trash2 } from 'lucide-react';
import { Listing, Offer, DataManager } from '@/lib/mockData';
import OfferCard from '@/components/OfferCard';
import CreateOfferModal from '@/components/CreateOfferModal';
import AuthModal from '@/components/AuthModal';
import MessageModal from '@/components/MessageModal';
import Header from '@/components/Header.tsx';
import FavoriteButton from '@/components/FavoriteButton';
import { toast } from 'sonner';
import ReviewModal from '@/components/ReviewModal';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

export default function ListingDetail() {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{offerId: string, toUserId: string} | null>(null);
  const handleEditListing = () => {
    if (listing?.id) {
      navigate(`/edit-listing/${listing.id}`);
    }
  };
  const handleDeleteListing = () => {
    if (!listing || !currentUser) return;
    if (currentUser.id !== listing.buyerId) return;
    const ok = window.confirm('Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.');
    if (!ok) return;
    try {
      DataManager.deleteListing(listing.id, currentUser.id);
      toast.success('İlan silindi');
      navigate('/');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'İlan silinemedi';
      toast.error(msg);
    }
  };
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'date'>('price');
  const [currentUser, setCurrentUser] = useState(DataManager.getCurrentUser());

  const loadListingAndOffers = useCallback(() => {
    const allListings = DataManager.getListings();
    const foundListing = allListings.find(l => l.id === id);
    
    if (!foundListing) {
      toast.error('İlan bulunamadı');
      navigate('/');
      return;
    }

    setListing(foundListing);
    const listingOffers = DataManager.getOffersForListing(id!);
    setOffers(sortOffers(listingOffers, sortBy));
  }, [id, sortBy, navigate]);

  useEffect(() => {
    if (id) {
      loadListingAndOffers();
    }
  }, [id, loadListingAndOffers]);

  

  const sortOffers = (offers: Offer[], sortType: 'price' | 'rating' | 'date') => {
    return [...offers].sort((a, b) => {
      switch (sortType) {
        case 'price':
          return a.price - b.price;
        case 'rating':
          return b.sellerRating - a.sellerRating;
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
  };

  const handleSortChange = (newSort: 'price' | 'rating' | 'date') => {
    setSortBy(newSort);
    setOffers(sortOffers(offers, newSort));
  };

  const handleAcceptOffer = (offerId: string) => {
    toast.success('Teklif kabul edildi! Değerlendirme yapabilirsiniz.');
    const offer = offers.find(o => o.id === offerId);
    if (offer && currentUser) {
      setReviewTarget({ offerId, toUserId: offer.sellerId });
      setIsReviewModalOpen(true);
    }
  };

  const handleRejectOffer = (offerId: string) => {
    toast.info('Teklif reddedildi');
    // Update offer status in real implementation
  };

  const handleWithdrawOffer = (offerId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      DataManager.deleteOffer(offerId, currentUser.id);
      toast.success('Teklifiniz silindi');
      loadListingAndOffers();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Teklif silinemedi';
      toast.error(msg);
    }
  };

  const handleMessageSeller = (offerId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    
    const offer = offers.find(o => o.id === offerId);
    if (offer) {
      // Open message modal with seller info
      setIsMessageModalOpen(true);
    }
  };

  const handleOfferCreated = () => {
    loadListingAndOffers();
    toast.success('Teklifiniz başarıyla gönderildi!');
  };

  const handleAuthSuccess = () => {
    setCurrentUser(DataManager.getCurrentUser());
  };

  const handleCreateOffer = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsOfferModalOpen(true);
  };

  const handleLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleMessageOwner = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsMessageModalOpen(true);
  };

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>İlan yükleniyor...</p>
        </div>
      </div>
    );
  }

  const isOwner = currentUser?.id === listing.buyerId;
  const alreadyOffered = currentUser ? DataManager.getOffersForListing(listing.id).some(o => o.sellerId === currentUser.id) : false;
  const canMakeOffer = currentUser && !isOwner && listing.status === 'active' && !alreadyOffered;

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
      case 'pickup': return 'Elden Teslim';
      case 'both': return 'Kargo/Elden';
      default: return deliveryType;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
  <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Listing Details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-2xl">{listing.title}</CardTitle>
                      <FavoriteButton 
                        listingId={listing.id}
                        userId={currentUser?.id}
                        size="sm"
                        variant="ghost"
                      />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{listing.city}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{DataManager.getTimeAgo(listing.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>{offers.length} teklif</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={listing.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {listing.status === 'active' ? 'Aktif' : 'Kapalı'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Images/Gallery */}
                  {listing.images && listing.images.length > 0 && (
                    <div className="relative">
                      <Carousel className="w-full">
                        <CarouselContent>
                          {listing.images.map((src, idx) => (
                            <CarouselItem key={idx}>
                              <div className="w-full h-64 md:h-80 lg:h-96 overflow-hidden rounded-md">
                                <img src={src} alt={`${listing.title} görsel ${idx + 1}`} className="w-full h-full object-cover" />
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        {listing.images.length > 1 && (
                          <>
                            <CarouselPrevious className="-left-3 sm:-left-6" />
                            <CarouselNext className="-right-3 sm:-right-6" />
                          </>
                        )}
                      </Carousel>
                    </div>
                  )}

                  <p className="text-gray-700 leading-relaxed">{listing.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{listing.category}</Badge>
                    <Badge variant="outline">{getConditionText(listing.condition)}</Badge>
                    <Badge variant="outline">
                      <Package className="h-3 w-3 mr-1" />
                      {getDeliveryText(listing.deliveryType)}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Bütçe Aralığı</p>
                      <p className="font-semibold text-lg text-green-600">
                        {DataManager.formatPrice(listing.budgetMin)} - {DataManager.formatPrice(listing.budgetMax)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Son Başvuru</p>
                      {/* <p className="font-semibold">{DataManager.formatDate(listing.expiresAt)}</p> */}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">İlan Sahibi</p>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{listing.buyerName}</p>
                        {(() => {
                          const reviewCount = DataManager.getUserReviewCount(listing.buyerId);
                          const averageRating = DataManager.getUserAverageRating(listing.buyerId);
                          if (reviewCount > 0) {
                            return (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm">{averageRating.toFixed(1)}</span>
                                <span className="text-gray-400">({reviewCount})</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Offers Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Gelen Teklifler ({offers.length})
                  </CardTitle>
                  {offers.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant={sortBy === 'price' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSortChange('price')}
                      >
                        Fiyata Göre
                      </Button>
                      <Button
                        variant={sortBy === 'rating' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSortChange('rating')}
                      >
                        Puana Göre
                      </Button>
                      <Button
                        variant={sortBy === 'date' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSortChange('date')}
                      >
                        Tarihe Göre
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {offers.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Henüz teklif yok</h3>
                    <p className="text-muted-foreground mb-4">
                      Bu ilana henüz teklif verilmemiş. İlk teklifi siz verin!
                    </p>
                    {canMakeOffer && (
                      <Button onClick={handleCreateOffer}>
                        <Plus className="h-4 w-4 mr-2" />
                        İlk Teklifi Ver
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {offers.map(offer => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        showActions={isOwner}
                        onAccept={handleAcceptOffer}
                        onReject={handleRejectOffer}
                        onMessage={handleMessageSeller}
                        onWithdraw={offer.sellerId === currentUser?.id ? handleWithdrawOffer : undefined}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            <Card>
              <CardHeader>
                <CardTitle>İşlemler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canMakeOffer ? (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleCreateOffer}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Teklif Ver
                  </Button>
                ) : isOwner ? (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Bu sizin ilanınız</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={handleEditListing}>
                        Düzenle
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteListing}>
                        <Trash2 className="h-4 w-4 mr-1" /> Sil
                      </Button>
                    </div>
                  </div>
                ) : alreadyOffered ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">Bu ilana zaten bir teklif verdiniz</p>
                    <p className="text-xs text-muted-foreground">Tek ilan başına en fazla 1 teklif hakkınız var</p>
                  </div>
                ) : !currentUser ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">Teklif vermek için giriş yapın</p>
                    <Button variant="outline" className="w-full" onClick={handleLogin}>
                      Giriş Yap
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">İlan kapalı</p>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={handleMessageOwner}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  İlan Sahibine Mesaj
                </Button>

                {currentUser && (
                  <FavoriteButton 
                    listingId={listing.id}
                    userId={currentUser.id}
                    variant="outline"
                    showText={true}
                    className="w-full"
                  />
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>İlan İstatistikleri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Toplam Teklif</span>
                  <span className="font-semibold">{offers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">En Düşük Teklif</span>
                  <span className="font-semibold text-green-600">
                    {offers.length > 0 
                      ? DataManager.formatPrice(Math.min(...offers.map(o => o.price)))
                      : '-'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ortalama Teklif</span>
                  <span className="font-semibold">
                    {offers.length > 0 
                      ? DataManager.formatPrice(offers.reduce((sum, o) => sum + o.price, 0) / offers.length)
                      : '-'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Kalan Süre</span>
                  <span className="font-semibold">
                    {/* Kalan süre özelliği kaldırıldı */}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle>💡 İpuçları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Teklifleri karşılaştırırken satıcı puanlarını kontrol edin</p>
                  <p>• Kargo ücreti dahil toplam fiyatı değerlendirin</p>
                  <p>• Ürün durumu ve garanti bilgilerini inceleyin</p>
                  <p>• Satıcıyla mesajlaşarak detayları öğrenin</p>
                  <p>• Beğendiğiniz ilanları favorilere ekleyin</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Offer Modal */}
      <CreateOfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        listing={listing}
        onOfferCreated={handleOfferCreated}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Message Modal */}
      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        recipientId={listing.buyerId}
        recipientName={listing.buyerName}
        listingTitle={listing.title}
      />

      {/* Review Modal */}
      {reviewTarget && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          fromUserId={currentUser.id}
          toUserId={reviewTarget.toUserId}
          listingId={listing.id}
          offerId={reviewTarget.offerId}
        />
      )}
    </div>
  );
}