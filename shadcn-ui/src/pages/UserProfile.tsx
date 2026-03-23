import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Heart, Package, Tag, MapPin, Calendar, Clock, Eye, Star, Shield, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mysqlAPI, getImageUrl } from '@/lib/mysql-api';
import { toast } from 'sonner';
import { formatPrice, formatPriceShort } from '@/utils/formatPrice';
import StarRatingDisplay from '@/components/star-rating-display';
import SellerReviewsModal from '@/components/SellerReviewsModal';
import Header from '@/components/Header-mysql';
import { maskDisplayName } from '@/lib/utils';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  created_at: string;
  listings_count: number;
  offers_count: number;
  favorites_count: number;
  rating_avg: number;
  rating_count: number;
}

interface UserListing {
  id: string;
  title: string;
  description: string;
  budget_max: number;
  images: string[];
  created_at: string;
  status: string;
  category: string;
}

interface UserOffer {
  id: string;
  listing_title: string;
  price: number;
  quantity: number;
  status: string;
  created_at: string;
  listing_id: string;
}

interface UserFavorite {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_images: string[];
  listing_budget_max: number;
  created_at: string;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<UserListing[]>([]);
  const [offers, setOffers] = useState<UserOffer[]>([]);
  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('listings');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserProfile();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    try {
  setIsLoading(true);
  setErrorMessage(null);
  setProfile(null);
  setListings([]);
  setOffers([]);
  setFavorites([]);
      
      // Paralel olarak tüm verileri yükle
      const [profileRes, listingsRes, offersRes, favoritesRes] = await Promise.allSettled([
        mysqlAPI.getUserProfile(userId!),
        mysqlAPI.getUserListings(userId!),
        mysqlAPI.getUserOffers(userId!),
        mysqlAPI.getUserFavorites(userId!)
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.success) {
        const profileData = profileRes.value.user;
        setProfile({
          ...profileData,
          rating_avg: Number(profileData?.rating_avg) || 0,
          rating_count: Number(profileData?.rating_count) || 0
        });
      } else {
        const message = profileRes.status === 'fulfilled'
          ? profileRes.value.error || 'Kullanıcı profili bulunamadı'
          : 'Kullanıcı profili yüklenirken hata oluştu';
        setErrorMessage(message);
        toast.error(message);
      }

      if (listingsRes.status === 'fulfilled' && listingsRes.value.success) {
        setListings(listingsRes.value.listings || []);
      }

      if (offersRes.status === 'fulfilled' && offersRes.value.success) {
        console.log('🔍 UserProfile offers data:', offersRes.value.offers);
        console.log('🔍 First offer price:', offersRes.value.offers?.[0]?.price, 'type:', typeof offersRes.value.offers?.[0]?.price);
        setOffers(offersRes.value.offers || []);
      }

      if (favoritesRes.status === 'fulfilled' && favoritesRes.value.success) {
        setFavorites(favoritesRes.value.favorites || []);
      }

    } catch (error) {
      console.error('Error loading user profile:', error);
      const message = 'Profil yüklenirken hata oluştu';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'active': { label: 'Aktif', variant: 'default' },
      'closed': { label: 'Kapandı', variant: 'secondary' },
      'expired': { label: 'Süresi Doldu', variant: 'destructive' },
      'pending': { label: 'Bekliyor', variant: 'outline' },
      'accepted': { label: 'Kabul Edildi', variant: 'default' },
      'rejected': { label: 'Reddedildi', variant: 'destructive' }
    };

    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-lg font-medium text-muted-foreground mt-4">Profil yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-32 w-32 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {errorMessage || 'Kullanıcı bulunamadı'}
          </p>
          <Button className="mt-6" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />
      
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link to="/" className="hover:text-blue-600 transition-colors">Ana Sayfa</Link>
            <span>›</span>
            <Link to="/profiles" className="hover:text-blue-600 transition-colors">Kullanıcılar</Link>
            <span>›</span>
            <span className="text-gray-900 font-medium">
              {maskDisplayName(`${profile.firstName || 'Bilinmeyen'} ${profile.lastName || 'Kullanıcı'}`)}
            </span>
          </div>
        </div>
      </div>

      {/* Profil Header (Minimalist) */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-600 hover:bg-gray-100 p-2 h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Avatar className="h-14 w-14 border border-gray-200">
                  <AvatarImage src={`/avatars/${profile.id}.jpg`} />
                  <AvatarFallback className="text-lg">
                    {profile.firstName?.[0] || 'U'}{profile.lastName?.[0] || 'N'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 shadow-sm">
                  <Shield className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-semibold truncate">
                    {maskDisplayName(`${profile.firstName || 'Bilinmeyen'} ${profile.lastName || 'Kullanıcı'}`)}
                  </h1>
                  <Badge variant="secondary" className="text-xs">
                    <Award className="h-3 w-3 mr-1" /> Doğrulanmış
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap mt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Üyelik: {profile.created_at ? new Date(profile.created_at).toLocaleDateString('tr-TR') : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rating ve küçük istatistikler */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setReviewsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                title="Değerlendirmeleri görüntüle"
              >
                <Star className="h-4 w-4 text-yellow-500" />
                {profile.rating_count > 0 ? (
                  <>
                    <span className="font-medium">{profile.rating_avg.toFixed(1)}</span>
                    <span className="text-gray-500">/ 5</span>
                    <span className="text-gray-500">({profile.rating_count})</span>
                  </>
                ) : (
                  <span className="text-gray-500">Değerlendirme yok</span>
                )}
              </button>
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-600">
                <span className="rounded-full bg-gray-100 px-2 py-1">{listings.length} İlan</span>
                <span className="rounded-full bg-gray-100 px-2 py-1">{offers.length} Teklif</span>
                <span className="rounded-full bg-gray-100 px-2 py-1">{favorites.length} Favori</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profil İçeriği */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100">
              <TabsTrigger value="listings" className="flex items-center gap-2 data-[state=active]:bg-white">
                <Package className="h-4 w-4" />
                İlanları ({listings.length})
              </TabsTrigger>
              <TabsTrigger value="offers" className="flex items-center gap-2 data-[state=active]:bg-white">
                <Tag className="h-4 w-4" />
                Teklifleri ({offers.length})
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-2 data-[state=active]:bg-white">
                <Heart className="h-4 w-4" />
                Favorileri ({favorites.length})
              </TabsTrigger>
            </TabsList>          {/* İlanları Tab */}
          <TabsContent value="listings" className="space-y-6 mt-6">
            {listings.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="text-center py-16">
                  <Package className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                  <p className="text-xl font-medium text-gray-600 mb-2">Henüz ilan yok</p>
                  <p className="text-gray-500 max-w-md mx-auto">Bu kullanıcı henüz hiç ilan oluşturmamış. İlanlar oluşturulduğunda burada görünecek.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <Link key={listing.id} to={`/listing/${listing.id}`}>
                    <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden h-[450px] flex flex-col">
                      <div className="aspect-[4/3] relative overflow-hidden flex-shrink-0">
                        <img
                          src={getImageUrl(listing.images[0]) || '/image-placeholder.png'}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/image-placeholder.png';
                          }}
                        />
                        <div className="absolute top-3 right-3">
                          {getStatusBadge(listing.status)}
                        </div>
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-white/90 text-gray-700 border-0">
                            <Package className="h-3 w-3 mr-1" />
                            {listing.category || 'Kategori'}
                          </Badge>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                          <div className="text-white">
                            <div className="font-bold text-base">
                              {formatPriceShort(listing.budget_max)}'ye kadar
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <CardHeader className="p-3 flex-shrink-0">
                        <CardTitle className="text-sm line-clamp-2 group-hover:text-blue-600 transition-colors h-10 overflow-hidden leading-tight">
                          {listing.title}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent className="p-3 pt-0 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed">
                            {listing.description}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {new Date(listing.created_at).toLocaleDateString('tr-TR')}
                            </div>
                            <div className="flex items-center gap-1 text-blue-600">
                              <Eye className="h-3 w-3" />
                              <span className="text-xs font-medium">İlana Git</span>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">İlan Durumu</div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">Durum:</span>
                              <span className={`font-medium ${
                                listing.status === 'active' ? 'text-green-600' : 
                                listing.status === 'sold' ? 'text-blue-600' : 'text-gray-600'
                              }`}>
                                {listing.status === 'active' ? 'Aktif' : 
                                 listing.status === 'sold' ? 'Satıldı' : 
                                 listing.status === 'inactive' ? 'Pasif' : 'Bilinmiyor'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {new Date(listing.created_at).toLocaleString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Teklifler Tab */}
          <TabsContent value="offers" className="space-y-4">
            {offers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Tag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Henüz teklif yok</p>
                  <p className="text-gray-500">Bu kullanıcı henüz hiç teklif vermemiş.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <Link key={offer.id} to={`/listing/${offer.listing_id}`}>
                    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Tag className="h-5 w-5 text-blue-600" />
                              <h3 className="font-semibold text-lg text-blue-600 hover:text-blue-800">
                                {offer.listing_title}
                              </h3>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                              <div className="bg-green-50 p-3 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-1">Teklif Fiyatı</div>
                                <div className="text-lg font-bold text-green-600">
                                  {formatPriceShort(offer.price)}
                                </div>
                              </div>
                              
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-1">Miktar</div>
                                <div className="text-lg font-bold text-blue-600">
                                  {offer.quantity} adet
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-1">Teklif Tarihi</div>
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  {new Date(offer.created_at).toLocaleDateString('tr-TR')}
                                </div>
                              </div>
                              
                              <div className="bg-purple-50 p-3 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-1">Durum</div>
                                <div>{getStatusBadge(offer.status)}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>
                                {new Date(offer.created_at).toLocaleString('tr-TR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Eye className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-500">İlana Git</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Favoriler Tab */}
          <TabsContent value="favorites" className="space-y-4">
            {favorites.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Henüz favori yok</p>
                  <p className="text-gray-500">Bu kullanıcı henüz hiçbir ürünü favorilememmiş.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((favorite) => (
                  <Link key={favorite.id} to={`/listing/${favorite.listing_id}`}>
                    <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden h-[450px] flex flex-col">
                      <div className="aspect-[4/3] relative overflow-hidden flex-shrink-0">
                        <img
                          src={favorite.listing_images[0] || '/image-placeholder.png'}
                          alt={favorite.listing_title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/image-placeholder.png';
                          }}
                        />
                        <div className="absolute top-3 right-3">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                          <div className="text-white">
                            <div className="font-bold text-base">
                              {formatPriceShort(favorite.listing_budget_max)}'ye kadar
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <CardHeader className="p-3 flex-shrink-0">
                        <CardTitle className="text-sm line-clamp-2 group-hover:text-blue-600 transition-colors h-10 overflow-hidden leading-tight">
                          {favorite.listing_title}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent className="p-3 pt-0 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {new Date(favorite.created_at).toLocaleDateString('tr-TR')}
                            </div>
                            <div className="flex items-center gap-1 text-blue-600">
                              <Eye className="h-3 w-3" />
                              <span className="text-xs font-medium">İlana Git</span>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">Favori Ekleme Tarihi</div>
                            <div className="text-xs font-medium">
                              {new Date(favorite.created_at).toLocaleString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Reviews Modal */}
      {profile && (
        <SellerReviewsModal
          isOpen={reviewsModalOpen}
          onClose={() => setReviewsModalOpen(false)}
          sellerId={profile.id}
          sellerName={maskDisplayName(`${profile.firstName} ${profile.lastName}`.trim())}
        />
      )}
    </div>
  );
}