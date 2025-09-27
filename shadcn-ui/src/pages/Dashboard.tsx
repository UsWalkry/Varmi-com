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
import { maskDisplayName } from '@/lib/utils';
import Header from '@/components/Header';
import FavoriteButton from '@/components/FavoriteButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Stepper from '@/components/ui/stepper';

export default function Dashboard() {
  const navigate = useNavigate();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<Offer[]>([]); // Aldığım teklifler (ilanlarıma gelen)
  const [isLoading, setIsLoading] = useState(true);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDialogOffer, setOrderDialogOffer] = useState<Offer | null>(null);

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
        
        // Get all offers
        const allOffers = DataManager.getAllOffers();
        // Outgoing: user gave these offers as satıcı
        const userOffers = allOffers.filter(offer => 
          offer && offer.sellerId === userId
        );
        // Incoming: offers given by others on user's listings
        const offersOnMyListings = allOffers.filter(offer => 
          offer && offer.sellerId !== userId && userListings.some(l => l.id === offer.listingId)
        );
        
        // Get favorite listings
        const favoriteIds = DataManager.getFavorites(userId);
        const favorites = allListings.filter(listing => 
          listing && favoriteIds.includes(listing.id)
        );

  setMyListings(userListings);
  setMyOffers(userOffers);
  setIncomingOffers(offersOnMyListings);
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

  const handleWithdrawOffer = (offerId: string) => {
    if (!userId) return;
    try {
      DataManager.withdrawOffer(offerId, userId);
      const allOffers = DataManager.getAllOffers();
      const userOffers = allOffers.filter(o => o && o.sellerId === userId);
      const offersOnMyListings = allOffers.filter(o => o && o.sellerId !== userId && myListings.some(l => l.id === o.listingId));
      setMyOffers(userOffers);
      setIncomingOffers(offersOnMyListings);
    } catch (e) {
      console.error('withdraw error', e);
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
      {/* Kabul edilen teklif için sipariş durumu diyaloğu */}
      <Dialog open={orderDialogOpen} onOpenChange={(v) => { if (!v) { setOrderDialogOpen(false); setOrderDialogOffer(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sipariş Durumu</DialogTitle>
          </DialogHeader>
          {orderDialogOffer && (() => {
            const listing = DataManager.getListing(orderDialogOffer.listingId);
            const acceptedAt = orderDialogOffer.acceptedAt ? DataManager.formatDate(orderDialogOffer.acceptedAt) : '-';
            // Dinamik aşamalar
            const steps = [
              { id: 1, title: 'Teklif Kabul Edildi', description: `Tarih: ${acceptedAt}` },
              { id: 2, title: 'Satıcıdan Onay/İşleme', description: 'Satıcı ürünü hazırlıyor.' },
              { id: 3, title: 'Kargo / Teslimat', description: orderDialogOffer.deliveryType === 'shipping' ? (orderDialogOffer.trackingNo ? `Kargoya verildi • Takip No: ${orderDialogOffer.trackingNo}` : 'Kargoya verilecek.') : 'Elden teslim planlanacak.' },
              { id: 4, title: 'Tamamlandı', description: 'İşlem başarıyla tamamlandı.' }
            ];
            const stageMap: Record<NonNullable<Offer['orderStage']>, number> = { accepted: 1, processing: 2, shipped: 3, delivered: 4 } as const;
            const current = orderDialogOffer.orderStage ? stageMap[orderDialogOffer.orderStage] : 1;
            return (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="font-semibold">{listing?.title || 'İlan'}</div>
                  <div className="text-sm text-muted-foreground">Satıcı: {orderDialogOffer.sellerName}</div>
                  <div className="text-sm text-muted-foreground">Teklif: {DataManager.formatPrice(orderDialogOffer.price)}{orderDialogOffer.shippingCost > 0 ? ` + ${DataManager.formatPrice(orderDialogOffer.shippingCost)} kargo` : ''}</div>
                </div>
                <Stepper current={current} steps={steps} />
                <div className="text-xs text-muted-foreground">
                  Son güncelleme: {orderDialogOffer.orderUpdatedAt ? DataManager.formatDate(orderDialogOffer.orderUpdatedAt) : '-'}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      
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
            <TabsTrigger value="offers">Teklifler</TabsTrigger>
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

          {/* Offers Tab (split into outgoing/incoming) */}
          <TabsContent value="offers">
            <Card>
              <CardHeader>
                <CardTitle>Teklifler</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="outgoing" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="outgoing">Verdiğim Teklifler ({myOffers.length})</TabsTrigger>
                    <TabsTrigger value="incoming">Aldığım Teklifler ({incomingOffers.length})</TabsTrigger>
                  </TabsList>
                  {/* Outgoing Offers */}
                  <TabsContent value="outgoing" className="space-y-4">
                    {myOffers.length === 0 ? (
                      <div className="text-center py-10">
                        <TrendingUp className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Henüz teklif vermedin</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">İlanlara girerek teklif verebilirsin. Verdiğin teklifler burada listelenir.</p>
                      </div>
                    ) : (
                      myOffers.map(offer => {
                        const listing = DataManager.getListings().find(l => l.id === offer.listingId);
                        return (
                          <Card key={offer.id} className="border">
                            <CardContent className="p-5">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold mb-1 line-clamp-1">{listing?.title}</h4>
                                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-2">
                                    <span>{DataManager.getTimeAgo(offer.createdAt)}</span>
                                    <span>Durum: {offer.status === 'active' ? 'Bekliyor' : offer.status === 'accepted' ? 'Kabul Edildi' : offer.status === 'rejected' ? 'Reddedildi' : offer.status === 'withdrawn' ? 'Geri Çekildi' : offer.status}</span>
                                  </div>
                                  {offer.message && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{offer.message}</p>}
                                  <div className="flex items-center gap-4">
                                    <span className="font-semibold text-green-600">{DataManager.formatPrice(offer.price)}</span>
                                    {offer.shippingCost > 0 && <span className="text-xs text-muted-foreground">+ {DataManager.formatPrice(offer.shippingCost)} kargo</span>}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 min-w-[130px]">
                                  <Badge variant={offer.status === 'active' ? 'secondary' : offer.status === 'accepted' ? 'default' : offer.status === 'rejected' ? 'destructive' : offer.status === 'withdrawn' ? 'outline' : 'outline'}>
                                    {offer.status === 'active' ? 'Bekliyor' : offer.status === 'accepted' ? 'Kabul Edildi' : offer.status === 'rejected' ? 'Reddedildi' : offer.status === 'withdrawn' ? 'Geri Çekildi' : offer.status}
                                  </Badge>
                                  {offer.status === 'active' && (
                                    <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleWithdrawOffer(offer.id)}>Geri Çek</Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </TabsContent>
                  {/* Incoming Offers */}
                  <TabsContent value="incoming" className="space-y-4">
                    {incomingOffers.length === 0 ? (
                      <div className="text-center py-10">
                        <TrendingUp className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">İlanlarına henüz teklif gelmedi</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">Satıcılar ilanlarına teklif verdiğinde burada görüntülenecek.</p>
                      </div>
                    ) : (
                      incomingOffers.map(offer => {
                        const listing = DataManager.getListings().find(l => l.id === offer.listingId);
                        return (
                          <Card key={offer.id} className="border">
                            <CardContent className="p-5">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold mb-1 line-clamp-1">{listing?.title}</h4>
                                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-2">
                                    <span>Satıcı: {offer.sellerName}</span>
                                    <span>{DataManager.getTimeAgo(offer.createdAt)}</span>
                                  </div>
                                  {offer.message && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{offer.message}</p>}
                                  <div className="flex items-center gap-4">
                                    <span className="font-semibold text-green-600">{DataManager.formatPrice(offer.price)}</span>
                                    {offer.shippingCost > 0 && <span className="text-xs text-muted-foreground">+ {DataManager.formatPrice(offer.shippingCost)} kargo</span>}
                                  </div>
                                </div>
                                <div className="flex flex-col sm:items-end gap-2 min-w-[140px]">
                                  <Badge variant={offer.status === 'active' ? 'secondary' : offer.status === 'accepted' ? 'default' : offer.status === 'rejected' ? 'destructive' : 'outline'}>
                                    {offer.status === 'active' ? 'Bekliyor' : offer.status === 'accepted' ? 'Kabul Edildi' : offer.status === 'rejected' ? 'Reddedildi' : offer.status === 'withdrawn' ? 'Geri Çekildi' : offer.status}
                                  </Badge>
                                  {offer.status === 'active' && (
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleOfferAction(offer.id, 'accept')} className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="h-4 w-4 mr-1" /> Kabul
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => handleOfferAction(offer.id, 'reject')}>
                                        <XCircle className="h-4 w-4 mr-1" /> Reddet
                                      </Button>
                                    </div>
                                  )}
                                  {offer.status === 'accepted' && (
                                    <Button size="sm" variant="outline" onClick={() => { setOrderDialogOffer(offer); setOrderDialogOpen(true); }}>
                                      <Package className="h-4 w-4 mr-1" /> Sipariş Durumu
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </TabsContent>
                </Tabs>
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
                                <span className="font-medium">{listing.maskOwnerName ? maskDisplayName(listing.buyerName) : listing.buyerName}</span>
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