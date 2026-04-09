import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
impo            createdAt: o.created_at,
            images: [], // Images'ı artık hiç yüklemeyelim - sadece stok bilgisi için
            soldToOthers: parseInt(o.sold_to_others) || 0
          }));

          setOffers(mappedOffers);nt, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Clock, Package, Plus, Star, MessageCircle, Heart, Trash2 } from 'lucide-react';
import { Listing, Offer, DataManager, categories } from '@/lib/mockData';
import { fetchListingById, fetchOffersUi, supabaseEnabled, updateOffer, ensureCurrentUserId } from '@/lib/api';
import { mysqlAPI, getImageUrl } from '@/lib/mysql-api';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { maskDisplayName } from '@/lib/utils';
import OfferCard from '@/components/OfferCard';
import CreateOfferModal from '@/components/CreateOfferModal';
import AuthModal from '@/components/AuthModal-mysql';
import Header from '@/components/Header.tsx';
import FavoriteButton from '@/components/FavoriteButton';
import CreateListingModal from '@/components/CreateListingModal';
import { useAuth } from '@/hooks/use-auth-mysql';
import { toast } from 'sonner';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ImageMagnifier from '@/components/ImageMagnifier';

export default function ListingDetail() {
  // Review akışı kaldırıldı: Gelen Teklifler bölümü görünmeyecek
  const handleEditListing = () => {
    if (listing?.id) {
      navigate(`/edit-listing/${listing.id}`);
    }
  };
  const handleDeleteListing = () => {
    if (!listing || !authUser) return;
    if (authUser.id?.toString() !== listing.buyerId?.toString()) return;
    const ok = window.confirm('Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.');
    if (!ok) return;
    try {
      // TODO: MySQL API ile silme işlemi eklenecek
      // DataManager.deleteListing(listing.id, authUser.id);
      toast.success('İlan silindi');
      navigate('/');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'İlan silinemedi';
      toast.error(msg);
    }
  };
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // Filtre & sıralama durumları
  const [sortBy, setSortBy] = useState<'price' | 'date'>('price');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterDelivery, setFilterDelivery] = useState<'all' | 'shipping' | 'pickup'>('all');
  const [filterCondition, setFilterCondition] = useState<'all' | 'new' | 'used'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'accepted' | 'rejected' | 'withdrawn'>('all');
  const [activeImage, setActiveImage] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [isCreateListingModalOpen, setIsCreateListingModalOpen] = useState(false);
  const [descMax, setDescMax] = useState<number>(() => {
    if (typeof window === 'undefined') return 240;
    const w = window.innerWidth;
    if (w < 380) return 160;   // çok küçük ekranlar
    if (w < 640) return 200;   // sm<
    if (w < 768) return 240;   // sm-md
    if (w < 1024) return 280;  // md-lg
    if (w < 1280) return 320;  // lg-xl
    return 380;                // daha geniş ekranlar
  });

  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      let next = 380;
      if (w < 380) next = 160;
      else if (w < 640) next = 200;
      else if (w < 768) next = 240;
      else if (w < 1024) next = 280;
      else if (w < 1280) next = 320;
      setDescMax(next);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);



  const loadListingAndOffers = useCallback(async () => {
    if (!id) return;
    const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    try {
      // MySQL API kullan
      console.log('🔍 Loading listing:', id);
      const response = await mysqlAPI.getListingById(id);
      console.log('📥 Listing response:', response);
      
      if (!response.success || !response.listing) {
        toast.error('İlan bulunamadı');
        navigate('/');
        return;
      }
      
      const l = response.listing;

      // map to Listing type expected by UI
      const mapped: Listing = {
        id: l.id,
        title: l.title,
        description: l.description || '',
        budgetMax: l.price || 0,
        category: l.category || 'genel', // Backend'den gelen kategori
        city: l.location || '',
        condition: l.condition || 'any',
        deliveryType: 'both', // Varsayılan
        buyerId: l.seller?.id?.toString() || '',
        buyerName: `${l.seller?.firstName || ''} ${l.seller?.lastName || ''}`.trim() || 'Anonim',
        status: 'active',
        createdAt: l.createdAt || '',
        offerCount: 0,
        offersPublic: true,
        offersPurchasable: true,
        images: l.images || [],
        maskOwnerName: l.maskOwnerName || false,
        // İlan oluşturulduğu tarihten 30 gün sonra expire olacak şekilde hesapla
        expiresAt: l.createdAt ? (() => {
          const created = new Date(l.createdAt);
          const expires = new Date(created.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 gün
          return expires.toISOString();
        })() : undefined
      };
      setListing(mapped);
      
      // Load offers for this listing
      try {
        console.log('🔍 Loading offers for listing:', id);
        const offersResponse = await mysqlAPI.getOffers(id);
        console.log('📥 Offers response:', offersResponse);
        
        if (offersResponse.success && offersResponse.offers) {
          console.log('🔍 Raw offers from server:', offersResponse.offers);
          offersResponse.offers.forEach((offer: any, index: number) => {
            console.log(`📋 Offer ${index}:`, {
              id: offer.id,
              listing_id: offer.listing_id,
              seller_id: offer.seller_id,
              price: offer.price,
              status: offer.status
            });
          });
          
          const mappedOffers: Offer[] = offersResponse.offers.map((o: any) => ({
            id: o.id,
            listingId: o.listing_id,
            sellerId: o.seller_id,
            sellerName: o.seller_name || 'Anonim',
            sellerRating: o.seller_rating || 5.0,
            price: parseFloat(o.price) || 0,
            quantity: parseInt(o.quantity) || 1,
            condition: o.offer_condition || 'used',
            productName: o.product_name || '',
            description: o.description || '',
            deliveryType: o.delivery_type || 'shipping',
            shippingDesi: o.shipping_desi || '',
            shippingCost: parseFloat(o.shipping_cost) || 0,
            etaDays: parseInt(o.eta_days) || 3,
            status: o.status || 'active',
            validUntil: o.valid_until || '',
            createdAt: o.created_at,
            images: [], // Images'ı sonradan lazy load edeceğiz
            soldToOthers: parseInt(o.sold_to_others) || 0
          }));

          // Images'ı lazy load et (JSON parse error'ını önlemek için)
          mappedOffers.forEach(async (offer, index) => {
            try {
              const originalOffer = offersResponse.offers[index];
              if (originalOffer.images && originalOffer.images !== '[]') {
                const parsedImages = JSON.parse(originalOffer.images);
                // offer.images = parsedImages; // DISABLED
              }
            } catch (error) {
              console.warn(`� Image load error for offer ${offer.id}:`, error);
              offer.images = []; // Fallback to empty array
            }
          });

          setOffers(mappedOffers);
          console.log('✅ Loaded', mappedOffers.length, 'offers');
        } else {
          setOffers([]);
        }
      } catch (error) {
        console.error('Error loading offers:', error);
        setOffers([]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Veriler yüklenemedi');
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      loadListingAndOffers();
    }
  }, [id, loadListingAndOffers]);

  // Auth state değişikliklerini dinle
  useEffect(() => {
    if (authUser && isAuthModalOpen) {
      setIsAuthModalOpen(false);
    }
  }, [authUser, isAuthModalOpen]);

  // Periyodik olarak offers'ı yenile (5 saniyede bir)
  useEffect(() => {
    if (id && offers.length > 0) {
      const interval = setInterval(async () => {
        try {
          console.log('🔄 Refreshing offers data...');
          const offersResponse = await mysqlAPI.getOffers(id);
          if (offersResponse.success && offersResponse.offers) {
            const mappedOffers: Offer[] = offersResponse.offers.map((o: any) => ({
              id: o.id,
              listingId: o.listing_id,
              sellerId: o.seller_id,
              sellerName: o.seller_name || 'Anonim',
              sellerRating: o.seller_rating || 5.0,
              price: parseFloat(o.price) || 0,
              quantity: parseInt(o.quantity) || 1,
              condition: o.offer_condition || 'used',
              productName: o.product_name || '',
              description: o.description || '',
              deliveryType: o.delivery_type || 'shipping',
              shippingDesi: o.shipping_desi || '',
              shippingCost: parseFloat(o.shipping_cost) || 0,
              etaDays: parseInt(o.eta_days) || 3,
              status: o.status || 'active',
              validUntil: o.valid_until || '',
              createdAt: o.created_at,
              images: [], // Images skip - sadece stok için
              soldToOthers: parseInt(o.sold_to_others) || 0
            }));
            setOffers(mappedOffers);
            console.log('✅ Offers refreshed with updated stock data');
          }
        } catch (error) {
          console.error('Error refreshing offers:', error);
        }
      }, 15000); // 15 saniyede bir yenile (daha az sık)

      return () => clearInterval(interval);
    }
  }, [id, offers.length]);

  // Window focus olduğunda (checkout'dan döndüğünde) offers'ı yenile
  useEffect(() => {
    const handleWindowFocus = async () => {
      if (id && document.visibilityState === 'visible') {
        console.log('🔄 Window focused, refreshing offers...');
        try {
          const offersResponse = await mysqlAPI.getOffers(id);
          if (offersResponse.success && offersResponse.offers) {
            const mappedOffers: Offer[] = offersResponse.offers.map((o: any) => ({
              id: o.id,
              listingId: o.listing_id,
              sellerId: o.seller_id,
              sellerName: o.seller_name || 'Anonim',
              sellerRating: o.seller_rating || 5.0,
              price: parseFloat(o.price) || 0,
              quantity: parseInt(o.quantity) || 1,
              condition: o.offer_condition || 'used',
              productName: o.product_name || '',
              description: o.description || '',
              deliveryType: o.delivery_type || 'shipping',
              shippingDesi: o.shipping_desi || '',
              shippingCost: parseFloat(o.shipping_cost) || 0,
              etaDays: parseInt(o.eta_days) || 3,
              status: o.status || 'active',
              validUntil: o.valid_until || '',
              createdAt: o.created_at,
              images: [], // Images skip - sadece stok için
              soldToOthers: parseInt(o.sold_to_others) || 0
            }));
            setOffers(mappedOffers);
            console.log('✅ Offers refreshed after window focus');
          }
        } catch (error) {
          console.error('Error refreshing offers on focus:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleWindowFocus);
    return () => document.removeEventListener('visibilitychange', handleWindowFocus);
  }, [id]);



  // Görüntülenecek teklifleri filtreleyip sıralayan türev liste
  const displayedOffers = (() => {
    let list = [...offers];
    // Filtreler
    if (filterDelivery !== 'all') list = list.filter(o => o.deliveryType === filterDelivery);
    if (filterCondition !== 'all') list = list.filter(o => o.condition === filterCondition);
    if (filterStatus !== 'all') {
      list = list.filter(o => o.status === filterStatus);
    } else {
      // Varsayılan görünümde withdrawn teklifleri gizle
      list = list.filter(o => o.status !== 'withdrawn');
    }
    // Min/Max fiyat filtreleri kaldırıldı
    // Sıralama
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'price') cmp = a.price - b.price; else if (sortBy === 'date') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  })();

  // Sıralama ve kabul/ret aksiyonları kaldırıldı (liste gizli)

  const handleWithdrawOffer = async (offerId: string) => {
    if (!authUser) {
      setIsAuthModalOpen(true);
      return;
    }
    
    const confirmWithdraw = window.confirm('Bu teklifi geri çekmek istediğinize emin misiniz?');
    if (!confirmWithdraw) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }

      const response = await fetch(`http://localhost:8787/api/offers/${offerId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'withdrawn'
        })
      });

      if (response.ok) {
        toast.success('Teklifiniz başarıyla geri çekildi');
        await loadListingAndOffers();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Teklif geri çekilemedi');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Teklif geri çekilemedi';
      toast.error(msg);
    }
  };

  // Teklif aksiyonları (ilan sahibi için kabul/ret) ve teklife mesaj
  const handleAcceptOffer = (offerId: string) => {
    if (!authUser || !listing) {
      setIsAuthModalOpen(true);
      return;
    }
    const owner = authUser.id?.toString() === listing.buyerId?.toString();
    if (!owner) return;
    const ok = window.confirm('Bu teklifi kabul etmek istediğinize emin misiniz?');
    if (!ok) return;
    try {
      // Kabul işlemini ödeme sonrası yapacağız
      navigate(`/checkout?offerId=${offerId}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'İşlem başarısız';
      toast.error(msg);
    }
  };

  const handleRejectOffer = (offerId: string) => {
    if (!authUser || !listing) {
      setIsAuthModalOpen(true);
      return;
    }
    const owner = authUser.id?.toString() === listing.buyerId?.toString();
    if (!owner) return;
    const ok = window.confirm('Bu teklifi reddetmek istediğinize emin misiniz?');
    if (!ok) return;
    try {
      // TODO: MySQL API ile reject işlemi eklenecek
      // DataManager.rejectOffer(offerId);
      toast.success('Teklif reddedildi');
      loadListingAndOffers();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'İşlem başarısız';
      toast.error(msg);
    }
  };



  const handleOfferCreated = () => {
    loadListingAndOffers();
  };

  const handleAuthSuccess = () => {
    // Auth success handled by useAuth hook automatically
    setIsAuthModalOpen(false);
  };

  const handleCreateOffer = () => {
    if (!authUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsOfferModalOpen(true);
  };

  const handleLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleMessageOwner = () => {
    if (!authUser) {
      setIsAuthModalOpen(true);
      return;
    }
    // Message functionality removed
  };

  const handlePurchaseOffer = (offerId: string) => {
    if (!authUser || !listing) {
      setIsAuthModalOpen(true);
      return;
    }
    if (authUser.id?.toString() === listing.buyerId?.toString()) {
      toast.error('İlan sahibi bu akışı kullanamaz');
      return;
    }
    // Satın alma akışını ödeme sayfasına taşıyoruz
    navigate(`/checkout?offerId=${offerId}`);
  };

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p>İlan yükleniyor...</p>
        </div>
      </div>
    );
  }

  // MySQL auth kullanıcısını effective user olarak kullan
  const effectiveUserId = authUser?.id?.toString();
  
  // Owner detection için MySQL auth user ID kullan - string olarak karşılaştır
  const isOwner = !!effectiveUserId && !!listing.buyerId && 
    effectiveUserId.toString() === listing.buyerId.toString();
  const alreadyOffered = !!effectiveUserId && offers.some(o => o.sellerId === effectiveUserId && o.status !== 'withdrawn');
  const myOfferId = effectiveUserId ? offers.find(o => o.sellerId === effectiveUserId)?.id : undefined;
  const canMakeOffer = !!effectiveUserId && !isOwner && listing.status === 'active' && !alreadyOffered;

  // DEBUG: MySQL auth ownership kontrolü
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Ownership Check:', {
      currentUser: authUser?.email,
      listingOwner: listing.buyerName,
      isOwner
    });
  }
  
  // Ownership check working correctly! 
  // awasdz95@gmail.com != meteyanar - Different users = Can make offer ✅
  // Tüm ilanlarda teklifler herkese açık olacak şekilde görünür
  const canShowOffers = true;

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
      <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />

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
                        userId={authUser?.id?.toString()}
                        size="sm"
                        variant="ghost"
                      />
                    </div>
                    {/* Kategori bilgisi */}
                    <div className="mb-3">
                      <Badge variant="secondary" className="text-sm">
                        {listing.category || 'Genel'}
                      </Badge>
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
                      {/* Teklif sayısı sadece İlan İstatistikleri kartında gösterilir */}
                      {listing.exactProductOnly && (
                        <Badge className="bg-orange-100 text-orange-800">Aynı Ürün Zorunlu</Badge>
                      )}
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
                    <div className="relative space-y-3">
                      <div className="w-full overflow-hidden rounded-md bg-muted aspect-[4/3] md:aspect-[16/9]">
                        <ImageMagnifier src={getImageUrl(listing.images[activeImage])} alt={`${listing.title} görsel ${activeImage + 1}`} className="w-full h-full" zoom={2.25} zoomPaneSize={380} />
                      </div>
                      {listing.images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto py-1">
                          {listing.images.map((src, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveImage(idx)}
                              className={`shrink-0 rounded border overflow-hidden ${idx === activeImage ? 'ring-2 ring-primary' : 'border-transparent'} bg-muted`}
                              aria-label={`Görsel ${idx + 1}`}
                            >
                              <div className="w-16 h-16 md:w-20 md:h-20">
                                <img src={getImageUrl(src)} alt="Küçük görsel" className="w-full h-full object-cover" loading="lazy" decoding="async" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(() => {
                    const fullDesc = listing.description || '';
                    const MAX_DESC = descMax;
                    const isLong = fullDesc.length > MAX_DESC;
                    const shown = !isLong || descExpanded ? fullDesc : truncateAtWord(fullDesc, MAX_DESC);
                    return (
                      <div className="text-gray-700 leading-relaxed">
                        {shown}
                        {isLong && (
                          <button
                            type="button"
                            aria-expanded={descExpanded}
                            className="ml-2 text-primary hover:underline font-medium text-sm"
                            onClick={() => setDescExpanded(v => !v)}
                          >
                            {descExpanded ? 'Daha az göster' : 'Daha fazla göster'}
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{listing.category}</Badge>
                    <Badge variant="outline">{getConditionText(listing.condition)}</Badge>
                    <Badge variant="outline">
                      <Package className="h-3 w-3 mr-1" />
                      {getDeliveryText(listing.deliveryType)}
                    </Badge>
                    {listing.exactProductOnly && (
                      <Badge className="bg-orange-100 text-orange-800">Aynı Ürün Zorunlu</Badge>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Maksimum Bütçe</p>
                      <p className="font-semibold text-lg text-green-600">
                        {DataManager.formatPrice(listing.budgetMax)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Son Başvuru</p>
                      <p className="font-semibold">
                        {listing.expiresAt ? DataManager.formatDate(listing.expiresAt) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">İlan Sahibi</p>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{listing.maskOwnerName ? maskDisplayName(listing.buyerName) : listing.buyerName}</p>
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
                    {/* Teklif görünürlüğü her zaman açık olduğundan ayrı gösterim kaldırıldı */}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gelen Teklifler - tüm kullanıcılara görünür */}
            {canShowOffers && (
              <Card>
                <CardHeader>
                  <CardTitle>Gelen Teklifler</CardTitle>
                </CardHeader>
                <CardContent>
                  {offers.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Henüz teklif yok</h3>
                      <p className="text-muted-foreground mb-0">Bu ilana henüz teklif verilmemiş.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Filtre & Sıralama Paneli */}
                      <div className="p-4 border rounded-md bg-muted/30 space-y-3">
                        <div className="flex flex-wrap gap-3">
                          <div className="w-40">
                            <label className="block text-xs font-medium mb-1">Sırala</label>
                            <Select value={sortBy} onValueChange={(v: 'price' | 'date') => setSortBy(v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="price">Fiyat</SelectItem>
                                <SelectItem value="date">Tarih</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-32">
                            <label className="block text-xs font-medium mb-1">Yön</label>
                            <Select value={sortDir} onValueChange={(v: 'asc' | 'desc') => setSortDir(v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="asc">Artan</SelectItem>
                                <SelectItem value="desc">Azalan</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-40">
                            <label className="block text-xs font-medium mb-1">Teslimat</label>
                            <Select value={filterDelivery} onValueChange={(v: 'all' | 'shipping' | 'pickup') => setFilterDelivery(v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Hepsi</SelectItem>
                                <SelectItem value="shipping">Kargo</SelectItem>
                                <SelectItem value="pickup">Elden</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-40">
                            <label className="block text-xs font-medium mb-1">Durum</label>
                            <Select value={filterCondition} onValueChange={(v: 'all' | 'new' | 'used') => setFilterCondition(v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Hepsi</SelectItem>
                                <SelectItem value="new">Sıfır</SelectItem>
                                <SelectItem value="used">2. El</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-40">
                            <label className="block text-xs font-medium mb-1">Teklif Durumu</label>
                            <Select value={filterStatus} onValueChange={(v: 'all' | 'active' | 'accepted' | 'rejected' | 'withdrawn') => setFilterStatus(v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Hepsi</SelectItem>
                                <SelectItem value="active">Bekliyor</SelectItem>
                                <SelectItem value="accepted">Kabul</SelectItem>
                                <SelectItem value="rejected">Red</SelectItem>
                                <SelectItem value="withdrawn">Geri Çekildi</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Min/Max Fiyat filtreleri kaldırıldı */}
                          <div className="flex items-end">
                            <Button variant="outline" className="h-8 text-xs" onClick={() => { setFilterDelivery('all'); setFilterCondition('all'); setFilterStatus('all'); setSortBy('price'); setSortDir('asc'); }}>Sıfırla</Button>
                          </div>
                        </div>
                        <div className="flex justify-end text-[11px] text-muted-foreground">{displayedOffers.length} / {offers.length} teklif gösteriliyor</div>
                      </div>
                      {displayedOffers.map((offer) => (
                        <OfferCard
                          key={offer.id}
                          offer={offer}
                          currentUserId={effectiveUserId}
                          listingOwnerId={listing.buyerId}
                          currentUserEmail={authUser?.email}
                          showActions={isOwner}
                          onAccept={isOwner ? handleAcceptOffer : undefined}
                          onReject={isOwner ? handleRejectOffer : undefined}
                          onWithdraw={offer.sellerId === effectiveUserId ? handleWithdrawOffer : undefined}
                          onPurchase={
                            !isOwner &&
                              listing.offersPurchasable &&
                              offer.sellerId !== effectiveUserId
                              ? handlePurchaseOffer
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Teklifler tüm kullanıcılara açık: sadece gizli olduğunda kendi teklifim bölümü kaldırıldı */}
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
                  (() => {
                    const hasAccepted = offers.some(o => o.status === 'accepted');
                    return (
                      <div className="text-center py-4 space-y-3">
                        {hasAccepted ? (
                          <>
                            <p className="text-sm text-green-700 font-medium">Aradığın ürünü buldun: Tekliflerden birini kabul ettin.</p>
                            <p className="text-xs text-muted-foreground">İlan, son gününde otomatik silinecek. Bu süreçte yeterli adedi olan teklifler diğer kullanıcılar tarafından değerlendirilebilir.</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Button variant="outline" onClick={handleEditListing}>Düzenle</Button>
                              <Button variant="destructive" disabled title="Kabul edilen teklif olduğu için silinemez">
                                <Trash2 className="h-4 w-4 mr-1" /> Sil
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">Bu sizin ilanınız</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Button variant="outline" onClick={handleEditListing}>Düzenle</Button>
                              <Button variant="destructive" onClick={handleDeleteListing}>
                                <Trash2 className="h-4 w-4 mr-1" /> Sil
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()
                ) : alreadyOffered ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">Bu ilana zaten bir teklif verdiniz</p>
                    <p className="text-xs text-muted-foreground">Tek ilan başına en fazla 1 teklif hakkınız var</p>
                  </div>
                ) : !authUser ? (
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

                {/* İlan sahibi kendine mesaj atamasın */}
                {!isOwner && (
                  <Button variant="outline" className="w-full" onClick={handleMessageOwner}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    İlan Sahibine Mesaj
                  </Button>
                )}

                {authUser && (
                  <FavoriteButton
                    listingId={listing.id}
                    userId={authUser.id?.toString()}
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
                {/** Kalan süreyi hesaplamak için basit yardımcı */}
                {(() => {
                  function getRemainingTimeText(expiresAt?: string): string {
                    if (!expiresAt) return '-';
                    const now = new Date();
                    const end = new Date(expiresAt);
                    const diffMs = end.getTime() - now.getTime();
                    if (isNaN(end.getTime())) return '-';
                    if (diffMs <= 0) return 'Süresi doldu';
                    const totalMinutes = Math.floor(diffMs / 60000);
                    const days = Math.floor(totalMinutes / (60 * 24));
                    const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
                    const minutes = totalMinutes % 60;
                    if (days > 0) return `${days} gün ${hours} saat`;
                    if (hours > 0) return `${hours} saat ${minutes} dk`;
                    return `${minutes} dk`;
                  }
                  // Değeri dışarıdaki scope'a vermek için component scope'ta saklayalım
                  // Ancak burada IIFE içinde direkt kullanacağız.
                  return null;
                })()}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Toplam Teklif</span>
                  <span className="font-semibold">{displayedOffers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">En Düşük Teklif</span>
                  <span className="font-semibold text-green-600">
                    {displayedOffers.length > 0
                      ? DataManager.formatPrice(Math.min(...displayedOffers.map(o => o.price)))
                      : '-'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ortalama Teklif</span>
                  <span className="font-semibold">
                    {displayedOffers.length > 0
                      ? DataManager.formatPrice(displayedOffers.reduce((sum, o) => sum + o.price, 0) / displayedOffers.length)
                      : '-'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Kalan Süre</span>
                  <span className="font-semibold">
                    {(() => {
                      function getRemainingTimeText(expiresAt?: string): string {
                        if (!expiresAt) return '-';
                        const now = new Date();
                        const end = new Date(expiresAt);
                        const diffMs = end.getTime() - now.getTime();
                        if (isNaN(end.getTime())) return '-';
                        if (diffMs <= 0) return 'Süresi doldu';
                        const totalMinutes = Math.floor(diffMs / 60000);
                        const days = Math.floor(totalMinutes / (60 * 24));
                        const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
                        const minutes = totalMinutes % 60;
                        if (days > 0) return `${days} gün ${hours} saat`;
                        if (hours > 0) return `${hours} saat ${minutes} dk`;
                        return `${minutes} dk`;
                      }
                      return getRemainingTimeText(listing.expiresAt);
                    })()}
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



      {/* Review Modal kaldırıldı */}
      
      {/* Create Listing Modal */}
      <CreateListingModal
        open={isCreateListingModalOpen}
        onOpenChange={setIsCreateListingModalOpen}
      />
    </div>
  );
}

function truncateAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  const lastSpace = slice.lastIndexOf(' ');
  const safe = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return safe.replace(/[\s,.!?:;-]+$/, '') + '…';
}
