import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Clock, Package, TrendingUp, Plus, Star, MessageCircle, LogOut } from 'lucide-react';
import { Listing, Offer, DataManager } from '@/lib/mockData';
import OfferCard from '@/components/OfferCard';
import CreateOfferModal from '@/components/CreateOfferModal';
import AuthModal from '@/components/AuthModal';
import MessageModal from '@/components/MessageModal';
import { toast } from 'sonner';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'date'>('price');
  const [currentUser, setCurrentUser] = useState(DataManager.getCurrentUser());

  useEffect(() => {
    if (id) {
      loadListingAndOffers();
    }
  }, [id]);

  const loadListingAndOffers = () => {
    const allListings = DataManager.getListings();
    const foundListing = allListings.find(l => l.id === id);
    
    if (!foundListing) {
      toast.error('İlan bulunamadı');
      navigate('/');
      return;
    }

    setListing(foundListing);
    
    const listingOffers = DataManager.getOffers(id);
    setOffers(sortOffers(listingOffers, sortBy));
  };

  const sortOffers = (offers: Offer[], sortType: 'price' | 'rating' | 'date') => {
    return [...offers].sort((a, b) => {
      switch (sortType) {
        case 'price':
          return (a.price + a.shippingCost) - (b.price + b.shippingCost);
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
    toast.success('Teklif kabul edildi! Ödeme sayfasına yönlendiriliyorsunuz...');
    // Here would be the payment flow
  };

  const handleRejectOffer = (offerId: string) => {
    toast.info('Teklif reddedildi');
    // Update offer status in real implementation
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

  const handleLogout = () => {
    DataManager.logoutUser();
    setCurrentUser(null);
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
  const canMakeOffer = currentUser && !isOwner && listing.status === 'active';

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
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ana Sayfaya Dön
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-blue-600">Var mı?</h1>
            </div>
            <div className="flex items-center gap-2">
              {currentUser ? (
                <>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Panelim
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Çıkış Yap
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsAuthModalOpen(true)}>
                  Giriş Yap
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Listing Details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{listing.title}</CardTitle>
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
                      <p className="font-semibold">{DataManager.formatDate(listing.expiresAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">İlan Sahibi</p>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{listing.buyerName}</p>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">4.8</span>
                        </div>
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
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">Bu sizin ilanınız</p>
                    <Button variant="outline" className="w-full">
                      İlanı Düzenle
                    </Button>
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
                      ? DataManager.formatPrice(Math.min(...offers.map(o => o.price + o.shippingCost)))
                      : '-'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ortalama Teklif</span>
                  <span className="font-semibold">
                    {offers.length > 0 
                      ? DataManager.formatPrice(offers.reduce((sum, o) => sum + o.price + o.shippingCost, 0) / offers.length)
                      : '-'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Kalan Süre</span>
                  <span className="font-semibold">
                    {Math.ceil((new Date(listing.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} gün
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
        listingId={listing.id}
        listingTitle={listing.title}
        otherUserId={listing.buyerId}
        otherUserName={listing.buyerName}
      />
    </div>
  );
}