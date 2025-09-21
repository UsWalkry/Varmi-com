import { useState, useEffect, useMemo } from 'react';
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
  Clock,
  MapPin,
  Star,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataManager, Listing, Offer } from '@/lib/mockData';
import Header from '@/components/Header';
import FavoriteButton from '@/components/FavoriteButton';

export default function Dashboard() {
  const navigate = useNavigate();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentUser = DataManager.getCurrentUser();
  const userId = currentUser?.id;

  // Load data only once when component mounts
  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    const loadDashboardData = () => {
      try {
        // Get user's listings
        const allListings = DataManager.getListings();
        const userListings = allListings.filter(listing => 
          listing && listing.buyerId === userId
        );
        
        // Get user's offers
        const allOffers = DataManager.getAllOffers();
        const userOffers = allOffers.filter(offer => 
          offer && offer.sellerId === userId
        );
        
        // Get favorite listings
        const favoriteIds = DataManager.getFavorites(userId);
        const favorites = allListings.filter(listing => 
          listing && favoriteIds.includes(listing.id)
        );

        setMyListings(userListings);
        setMyOffers(userOffers);
        setFavoriteListings(favorites);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setMyListings([]);
        setMyOffers([]);
        setFavoriteListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [userId, navigate]);

  // Memoize statistics to prevent recalculation
  const stats = useMemo(() => {
    if (!userId) return { totalListings: 0, totalOffers: 0, totalFavorites: 0, unreadMessages: 0 };
    
    return {
      totalListings: myListings.length,
      totalOffers: myOffers.length,
      totalFavorites: favoriteListings.length,
      unreadMessages: DataManager.getUnreadMessageCount(userId)
    };
  }, [userId, myListings.length, myOffers.length, favoriteListings.length]);

  const handleOfferAction = (offerId: string, action: 'accept' | 'reject') => {
    if (!userId) return;

    try {
      if (action === 'accept') {
        DataManager.acceptOffer(offerId);
      } else {
        DataManager.rejectOffer(offerId);
      }
      
      // Refresh offers
      const allOffers = DataManager.getAllOffers();
      const userOffers = allOffers.filter(offer => 
        offer && offer.sellerId === userId
      );
      setMyOffers(userOffers);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'new': return 'Sıfır';
      case 'used': return '2. El';
      case 'any': return 'Farketmez';
      default: return condition;
    }
  };

  if (!userId) {
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Hoş geldin, {currentUser?.name}!
          </h1>
          <p className="text-gray-600">
            İlanlarını yönet, teklifleri görüntüle ve favorilerini kontrol et.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam İlanlarım</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalListings}</div>
              <p className="text-xs text-muted-foreground">Aktif ilanların</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gelen Teklifler</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOffers}</div>
              <p className="text-xs text-muted-foreground">Değerlendirmen gereken</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favorilerim</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFavorites}</div>
              <p className="text-xs text-muted-foreground">Takip ettiğin ilanlar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Okunmamış Mesaj</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unreadMessages}</div>
              <p className="text-xs text-muted-foreground">Yeni mesajların</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="listings">İlanlarım ({stats.totalListings})</TabsTrigger>
            <TabsTrigger value="offers">Teklifler ({stats.totalOffers})</TabsTrigger>
            <TabsTrigger value="favorites">Favoriler ({stats.totalFavorites})</TabsTrigger>
          </TabsList>

          {/* My Listings Tab */}
          <TabsContent value="listings">
            <Card>
              <CardHeader>
                <CardTitle>İlanlarım</CardTitle>
              </CardHeader>
              <CardContent>
                {myListings.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Henüz ilanın yok</h3>
                    <p className="text-muted-foreground mb-4">
                      İlk ilanını vererek satıcılardan teklif almaya başla!
                    </p>
                    <Button onClick={() => navigate('/create-listing')}>
                      İlan Ver
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myListings.map(listing => (
                      <Card 
                        key={listing.id} 
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => navigate(`/listing/${listing.id}`)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg line-clamp-2 flex-1 mr-2">
                              {listing.title}
                            </CardTitle>
                            <Badge className="bg-green-100 text-green-800">
                              {listing.status === 'active' ? 'Aktif' : 'Kapalı'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                            {listing.description}
                          </p>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Bütçe</span>
                              <span className="font-semibold text-green-600">
                                {DataManager.formatPrice(listing.budgetMin)} - {DataManager.formatPrice(listing.budgetMax)}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">{listing.category}</Badge>
                              <Badge variant="outline">{getConditionText(listing.condition)}</Badge>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{listing.city}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{DataManager.getTimeAgo(listing.createdAt)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-blue-600">
                                <TrendingUp className="h-4 w-4" />
                                <span className="font-semibold">{listing.offerCount || 0} teklif</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers">
            <Card>
              <CardHeader>
                <CardTitle>Gelen Teklifler</CardTitle>
              </CardHeader>
              <CardContent>
                {myOffers.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Henüz teklif yok</h3>
                    <p className="text-muted-foreground">
                      İlanlarına satıcılar teklif vermeye başladığında burada görünecek.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myOffers.map(offer => {
                      const listing = DataManager.getListings().find(l => l.id === offer.listingId);
                      return (
                        <Card key={offer.id}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold mb-2">{listing?.title}</h4>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4" />
                                    <span>{offer.sellerName}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{DataManager.getTimeAgo(offer.createdAt)}</span>
                                  </div>
                                </div>
                                <p className="text-sm mb-3">{offer.message}</p>
                                <div className="flex items-center gap-4">
                                  <span className="font-semibold text-green-600 text-lg">
                                    {DataManager.formatPrice(offer.price)}
                                  </span>
                                  <Badge 
                                    variant={
                                      offer.status === 'pending' ? 'secondary' :
                                      offer.status === 'accepted' ? 'default' : 'destructive'
                                    }
                                  >
                                    {offer.status === 'pending' ? 'Bekliyor' :
                                     offer.status === 'accepted' ? 'Kabul Edildi' : 'Reddedildi'}
                                  </Badge>
                                </div>
                              </div>
                              
                              {offer.status === 'pending' && (
                                <div className="flex gap-2 ml-4">
                                  <Button
                                    size="sm"
                                    onClick={() => handleOfferAction(offer.id, 'accept')}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Kabul Et
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOfferAction(offer.id, 'reject')}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reddet
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites">
            <Card>
              <CardHeader>
                <CardTitle>Favorilerim</CardTitle>
              </CardHeader>
              <CardContent>
                {favoriteListings.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Henüz favori yok</h3>
                    <p className="text-muted-foreground">
                      Beğendiğin ilanları favorilere ekleyerek buradan takip edebilirsin.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favoriteListings.map(listing => (
                      <Card 
                        key={listing.id} 
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => navigate(`/listing/${listing.id}`)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg line-clamp-2 flex-1 mr-2">
                              {listing.title}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <FavoriteButton 
                                listingId={listing.id}
                                userId={userId}
                                size="sm"
                                variant="ghost"
                              />
                              <Badge className="bg-green-100 text-green-800">
                                {listing.status === 'active' ? 'Aktif' : 'Kapalı'}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                            {listing.description}
                          </p>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Bütçe</span>
                              <span className="font-semibold text-green-600">
                                {DataManager.formatPrice(listing.budgetMin)} - {DataManager.formatPrice(listing.budgetMax)}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">{listing.category}</Badge>
                              <Badge variant="outline">{getConditionText(listing.condition)}</Badge>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{listing.city}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{DataManager.getTimeAgo(listing.createdAt)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">İlan sahibi:</span>
                                <span className="font-medium">{listing.buyerName}</span>
                              </div>
                              <div className="flex items-center gap-1 text-blue-600">
                                <TrendingUp className="h-4 w-4" />
                                <span className="font-semibold">{listing.offerCount || 0} teklif</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}