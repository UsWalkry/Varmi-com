import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Package, TrendingUp, MessageCircle, Star, Eye, Edit, Trash2, Bell } from 'lucide-react';
import { Listing, Offer, DataManager } from '@/lib/mockData';
import ListingCard from '@/components/ListingCard';
import OfferCard from '@/components/OfferCard';
import MessageCenter from '@/components/MessageCenter';

export default function Dashboard() {
  const navigate = useNavigate();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [offersToMyListings, setOffersToMyListings] = useState<Offer[]>([]);
  const [activeTab, setActiveTab] = useState('my-listings');
  const [isMessageCenterOpen, setIsMessageCenterOpen] = useState(false);

  const currentUser = DataManager.getCurrentUser();

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }
    loadUserData();
  }, [currentUser, navigate]);

  const loadUserData = () => {
    if (!currentUser) return;

    // Get user's listings
    const allListings = DataManager.getListings();
    const userListings = allListings.filter(listing => listing.buyerId === currentUser.id);
    setMyListings(userListings);

    // Get user's offers
    const allOffers = DataManager.getOffers();
    const userOffers = allOffers.filter(offer => offer.sellerId === currentUser.id);
    setMyOffers(userOffers);

    // Get offers to user's listings
    const listingIds = userListings.map(listing => listing.id);
    const offersToUser = allOffers.filter(offer => listingIds.includes(offer.listingId));
    setOffersToMyListings(offersToUser);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'accepted': return 'Kabul Edildi';
      case 'rejected': return 'Reddedildi';
      case 'closed': return 'Kapandı';
      case 'expired': return 'Süresi Doldu';
      default: return status;
    }
  };

  const handleStatClick = (statType: string) => {
    switch (statType) {
      case 'total-listings':
      case 'active-listings':
        setActiveTab('my-listings');
        break;
      case 'total-offers':
      case 'accepted-offers':
        setActiveTab('my-offers');
        break;
      case 'received-offers':
      case 'pending-offers':
        setActiveTab('received-offers');
        break;
      case 'messages':
        setIsMessageCenterOpen(true);
        break;
    }
  };

  const stats = {
    totalListings: myListings.length,
    activeListings: myListings.filter(l => l.status === 'active').length,
    totalOffers: myOffers.length,
    acceptedOffers: myOffers.filter(o => o.status === 'accepted').length,
    receivedOffers: offersToMyListings.length,
    pendingOffers: offersToMyListings.filter(o => o.status === 'active').length
  };

  // Get unread message count
  const getUnreadMessageCount = () => {
    if (!currentUser) return 0;
    const allMessages = DataManager.getAllMessages();
    return allMessages.filter(
      msg => msg.toUserId === currentUser.id && !msg.read
    ).length;
  };

  const unreadMessageCount = getUnreadMessageCount();

  if (!currentUser) {
    return null;
  }

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
              <h1 className="text-xl font-bold text-blue-600">Kullanıcı Paneli</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsMessageCenterOpen(true)}
                className="relative"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Mesajlar
                {unreadMessageCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-xs min-w-[20px] h-5 flex items-center justify-center">
                    {unreadMessageCount}
                  </Badge>
                )}
              </Button>
              <Button onClick={() => navigate('/create-listing')}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni İlan
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{currentUser.name}</h2>
                  <p className="text-muted-foreground">{currentUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{currentUser.rating}</span>
                    <span className="text-sm text-muted-foreground">({currentUser.reviewCount} değerlendirme)</span>
                    <Badge variant="secondary">{currentUser.city}</Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Üyelik Türü</p>
                <Badge className="bg-blue-100 text-blue-800">
                  {currentUser.role === 'buyer' ? 'Alıcı' : 
                   currentUser.role === 'seller' ? 'Satıcı' : 'Alıcı & Satıcı'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats - Now Clickable */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatClick('total-listings')}
          >
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xl font-bold">{stats.totalListings}</p>
              <p className="text-xs text-muted-foreground">Toplam İlan</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatClick('active-listings')}
          >
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-xl font-bold">{stats.activeListings}</p>
              <p className="text-xs text-muted-foreground">Aktif İlan</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatClick('total-offers')}
          >
            <CardContent className="p-4 text-center">
              <MessageCircle className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-xl font-bold">{stats.totalOffers}</p>
              <p className="text-xs text-muted-foreground">Verdiğim Teklif</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatClick('accepted-offers')}
          >
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-xl font-bold">{stats.acceptedOffers}</p>
              <p className="text-xs text-muted-foreground">Kabul Edilen</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatClick('received-offers')}
          >
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-xl font-bold">{stats.receivedOffers}</p>
              <p className="text-xs text-muted-foreground">Gelen Teklif</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatClick('messages')}
          >
            <CardContent className="p-4 text-center relative">
              <MessageCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <p className="text-xl font-bold">{unreadMessageCount}</p>
              <p className="text-xs text-muted-foreground">Okunmamış Mesaj</p>
              {unreadMessageCount > 0 && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-listings">İlanlarım ({myListings.length})</TabsTrigger>
            <TabsTrigger value="my-offers">Tekliflerim ({myOffers.length})</TabsTrigger>
            <TabsTrigger value="received-offers">Gelen Teklifler ({offersToMyListings.length})</TabsTrigger>
          </TabsList>

          {/* My Listings */}
          <TabsContent value="my-listings">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>İlanlarım</CardTitle>
                  <Button onClick={() => navigate('/create-listing')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni İlan Ver
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {myListings.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Henüz ilanınız yok</h3>
                    <p className="text-muted-foreground mb-4">
                      İlk ilanınızı vererek satıcılardan teklif almaya başlayın.
                    </p>
                    <Button onClick={() => navigate('/create-listing')}>
                      <Plus className="h-4 w-4 mr-2" />
                      İlk İlanınızı Verin
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myListings.map(listing => (
                      <div key={listing.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{listing.title}</h3>
                              <Badge className={getStatusColor(listing.status)}>
                                {getStatusText(listing.status)}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                              {listing.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Kategori: {listing.category}</span>
                              <span>Şehir: {listing.city}</span>
                              <span>Bütçe: {DataManager.formatPrice(listing.budgetMin)} - {DataManager.formatPrice(listing.budgetMax)}</span>
                              <span>{listing.offerCount} teklif</span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/listing/${listing.id}`)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Görüntüle
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4 mr-1" />
                              Düzenle
                            </Button>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4 mr-1" />
                              Sil
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Offers */}
          <TabsContent value="my-offers">
            <Card>
              <CardHeader>
                <CardTitle>Verdiğim Teklifler</CardTitle>
              </CardHeader>
              <CardContent>
                {myOffers.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Henüz teklif vermediniz</h3>
                    <p className="text-muted-foreground mb-4">
                      İlanları inceleyin ve uygun olanlara teklif verin.
                    </p>
                    <Button onClick={() => navigate('/')}>
                      İlanları İncele
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myOffers.map(offer => {
                      const listing = DataManager.getListings().find(l => l.id === offer.listingId);
                      return (
                        <div key={offer.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{listing?.title}</h4>
                              <p className="text-sm text-muted-foreground">İlan sahibi: {listing?.buyerName}</p>
                            </div>
                            <Badge className={getStatusColor(offer.status)}>
                              {getStatusText(offer.status)}
                            </Badge>
                          </div>
                          <OfferCard offer={offer} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Received Offers */}
          <TabsContent value="received-offers">
            <Card>
              <CardHeader>
                <CardTitle>İlanlarıma Gelen Teklifler</CardTitle>
              </CardHeader>
              <CardContent>
                {offersToMyListings.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Henüz teklif almadınız</h3>
                    <p className="text-muted-foreground mb-4">
                      İlanlarınıza satıcılar teklif vermeye başladığında burada görünecek.
                    </p>
                    <Button onClick={() => navigate('/create-listing')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni İlan Ver
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {offersToMyListings.map(offer => {
                      const listing = DataManager.getListings().find(l => l.id === offer.listingId);
                      return (
                        <div key={offer.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{listing?.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                Teklif veren: {offer.sellerName} 
                                <Star className="h-3 w-3 inline ml-1 fill-yellow-400 text-yellow-400" />
                                {offer.sellerRating}
                              </p>
                            </div>
                            <Badge className={getStatusColor(offer.status)}>
                              {getStatusText(offer.status)}
                            </Badge>
                          </div>
                          <OfferCard 
                            offer={offer} 
                            showActions={offer.status === 'active'}
                            onAccept={(offerId) => console.log('Accept offer:', offerId)}
                            onReject={(offerId) => console.log('Reject offer:', offerId)}
                            onMessage={(offerId) => console.log('Message seller:', offerId)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Message Center */}
      <MessageCenter
        isOpen={isMessageCenterOpen}
        onClose={() => setIsMessageCenterOpen(false)}
      />
    </div>
  );
}