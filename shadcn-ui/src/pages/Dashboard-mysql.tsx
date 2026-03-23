import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  MessageCircle,
  Heart,
  Package,
  TrendingUp,
  MapPin,
  Star,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Listing, Offer } from '@/lib/mockData';
import { maskDisplayName } from '@/lib/utils';
import { toast } from 'sonner';
import Header from '@/components/Header';
import FavoriteButton from '@/components/FavoriteButton';
import { useAuth } from '@/hooks/use-auth-mysql';
import { mysqlAPI } from '@/lib/mysql-api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper functions
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (date: Date | string) => {
    const now = new Date();
    const then = typeof date === 'string' ? new Date(date) : date;
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Bugün';
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
    return `${Math.floor(diffDays / 30)} ay önce`;
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'new': return 'Sıfır';
      case 'used': return '2. El';
      case 'any': return 'Farketmez';
      default: return condition;
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        const [allListings, userListings, userOffers, favoriteIds] = await Promise.all([
          mysqlAPI.getListings(),
          mysqlAPI.getMyListings(),
          mysqlAPI.getMyOffers(),
          mysqlAPI.getFavorites()
        ]);

        setMyListings(userListings);
        setMyOffers(userOffers);

        // Get favorite listings by filtering all listings
        const favorites = allListings.filter(listing => 
          favoriteIds.includes(listing.id)
        );
        setFavoriteListings(favorites);

        // Get incoming offers on my listings
        const allOffers = await mysqlAPI.getOffers();
        const offersOnMyListings = allOffers.filter(offer => 
          offer.status !== 'withdrawn' &&
          offer.sellerId !== user.id &&
          userListings.some(l => l.id === offer.listingId)
        );
        setIncomingOffers(offersOnMyListings);

        console.log('🔍 Dashboard - Loaded data:');
        console.log('userListings:', userListings.length);
        console.log('userOffers:', userOffers.length);
        console.log('favorites:', favorites.length);
        console.log('incomingOffers:', offersOnMyListings.length);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Veri yüklenirken hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user, navigate]);

  const handleWithdrawOffer = async (offerId: string) => {
    try {
      await mysqlAPI.updateOfferStatus(offerId, 'withdrawn');
      
      // Refresh offers
      const updatedOffers = await mysqlAPI.getMyOffers();
      setMyOffers(updatedOffers);
      
      toast.success('Teklifiniz başarıyla geri çekildi');
    } catch (error) {
      console.error('Error withdrawing offer:', error);
      toast.error('Teklif geri çekilemedi');
    }
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'reject') => {
    if (!user) return;

    try {
      if (action === 'accept') {
        navigate(`/checkout?offerId=${offerId}`);
      } else {
        await mysqlAPI.updateOfferStatus(offerId, 'rejected');
        
        // Refresh incoming offers
        const allOffers = await mysqlAPI.getOffers();
        const offersOnMyListings = allOffers.filter(offer => 
          offer.status !== 'withdrawn' &&
          offer.sellerId !== user.id &&
          myListings.some(l => l.id === offer.listingId)
        );
        setIncomingOffers(offersOnMyListings);
        
        toast.success('Teklif reddedildi');
      }
    } catch (error) {
      console.error('Error handling offer:', error);
      toast.error('İşlem sırasında hata oluştu');
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Hoş geldin, {user.email}!
          </h1>
          <p className="text-gray-600">Hesap durumunu ve aktivitelerini burada görebilirsin.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">İlanlarım</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myListings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tekliflerim</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myOffers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favorilerim</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{favoriteListings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gelen Teklifler</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{incomingOffers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="listings">İlanlarım ({myListings.length})</TabsTrigger>
            <TabsTrigger value="offers">Tekliflerim ({myOffers.length})</TabsTrigger>
            <TabsTrigger value="incoming">Gelen Teklifler ({incomingOffers.length})</TabsTrigger>
            <TabsTrigger value="favorites">Favorilerim ({favoriteListings.length})</TabsTrigger>
          </TabsList>

          {/* My Listings Tab */}
          <TabsContent value="listings" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">İlanlarım</h2>
              <Button onClick={() => navigate('/create-listing')}>
                Yeni İlan Oluştur
              </Button>
            </div>
            
            {myListings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">Henüz ilanın yok</p>
                  <p className="text-sm text-muted-foreground mb-4">İlk ilanını oluşturarak başla!</p>
                  <Button onClick={() => navigate('/create-listing')}>
                    İlan Oluştur
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myListings.map((listing) => (
                  <Card key={listing.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{listing.title}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {listing.location}
                            </span>
                            <span>{getTimeAgo(listing.createdAt)}</span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-bold text-green-600">
                              {formatPrice(listing.budgetMax)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                            {listing.status === 'active' ? 'Aktif' : 'Pasif'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/listing/${listing.id}`)}
                          >
                            Görüntüle
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Offers Tab */}
          <TabsContent value="offers" className="space-y-4">
            <h2 className="text-xl font-semibold">Verdiğim Teklifler</h2>
            
            {myOffers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">Henüz teklif vermedin</p>
                  <p className="text-sm text-muted-foreground mb-4">İlanları incele ve teklif ver!</p>
                  <Button onClick={() => navigate('/')}>
                    İlanları İncele
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myOffers.map((offer) => (
                  <Card key={offer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{offer.productName}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <span>{getTimeAgo(offer.createdAt)}</span>
                            <span>{getConditionText(offer.condition)}</span>
                          </div>
                          <div className="mt-2">
                            <span className="font-semibold text-green-600">{formatPrice(offer.price)}</span>
                            {offer.shippingCost > 0 && (
                              <span className="text-xs text-muted-foreground ml-2">
                                + {formatPrice(offer.shippingCost)} kargo
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge variant={
                            offer.status === 'active' ? 'default' :
                            offer.status === 'accepted' ? 'default' :
                            offer.status === 'rejected' ? 'destructive' :
                            offer.status === 'withdrawn' ? 'secondary' : 'secondary'
                          }>
                            {offer.status === 'active' && 'Bekliyor'}
                            {offer.status === 'accepted' && 'Kabul Edildi'}
                            {offer.status === 'rejected' && 'Reddedildi'}
                            {offer.status === 'withdrawn' && 'Geri Çekildi'}
                          </Badge>
                          {offer.status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleWithdrawOffer(offer.id)}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Geri Çek
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Incoming Offers Tab */}
          <TabsContent value="incoming" className="space-y-4">
            <h2 className="text-xl font-semibold">İlanlarıma Gelen Teklifler</h2>
            
            {incomingOffers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">Henüz teklif almadın</p>
                  <p className="text-sm text-muted-foreground">İlanların için teklif bekleyen yok.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {incomingOffers.map((offer) => (
                  <Card key={offer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{offer.productName}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <span>Satıcı: {maskDisplayName(offer.sellerName)}</span>
                            <span className="flex items-center">
                              <Star className="h-3 w-3 mr-1 fill-current text-yellow-400" />
                              {offer.sellerRating.toFixed(1)}
                            </span>
                            <span>{getTimeAgo(offer.createdAt)}</span>
                          </div>
                          <div className="mt-2">
                            <span className="font-semibold text-green-600">{formatPrice(offer.price)}</span>
                            {offer.shippingCost > 0 && (
                              <span className="text-xs text-muted-foreground ml-2">
                                + {formatPrice(offer.shippingCost)} kargo
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <Button
                            size="sm"
                            onClick={() => handleOfferAction(offer.id, 'accept')}
                          >
                            Kabul Et
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOfferAction(offer.id, 'reject')}
                          >
                            Reddet
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-4">
            <h2 className="text-xl font-semibold">Favorilerim</h2>
            
            {favoriteListings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">Henüz favori ilanın yok</p>
                  <p className="text-sm text-muted-foreground mb-4">Beğendiğin ilanları favorilere ekle!</p>
                  <Button onClick={() => navigate('/')}>
                    İlanları İncele
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {favoriteListings.map((listing) => (
                  <Card key={listing.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{listing.title}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {listing.location}
                            </span>
                            <span>{getTimeAgo(listing.createdAt)}</span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-bold text-green-600">
                              {formatPrice(listing.budgetMax)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <FavoriteButton
                            listingId={listing.id}
                            userId={user.id}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/listing/${listing.id}`)}
                          >
                            Görüntüle
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}