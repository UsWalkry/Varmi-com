import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth-mysql';
import { mysqlAPI } from '../lib/mysql-api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Package, TrendingUp, MessageCircle, MapPin, XCircle, Calendar, DollarSign, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import FavoriteButton from '../components/FavoriteButton';
import Header from '../components/Header';
import { formatPrice, formatPriceShort } from '@/utils/formatPrice';

interface Listing {
  id: number;
  title: string;
  description: string;
  city: string;
  location?: string;
  condition: string;
  budgetMax: number;
  budgetMin: number;
  price?: number;
  category: string;
  subcategory: string;
  createdAt: string;
  soldQuantity?: number;
  status: string;
  images?: string;
  offerCount?: number;
  deliveryType?: string;
}

interface Offer {
  id: number;
  listingId: number;
  userId: number;
  price: number;
  message: string;
  status: string;
  createdAt: string;
  productName?: string;
  condition?: string;
  shippingCost?: number;
  images?: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  city?: string;
  phone?: string;
  gender?: string;
  addressLine1?: string;
  district?: string;
  postalCode?: string;
  createdAt?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<Offer[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('listings');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Helper function to ensure array response
  const ensureArray = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
    if (data && typeof data === 'object' && Array.isArray(data.listings)) return data.listings;
    if (data && typeof data === 'object' && Array.isArray(data.offers)) return data.offers;
    if (data && typeof data === 'object' && Array.isArray(data.favorites)) return data.favorites;
    return [];
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Dashboard data loading started...');
      
      // Clean up orphaned favorites first
      try {
        await mysqlAPI.cleanupFavorites();
        console.log('🧹 Orphaned favorites cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Favorites cleanup failed:', cleanupError);
      }
      
      const promises = [
        mysqlAPI.getMyListings().catch((error) => { 
          console.error('❌ getMyListings failed:', error);
          return [];
        }),
        mysqlAPI.getMyOffers().catch((error) => { 
          console.error('❌ getMyOffers failed:', error);
          return [];
        }),
        // Temporarily disable incoming offers until backend endpoint is available
        Promise.resolve([]), // mysqlAPI.getIncomingOffers().catch(() => []),
        mysqlAPI.getFavorites().catch(() => [])
      ];

      const [listings, offers, incoming, favorites] = await Promise.allSettled(promises);
      
      console.log('📋 Raw responses:', { listings, offers, incoming, favorites });
      
      // Debug price data specifically
      if (listings.status === 'fulfilled' && listings.value.length > 0) {
        console.log('🔍 First listing price debug:', listings.value[0]);
        console.log('🔍 First listing price type:', typeof listings.value[0]?.budgetMax, listings.value[0]?.budgetMax);
      }
      if (offers.status === 'fulfilled' && offers.value.length > 0) {
        console.log('🔍 First offer price debug:', offers.value[0]);
        console.log('🔍 First offer price type:', typeof offers.value[0]?.price, offers.value[0]?.price);
      }
      
      const offersData = offers.status === 'fulfilled' ? offers.value : [];
      console.log('🎯 My offers data:', offersData);
      console.log('🔢 My offers count:', offersData.length);
      
      // Convert price fields to numbers for safety
      const listingsData = listings.status === 'fulfilled' ? listings.value : [];
      console.log('🔍 Raw listings data before processing:', listingsData);
      console.log('🔍 First raw listing keys:', listingsData[0] ? Object.keys(listingsData[0]) : 'No listings');
      
      const processedListings = ensureArray(listingsData)
        .map(listing => ({
          ...listing,
          budgetMax: parseFloat(listing.budgetMax) || parseFloat(listing.budget_max) || 0,
          budgetMin: parseFloat(listing.budgetMin) || parseFloat(listing.budget_min) || 0,
          price: parseFloat(listing.price) || 0
        }));
        
      console.log('🔍 Processed listings:', processedListings);
      console.log('🔍 First processed listing keys:', processedListings[0] ? Object.keys(processedListings[0]) : 'No listings');
      
      const processedOffers = ensureArray(offersData)
        .map(offer => ({
          ...offer,
          price: parseFloat(offer.price) || 0,
          shippingCost: parseFloat(offer.shippingCost) || parseFloat(offer.shipping_cost) || 0
        }));
      
      setMyListings(processedListings);
      setMyOffers(processedOffers);
      setIncomingOffers(ensureArray(incoming.status === 'fulfilled' ? incoming.value : []));
      setFavoriteListings(ensureArray(favorites.status === 'fulfilled' ? favorites.value : []));
      
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Dashboard data yüklenirken hata:', error);
      toast.error('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteChange = useCallback((listingId: string, isFavorite: boolean) => {
    if (isFavorite) {
      // Favorilere eklendi - favoriler listesini yeniden yükle
      mysqlAPI.getFavorites().then(data => {
        setFavoriteListings(ensureArray(data));
      }).catch(console.error);
    } else {
      // Favorilerden çıkarıldı - listeden kaldır
      setFavoriteListings(prev => prev.filter(listing => 
        ((listing as any).listing_id || listing.id).toString() !== listingId
      ));
    }
  }, []);

  const getTimeAgo = (dateString: string) => {
    console.log('📅 Date string received:', dateString);
    const date = new Date(dateString);
    console.log('📅 Parsed date:', date);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    console.log('📅 Diff in minutes:', diffInMinutes);
    
    if (isNaN(diffInMinutes)) {
      console.warn('❌ Invalid date calculation for:', dateString);
      return 'Tarih bilinmiyor';
    }
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} dakika önce`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} saat önce`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} gün önce`;
    }
  };

  const getDeliveryTypeText = (deliveryType: string) => {
    const deliveryMap: { [key: string]: string } = {
      'shipping': 'Kargo',
      'pickup': 'Elden Teslim',
      'both': 'Kargo/Elden'
    };
    return deliveryMap[deliveryType] || deliveryType;
  };

  const getConditionText = (condition: string) => {
    const conditionMap: { [key: string]: string } = {
      'new': 'Sıfır',
      'like-new': 'Sıfır Ayarında',
      'used': '2. El',
      'good': 'İyi',
      'fair': 'Orta',
      'poor': 'Kötü',
      'any': 'Kargo/Elden'
    };
    return conditionMap[condition] || condition;
  };

  const getDeliveryText = (deliveryType: string) => {
    switch (deliveryType) {
      case 'shipping': return 'Kargo';
      case 'pickup': return 'Elden Teslim';
      case 'both': return 'Kargo/Elden';
      default: return deliveryType;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'active': 'Aktif',
      'sold': 'Satıldı',
      'inactive': 'Pasif',
      'pending': 'Beklemede'
    };
    return statusMap[status] || status;
  };

  const handleDeleteListing = async (listingId: number) => {
    if (!confirm('Bu ilanı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await mysqlAPI.deleteListing(listingId);
      setMyListings(prev => prev.filter(listing => listing.id !== listingId));
      toast.success('İlan başarıyla silindi');
    } catch (error) {
      console.error('İlan silinirken hata:', error);
      toast.error('İlan silinirken bir hata oluştu');
    }
  };

  const handleWithdrawOffer = async (offerId: number) => {
    try {
      await mysqlAPI.withdrawOffer(offerId);
      setMyOffers(prev => prev.map(offer => 
        offer.id === offerId ? { ...offer, status: 'withdrawn' } : offer
      ));
      toast.success('Teklif geri çekildi');
    } catch (error) {
      console.error('Teklif geri çekilirken hata:', error);
      toast.error('Teklif geri çekilirken bir hata oluştu');
    }
  };

  const handleOfferAction = async (offerId: number, action: 'accept' | 'reject') => {
    try {
      await mysqlAPI.respondToOffer(offerId, action);
      setIncomingOffers(prev => prev.map(offer => 
        offer.id === offerId ? { ...offer, status: action === 'accept' ? 'accepted' : 'rejected' } : offer
      ));
      toast.success(action === 'accept' ? 'Teklif kabul edildi' : 'Teklif reddedildi');
    } catch (error) {
      console.error('Teklif cevaplanırken hata:', error);
      toast.error('Teklif cevaplanırken bir hata oluştu');
    }
  };

  const getImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '/placeholder-image.jpg';
    
    // If it's already a full HTTP URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // If it starts with /uploads/, prepend server URL
    if (imagePath.startsWith('/uploads/')) {
      return `http://localhost:8787${imagePath}`;
    }
    
    // If it's just a filename, add full uploads path
    return `http://localhost:8787/uploads/${imagePath}`;
  };

  const parseImages = (imagesString: string | null | undefined | any[]): string[] => {
    if (!imagesString) return [];
    
    // If it's already an array, return it
    if (Array.isArray(imagesString)) {
      return imagesString.filter(img => typeof img === 'string' && img.trim());
    }
    
    // If it's not a string, try to stringify and parse
    if (typeof imagesString !== 'string') {
      try {
        imagesString = JSON.stringify(imagesString);
      } catch {
        return [];
      }
    }
    
    try {
      if (imagesString.startsWith('[')) {
        return JSON.parse(imagesString);
      }
      return imagesString.split(',').map(img => img.trim()).filter(Boolean);
    } catch {
      return imagesString.split(',').map(img => img.trim()).filter(Boolean);
    }
  };

  if (!user) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Giriş Gerekli</h1>
          <p className="text-gray-600 mb-4">Dashboard'u görüntülemek için giriş yapmanız gerekiyor.</p>
          <Button onClick={() => navigate('/login')}>Giriş Yap</Button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Yükleniyor...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Panelim</h1>
          <p className="text-gray-600">Hoş geldin, {user.firstName}!</p>
        </div>

      <div className="space-y-6">
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
                  <p className="text-sm text-muted-foreground mb-4">İlk ilanını oluştur ve satışa başla!</p>
                  <Button onClick={() => navigate('/create-listing')}>
                    İlan Oluştur
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {myListings.filter(listing => listing && listing.id).map((listing) => {
                  console.log('🏠 Listing debug:', listing); // Geçici debug
                  const images = parseImages(listing.images);
                  const mainImage = images.length > 0 ? getImageUrl(images[0]) : '/placeholder-image.jpg';
                  
                  return (
                    <Card key={listing.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* İlan Görseli */}
                          <div className="flex-shrink-0">
                            <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border">
                              {images.length > 0 ? (
                                <img 
                                  src={mainImage}
                                  alt={listing.title}
                                  className="w-full h-full object-cover"
                                  onLoad={() => console.log('✅ Image loaded:', mainImage)}
                                  onError={(e) => {
                                    console.log('❌ Image failed to load:', mainImage);
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-image.jpg';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* İlan Detayları */}
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-bold text-xl text-gray-900 mb-1">
                                {listing.title || 'İlan başlığı'}
                              </h3>
                              <p className="text-gray-600 text-sm line-clamp-2">
                                {listing.description || 'Açıklama bulunmuyor'}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <div className="flex items-center text-gray-600">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span>{listing.city || 'Şehir belirtilmedi'}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>{getTimeAgo(listing.createdAt)}</span>
                              </div>
                              {(listing.deliveryType || listing.condition) && (
                                <div className="flex items-center text-gray-600">
                                  <Package className="h-4 w-4 mr-1" />
                                  <span>
                                    {listing.deliveryType 
                                      ? getDeliveryText(listing.deliveryType)
                                      : getConditionText(listing.condition)
                                    }
                                  </span>
                                </div>
                              )}
                              {listing.offerCount !== undefined && (
                                <div className="flex items-center text-gray-600">
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                  <span>{listing.offerCount} teklif</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-green-600">
                                    {formatPriceShort(listing.budgetMax || (listing as any).budget_max || 0)}
                                  </span>
                                  {(listing.budgetMin || (listing as any).budget_min) && (listing.budgetMin || (listing as any).budget_min) !== (listing.budgetMax || (listing as any).budget_max) && (
                                    <span className="text-sm text-gray-500">
                                      - {formatPriceShort((listing.budgetMin || (listing as any).budget_min) || 0)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <Badge variant="outline">
                                    {getStatusText(listing.status || 'active')}
                                  </Badge>
                                  {listing.soldQuantity && listing.soldQuantity > 0 && (
                                    <span className="text-xs text-green-600 font-medium">
                                      {listing.soldQuantity} satıldı
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/listing/${listing.id}`)}
                                >
                                  Görüntüle
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/edit-listing/${listing.id}`)}
                                >
                                  Düzenle
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteListing(listing.id)}
                                >
                                  Sil
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* My Offers Tab */}
          <TabsContent value="offers" className="space-y-4">
            <h2 className="text-xl font-semibold">Tekliflerim</h2>
            
            {myOffers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">Henüz teklifin yok</p>
                  <p className="text-sm text-muted-foreground">Beğendiğin ürünlere teklif ver!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {myOffers.filter(offer => offer && offer.id).map((offer) => {
                  // Type assertion for extended offer data from backend
                  const extendedOffer = offer as any;
                  
                  // Teklif için görsel yoksa placeholder kullan
                  const offerImage = offer.images ? parseImages(offer.images)[0] : null;
                  const mainImage = offerImage ? getImageUrl(offerImage) : '/placeholder-image.jpg';
                  
                  return (
                    <Card key={offer.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500">
                      <CardContent className="p-6">
                        <div className="flex gap-6">
                          {/* Teklif Görseli */}
                          <div className="flex-shrink-0">
                            <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border">
                              {mainImage ? (
                                <img 
                                  src={mainImage}
                                  alt={offer.productName || 'Teklif'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-image.jpg';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Teklif Detayları */}
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-bold text-xl text-gray-900 mb-1">
                                {extendedOffer.product_name || offer.productName || 'Ürün adı'}
                              </h3>
                              <p className="text-gray-600 text-sm mb-2">
                                <strong>İlan:</strong> {extendedOffer.listing?.title || extendedOffer.listing_title || 'Başlık bulunamadı'}
                              </p>
                              {offer.message && (
                                <p className="text-gray-600 text-sm line-clamp-2">
                                  {offer.message}
                                </p>
                              )}
                            </div>

                            {/* İlan Açıklaması */}
                            {extendedOffer.listing?.description && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-1">İlan Açıklaması:</h4>
                                <p className="text-sm text-gray-600 line-clamp-3">
                                  {extendedOffer.listing.description}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              
                              {(offer.condition || extendedOffer.listing?.condition) && (
                                <div className="flex items-center text-gray-600">
                                  <Package className="h-4 w-4 mr-1" />
                                  <span>{getConditionText(offer.condition || extendedOffer.listing?.condition)}</span>
                                </div>
                              )}

                              {/* Stok Bilgileri */}
                              {extendedOffer.quantity && (
                                <div className="flex items-center text-gray-600 text-sm">
                                  <Package className="h-4 w-4 mr-1" />
                                  <span>
                                    {[
                                      extendedOffer.quantity && `Toplam adet: ${extendedOffer.quantity}`,
                                      extendedOffer.quantity && `Diğer kullanıcılara açık: ${Math.max(0, extendedOffer.quantity - 1)}`,
                                      extendedOffer.quantity && `Kalan: ${Math.max(0, extendedOffer.quantity - (extendedOffer.sold_quantity || 0) - 1)}`
                                    ].filter(Boolean).join(' • ')}
                                  </span>
                                </div>
                              )}

                              {/* İlan Lokasyonu */}
                              {extendedOffer.listing?.location && (
                                <div className="flex items-center text-gray-600">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span>{extendedOffer.listing.location}</span>
                                </div>
                              )}

                              {/* İlan Bilgileri */}
                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                {extendedOffer.listing?.location && (
                                  <div className="flex items-center text-gray-600">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    <span>{extendedOffer.listing.location}</span>
                                  </div>
                                )}
                                {(offer.condition || extendedOffer.listing?.condition) && (
                                  <div className="flex items-center text-gray-600">
                                    <Package className="h-4 w-4 mr-1" />
                                    <span>{getConditionText(offer.condition || extendedOffer.listing?.condition)}</span>
                                  </div>
                                )}
                                {extendedOffer.listing?.delivery_type && (
                                  <div className="flex items-center text-gray-600">
                                    <Package className="h-4 w-4 mr-1" />
                                    <span>{getDeliveryTypeText(extendedOffer.listing.delivery_type)}</span>
                                  </div>
                                )}
                              </div>

                            {/* Fiyat ve Durum */}
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-green-600">
                                    {formatPriceShort(offer.price || 0)}
                                  </span>
                                  {(offer.shippingCost || extendedOffer.shipping_cost || 0) > 0 && (
                                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      + {formatPriceShort(offer.shippingCost || extendedOffer.shipping_cost || 0)} kargo
                                    </span>
                                  )}
                                </div>
                                <Badge variant="outline" className={
                                  offer.status === 'active' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' :
                                  offer.status === 'accepted' ? 'border-green-500 text-green-700 bg-green-50' :
                                  offer.status === 'rejected' ? 'border-red-500 text-red-700 bg-red-50' :
                                  offer.status === 'withdrawn' ? 'border-gray-500 text-gray-700 bg-gray-50' : 
                                  'border-yellow-500 text-yellow-700 bg-yellow-50'
                                }>
                                  {offer.status === 'active' && '⏳ Bekliyor'}
                                  {offer.status === 'accepted' && '✅ Kabul Edildi'}
                                  {offer.status === 'rejected' && '❌ Reddedildi'}
                                  {offer.status === 'withdrawn' && '↩️ Geri Çekildi'}
                                </Badge>
                              </div>

                              <div className="flex items-center space-x-2">
                                {offer.status === 'active' && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      if (window.confirm('Bu teklifi geri çekmek istediğinizden emin misiniz?')) {
                                        // Teklif geri çekme işlemi
                                        console.log('Teklif geri çekiliyor:', offer.id);
                                      }
                                    }}
                                  >
                                    Geri Çek
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
                {incomingOffers.filter(offer => offer && offer.id).map((offer) => (
                  <Card key={offer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{offer.productName || 'Ürün adı'}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <span>{getTimeAgo(offer.createdAt)}</span>
                          </div>
                          <div className="mt-2">
                            <span className="font-semibold text-green-600">{formatPriceShort(offer.price || 0)}</span>
                            {(offer.shippingCost || 0) > 0 && (
                              <span className="text-xs text-muted-foreground ml-2">
                                + {formatPriceShort(offer.shippingCost || 0)} kargo
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleOfferAction(offer.id, 'accept')}
                            >
                              Kabul Et
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleOfferAction(offer.id, 'reject')}
                            >
                              Reddet
                            </Button>
                          </div>
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
                  <p className="text-lg font-medium text-muted-foreground mb-2">Henüz favori ürünün yok</p>
                  <p className="text-sm text-muted-foreground mb-4">Beğendiğin ürünleri favorilere ekle!</p>
                  <Button onClick={() => navigate('/')}>
                    Ürünleri Keşfet
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {(favoriteListings || []).filter(listing => listing && listing.id).map((listing) => {
                  const images = parseImages(listing.images);
                  const mainImage = images.length > 0 ? getImageUrl(images[0]) : '/placeholder-image.jpg';
                  
                  return (
                    <Card key={listing.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-500">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Favori İlan Görseli */}
                          <div className="flex-shrink-0">
                            <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border">
                              {images.length > 0 ? (
                                <img 
                                  src={mainImage}
                                  alt={listing.title}
                                  className="w-full h-full object-cover"
                                  onLoad={() => console.log('✅ Favorite image loaded:', mainImage)}
                                  onError={(e) => {
                                    console.log('❌ Favorite image failed to load:', mainImage);
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-image.jpg';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Favori İlan Detayları */}
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-bold text-xl text-gray-900 mb-1">
                                {listing.title || 'İlan başlığı'}
                              </h3>
                              <p className="text-gray-600 text-sm line-clamp-2">
                                {listing.description || 'Açıklama bulunmuyor'}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <div className="flex items-center text-gray-600">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span>{listing.city || listing.location || 'Şehir belirtilmedi'}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>{getTimeAgo(listing.createdAt)}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Heart className="h-4 w-4 mr-1" />
                                <span>Favorilerde</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-green-600">
                                    {formatPriceShort(listing.budgetMax || listing.price || 0)}
                                  </span>
                                  {listing.budgetMin && listing.budgetMin !== listing.budgetMax && (
                                    <span className="text-sm text-gray-500">
                                      - {formatPriceShort(listing.budgetMin || 0)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
                                    ❤️ Favori
                                  </Badge>
                                  {listing.status && (
                                    <span className="text-xs text-gray-600 capitalize">
                                      {listing.status === 'active' ? 'Aktif' : listing.status}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <FavoriteButton
                                  listingId={(listing as any).listing_id?.toString() || listing.id.toString()}
                                  userId={user.id}
                                  size="sm"
                                  initialState={true}
                                  onFavoriteChange={handleFavoriteChange}
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </>
  );
}