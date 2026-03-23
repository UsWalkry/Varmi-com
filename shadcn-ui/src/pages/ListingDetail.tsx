import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Clock, Package, Plus, Star, MessageCircle, Heart, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
import ListingCommentsModal from '@/components/ListingCommentsModal';
import SellerReviewsModal from '@/components/SellerReviewsModal';
import { useAuth } from '@/hooks/use-auth-mysql';
import { toast } from 'sonner';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ImageMagnifier from '@/components/ImageMagnifier';
import { TrendingUp } from 'lucide-react';
import { SchemaOrg } from '@/components/SchemaOrg';

// AlsoViewedCard component with alternating budget/offer count
function AlsoViewedCard({ item }: { item: any }) {
  const navigate = useNavigate();
  const [showBudget, setShowBudget] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowBudget(prev => !prev);
    }, 3000); // Her 3 saniyede bir değiştir
    
    return () => clearInterval(interval);
  }, []);

  const budget = item.budgetMax || item.budget_max;
  const budgetNum = parseFloat(budget || 0);
  const offerCount = item.offerCount || item.offer_count || 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(`/listing/${item.id}`);
  };

  return (
    <Link
      to={`/listing/${item.id}`}
      onClick={handleClick}
      className="flex-shrink-0 w-64 snap-start group"
    >
      <div className="rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all duration-300 overflow-hidden bg-white">
        {/* Image */}
        <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
          {item.images && item.images.length > 0 ? (
            <img
              src={getImageUrl(item.images[0])}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Package className="h-12 w-12" />
            </div>
          )}
          {/* Category Badge */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs bg-white/90 backdrop-blur-sm">
              {item.category}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-purple-600 transition-colors min-h-[40px]">
            {item.title}
          </h3>
          
          {/* City */}
          {item.city && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className="h-3 w-3" />
              {item.city}
            </div>
          )}

          {/* Alternating Budget / Offer Count */}
          <div className="transition-opacity duration-300">
            {showBudget ? (
              budgetNum > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Bütçe:</span>
                  <span className="text-base font-bold text-green-600">
                    ₺{budgetNum.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Teklif:</span>
                <div className="flex items-center text-base font-bold text-blue-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>{offerCount} teklif</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

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
  const [listingSchema, setListingSchema] = useState<any>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [alsoViewedListings, setAlsoViewedListings] = useState<Listing[]>([]);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [initialThreadId, setInitialThreadId] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(0);
  const [previewComments, setPreviewComments] = useState<any[]>([]);
  // Filtre & sıralama durumları
  const [sortBy, setSortBy] = useState<'price' | 'date'>('price');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterDelivery, setFilterDelivery] = useState<'all' | 'shipping' | 'pickup'>('all');
  const [filterCondition, setFilterCondition] = useState<'all' | 'new' | 'used'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'accepted' | 'rejected' | 'withdrawn'>('all');
  const [activeImage, setActiveImage] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [isCreateListingModalOpen, setIsCreateListingModalOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState({ x: 50, y: 50 }); // Zoom origin point
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [offerLightboxOpen, setOfferLightboxOpen] = useState(false);
  const [offerLightboxImages, setOfferLightboxImages] = useState<string[]>([]);
  const [offerLightboxIndex, setOfferLightboxIndex] = useState(0);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
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

  // Carousel ref for "Bunu Alanlar Bunları da Aldı"
  const carouselRef = useRef<HTMLDivElement>(null);

  // Carousel scroll handlers
  const scrollCarousel = useCallback((direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, []);

  // Swipe handlers for carousel
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => scrollCarousel('right'),
    onSwipedRight: () => scrollCarousel('left'),
    trackMouse: true,
    trackTouch: true,
  });

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys when not in an input
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollCarousel('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollCarousel('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollCarousel]);

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

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen || !listing?.images) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setActiveImage(prev => prev === 0 ? listing.images.length - 1 : prev - 1);
      } else if (e.key === 'ArrowRight') {
        setActiveImage(prev => prev === listing.images.length - 1 ? 0 : prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, listing]);

  // Keyboard navigation for offer lightbox
  useEffect(() => {
    if (!offerLightboxOpen || offerLightboxImages.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOfferLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setOfferLightboxIndex(prev => prev === 0 ? offerLightboxImages.length - 1 : prev - 1);
      } else if (e.key === 'ArrowRight') {
        setOfferLightboxIndex(prev => prev === offerLightboxImages.length - 1 ? 0 : prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [offerLightboxOpen, offerLightboxImages]);

  const mapOfferFromApi = useCallback((apiOffer: any): Offer => {
    const quantityRaw = apiOffer.quantity ?? apiOffer.offer_quantity;
    const quantity = typeof quantityRaw === 'number' ? quantityRaw : parseInt(String(quantityRaw), 10) || 1;
    const soldQuantityRaw = apiOffer.sold_quantity ?? apiOffer.soldQuantity;
    const soldQuantity = typeof soldQuantityRaw === 'number' ? soldQuantityRaw : parseInt(String(soldQuantityRaw), 10) || 0;
    const soldToOthersRaw = apiOffer.sold_to_others ?? apiOffer.soldToOthers;
    const soldToOthers = typeof soldToOthersRaw === 'number' ? soldToOthersRaw : parseInt(String(soldToOthersRaw), 10) || 0;
    const totalSold = Math.max(soldQuantity, soldToOthers);
    const baseStatus = typeof apiOffer.status === 'string' ? apiOffer.status.toLowerCase() : 'active';
    const terminalStatus: Offer['status'] = baseStatus === 'accepted' || baseStatus === 'rejected' || baseStatus === 'withdrawn'
      ? baseStatus
      : totalSold >= quantity
        ? 'accepted'
        : 'active';

    const priceRaw = apiOffer.price ?? apiOffer.offer_price;
    const price = typeof priceRaw === 'number' ? priceRaw : parseFloat(String(priceRaw)) || 0;
    const shippingCostRaw = apiOffer.shipping_cost ?? apiOffer.shippingCost;
    const shippingCost = typeof shippingCostRaw === 'number' ? shippingCostRaw : parseFloat(String(shippingCostRaw)) || 0;
    const etaDaysRaw = apiOffer.eta_days ?? apiOffer.etaDays;
    const etaDays = typeof etaDaysRaw === 'number' ? etaDaysRaw : parseInt(String(etaDaysRaw), 10) || 3;

    let images: string[] = [];
    if (Array.isArray(apiOffer.images)) {
      images = apiOffer.images;
    } else if (typeof apiOffer.images === 'string' && apiOffer.images.length > 0) {
      try {
        const parsed = JSON.parse(apiOffer.images);
        images = Array.isArray(parsed) ? parsed : [];
      } catch {
        images = [];
      }
    }

    return {
      id: String(apiOffer.id ?? ''),
      listingId: String(apiOffer.listing_id ?? apiOffer.listingId ?? ''),
      sellerId: String(apiOffer.seller_id ?? apiOffer.sellerId ?? ''),
      sellerName: apiOffer.is_verified_seller && apiOffer.store_name 
        ? apiOffer.store_name 
        : (maskDisplayName(apiOffer.seller_name) || 'Anonim'),
      isVerifiedSeller: apiOffer.is_verified_seller || false,
      storeName: apiOffer.store_name || undefined,
      // Rating ve değerlendirme sayısı backend'den geliyorsa göster, yoksa 0 olarak set et
      sellerRating: typeof apiOffer.seller_rating !== 'undefined' ? Number(apiOffer.seller_rating) : 0,
      sellerRatingCount: typeof apiOffer.seller_rating_count !== 'undefined'
        ? Number(apiOffer.seller_rating_count)
        : (typeof apiOffer.sellerRatingCount !== 'undefined' ? Number(apiOffer.sellerRatingCount) : 0),
      sellerEmailVerified: apiOffer.seller_email_verified || apiOffer.sellerEmailVerified || false,
      price,
      quantity,
      condition: apiOffer.offer_condition || apiOffer.condition || 'used',
      productName: apiOffer.product_name || '',
      description: apiOffer.description || '',
      deliveryType: apiOffer.delivery_type || apiOffer.offer_delivery_type || 'shipping',
      shippingDesi: apiOffer.shipping_desi || '',
  shippingCost,
  etaDays,
      status: terminalStatus,
      validUntil: apiOffer.valid_until || '',
      createdAt: apiOffer.created_at,
      images,
      soldToOthers: totalSold,
      message: apiOffer.message
    };
  }, []);



  const loadListingAndOffers = useCallback(async () => {
    if (!id) return;
    const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    try {
      // MySQL API kullan
      console.log('🔍 Loading listing:', id);
      const response = await mysqlAPI.getListing(id);
      console.log('📥 Listing response:', response);
      
      if (!response.success || !response.listing) {
        toast.error('İlan bulunamadı');
        navigate('/');
        return;
      }
      
      const l = response.listing;

      // Set schema.org structured data from backend
      if (response.schema) {
        setListingSchema([response.schema.product, response.schema.breadcrumb]);
      }

      // Debug: Backend response kontrolü
      console.log('🔍 Backend Listing Data:', {
        buyerId: l.buyerId,
        sellerId: l.seller?.id,
        sellerFirstName: l.seller?.firstName
      });

      // map to Listing type expected by UI
      const mapped: Listing = {
        id: l.id,
        title: l.title,
        description: l.description || '',
        budgetMax: l.price || 0,
        category: l.category || 'genel', // Backend'den gelen kategori
        city: l.location || '',
        condition: l.condition || 'any',
        deliveryType: l.deliveryType || l.delivery_type || 'both', // Backend'den gelen değer
        buyerId: l.buyerId || l.seller?.id?.toString() || '',
        buyerName: maskDisplayName(`${l.seller?.firstName || ''} ${l.seller?.lastName || ''}`.trim()) || 'Anonim',
        status: 'active',
        createdAt: l.createdAt || '',
        offerCount: 0,
        favoriteCount: l.favoriteCount || 0, // Favori sayısı
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
      console.log('🔍 Mapped listing set:', { mappedId: mapped.id, originalId: l.id });
      
      // Load offers for this listing
      try {
        console.log('🔍 Loading offers for listing:', id);
        const offersResponse = await mysqlAPI.getOffersByListing(id);
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
          
          const mappedOffers: Offer[] = offersResponse.offers.map(mapOfferFromApi);

          setOffers(mappedOffers);
          console.log('✅ Loaded', mappedOffers.length, 'offers');
        } else {
          console.log('❌ Offers response check failed:', {
            success: offersResponse.success,
            hasOffers: !!offersResponse.offers,
            offersLength: offersResponse.offers ? offersResponse.offers.length : 'N/A',
            fullResponse: offersResponse
          });
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
  }, [id, navigate, mapOfferFromApi]);

  useEffect(() => {
    console.log('🔍 useEffect triggered with id:', id);
    if (id) {
      console.log('🔍 Calling loadListingAndOffers for:', id);
      // Scroll to top when ID changes
      window.scrollTo(0, 0);
      // Reset state for new listing
      setListing(null);
      setOffers([]);
      setSimilarListings([]);
      setAlsoViewedListings([]);
      setActiveImage(0);
      setDescExpanded(false);
      // Load new listing data
      loadListingAndOffers();
      loadCommentCount();
      loadPreviewComments();
    } else {
      console.log('❌ No ID found, not loading');
    }
  }, [id, loadListingAndOffers]);

  // Load comment count
  const loadCommentCount = async () => {
    if (!id) return;
    try {
      const response = await mysqlAPI.getListingCommentCount(id);
      if (response.success) {
        setCommentCount(response.count || 0);
      }
    } catch (error) {
      console.error('Error loading comment count:', error);
    }
  };

  const loadPreviewComments = async () => {
    if (!id) return;
    try {
      const response = await mysqlAPI.getListingComments(id);
      if (response.success && response.comments) {
        // Store root comments with their full reply tree
        setPreviewComments(response.comments);
      }
    } catch (error) {
      console.error('Error loading preview comments:', error);
    }
  };

  // Auth state değişikliklerini dinle
  useEffect(() => {
    if (authUser && isAuthModalOpen) {
      setIsAuthModalOpen(false);
    }
  }, [authUser, isAuthModalOpen]);

  // Periyodik olarak offers'ı yenile (30 saniyede bir)
  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      try {
        console.log('🔄 Refreshing offers data...');
        const offersResponse = await mysqlAPI.getOffersByListing(id);
        if (offersResponse.success && offersResponse.offers) {
          const mappedOffers: Offer[] = offersResponse.offers.map(mapOfferFromApi);
          setOffers(mappedOffers);
          console.log('✅ Offers refreshed with updated stock data');
        }
      } catch (error) {
        console.error('Error refreshing offers:', error);
      }
    }, 30000); // 30 saniyede bir yenile

    return () => clearInterval(interval);
  }, [id, mapOfferFromApi]);

  // Window focus olduğunda (checkout'dan döndüğünde) offers'ı yenile
  useEffect(() => {
    const handleWindowFocus = async () => {
      if (id && document.visibilityState === 'visible') {
        console.log('🔄 Window focused, refreshing offers...');
        try {
          const offersResponse = await mysqlAPI.getOffersByListing(id);
          if (offersResponse.success && offersResponse.offers) {
            const mappedOffers: Offer[] = offersResponse.offers.map(mapOfferFromApi);
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
  }, [id, mapOfferFromApi]);

  // Benzer ilanları yükle
  useEffect(() => {
    const loadSimilarListings = async () => {
      if (!listing) return;
      
      try {
        // Aktif ilanları getir
        const response = await mysqlAPI.getActiveListings();

        if (response.success && response.listings) {
          // Aynı kategorideki, farklı kullanıcının ilanlarını filtrele
          const filtered = response.listings
            .filter((l: any) => 
              l.id !== listing.id && // Mevcut ilan değil
              l.category === listing.category && // Aynı kategori
              l.buyer_id !== listing.buyerId // Farklı kullanıcı
            )
            .slice(0, 8); // Maksimum 8 ilan

          setSimilarListings(filtered);
        }
      } catch (error) {
        console.error('Error loading similar listings:', error);
      }
    };

    loadSimilarListings();
  }, [listing]);

  // "Bunu Alanlar Bunları da Aldı" ilanlarını yükle
  useEffect(() => {
    const loadAlsoViewedListings = async () => {
      if (!listing) return;
      
      try {
        // Tüm aktif ilanları getir
        const response = await mysqlAPI.getActiveListings();

        if (response.success && response.listings) {
          // Mevcut ilan dışındaki tüm ilanları al
          const filtered = response.listings
            .filter((l: any) => l.id !== listing.id)
            .slice(0, 12); // Maksimum 12 ilan

          setAlsoViewedListings(filtered);
        }
      } catch (error) {
        console.error('Error loading also viewed listings:', error);
      }
    };

    loadAlsoViewedListings();
  }, [listing]);



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
  const token = localStorage.getItem('mysql-auth-token');
      if (!token) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }

      const response = await fetch(`/api/offers/${offerId}/status`, {
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

  const handleCreateOffer = async () => {
    if (!authUser) {
      setIsAuthModalOpen(true);
      return;
    }
    
    // 'any' (farketmez) ilanlarında satıcı profili kontrolü yapma - herkes teklif verebilir
    const isZeroListing = listing?.condition === 'any';
    
    if (!isZeroListing) {
      // Satıcı profili kontrolü - Normal ilanlar için ZORUNLU
      try {
        const sellerCheck = await mysqlAPI.canMakeOffer();
        console.log('Seller profile check:', sellerCheck);
        
        if (!sellerCheck.success || !sellerCheck.canMakeOffer) {
          toast.error(
            sellerCheck.message || 'Teklif verebilmek için satıcı profilinizi oluşturup onay almanız gerekmektedir',
            {
              action: {
                label: 'Profil Oluştur',
                onClick: () => {
                  navigate('/profile');
                }
              },
              duration: 10000
            }
          );
          return;
        }
      } catch (error) {
        console.error('Error checking seller profile:', error);
        toast.error('Satıcı profili kontrolü yapılamadı. Lütfen tekrar deneyin.');
        return;
      }
    } else {
      console.log('🎯 Any (farketmez) listing - seller profile check bypassed');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
      currentUserId: effectiveUserId,
      listingBuyerId: listing.buyerId,
      isOwner,
      comparison: `${effectiveUserId} === ${listing.buyerId}`
    });
  }
  
  // Ownership check working correctly! 
  // awasdz95@gmail.com != meteyanar - Different users = Can make offer ✅
  // Tüm ilanlarda teklifler herkese açık olacak şekilde görünür
  const canShowOffers = true;

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'new': return 'Sıfır';
      case 'like_new': return 'Sıfır Gibi';
      case 'like-new': return 'Sıfır Gibi';
      case 'used': return '2. El';
      case 'good': return 'İyi';
      case 'fair': return 'Orta';
      case 'poor': return 'Kötü';
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
      
      {/* Schema.org structured data */}
      {listingSchema && <SchemaOrg schema={listingSchema} />}

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
                        isOwnListing={isOwner}
                      />
                    </div>
                    {/* Kategori bilgisi */}
                    <div className="mb-3">
                      <Badge variant="secondary" className="text-sm">
                        {listing.category || 'Genel'}
                      </Badge>
                    </div>
                    {/* İlan Sahibi */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-muted-foreground">İlan Sahibi:</span>
                      {listing.buyerId ? (
                        <Link 
                          to={`/profile/${listing.buyerId}`}
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {maskDisplayName(listing.buyerName)}
                        </Link>
                      ) : (
                        <span className="font-semibold">{maskDisplayName(listing.buyerName)}</span>
                      )}
                      {(() => {
                        const reviewCount = DataManager.getUserReviewCount(listing.buyerId);
                        const averageRating = DataManager.getUserAverageRating(listing.buyerId);
                        if (reviewCount > 0) {
                          return (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-semibold">{averageRating.toFixed(1)}</span>
                              <span className="text-xs text-gray-400">({reviewCount})</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      {/* Şehir sadece kargo değilse göster */}
                      {listing.deliveryType !== 'shipping' && listing.city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{listing.city}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{DataManager.getTimeAgo(listing.createdAt)}</span>
                      </div>
                      {/* Teklif sayısı sadece İlan İstatistikleri kartında gösterilir */}
                      {listing.exactProductOnly && (
                        <Badge className="bg-blue-100 text-blue-800">Aynı Ürün Zorunlu</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Images/Gallery */}
                  {listing.images && listing.images.length > 0 && (
                    <div className="relative space-y-3">
                      <div 
                        className="relative w-full overflow-hidden rounded-md aspect-[4/3] md:aspect-[16/9] group cursor-zoom-in"
                        onMouseEnter={() => setIsImageHovered(true)}
                        onMouseLeave={() => setIsImageHovered(false)}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - rect.left) / rect.width) * 100;
                          const y = ((e.clientY - rect.top) / rect.height) * 100;
                          setImageZoom({ x, y });
                        }}
                      >
                        {/* Blurred Background */}
                        <div 
                          className="absolute inset-0 bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${getImageUrl(listing.images[activeImage])})`,
                            filter: 'blur(20px)',
                            transform: 'scale(1.1)',
                          }}
                        />
                        
                        {/* Main Image */}
                        <img 
                          src={getImageUrl(listing.images[activeImage])} 
                          alt={`${listing.title} görsel ${activeImage + 1}`} 
                          className="relative w-full h-full object-contain transition-transform duration-200 ease-out z-10 cursor-pointer" 
                          style={{
                            transform: isImageHovered ? 'scale(2)' : 'scale(1)',
                            transformOrigin: `${imageZoom.x}% ${imageZoom.y}%`
                          }}
                          loading="lazy"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                          onClick={() => setIsLightboxOpen(true)}
                        />
                        
                        {/* Navigation Arrows - Only show if multiple images */}
                        {listing.images.length > 1 && (
                          <>
                            {/* Left Arrow */}
                            <button
                              type="button"
                              onClick={() => setActiveImage(prev => prev === 0 ? listing.images.length - 1 : prev - 1)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                              aria-label="Önceki resim"
                            >
                              <ChevronLeft className="h-6 w-6 text-gray-800" />
                            </button>
                            
                            {/* Right Arrow */}
                            <button
                              type="button"
                              onClick={() => setActiveImage(prev => prev === listing.images.length - 1 ? 0 : prev + 1)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                              aria-label="Sonraki resim"
                            >
                              <ChevronRight className="h-6 w-6 text-gray-800" />
                            </button>
                            
                            {/* Image Counter */}
                            <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {activeImage + 1} / {listing.images.length}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Thumbnail Gallery */}
                      {listing.images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          {listing.images.map((src, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveImage(idx)}
                              className={`shrink-0 rounded-lg border-2 overflow-hidden transition-all duration-200 ${
                                idx === activeImage 
                                  ? 'ring-2 ring-primary ring-offset-2 border-primary scale-105' 
                                  : 'border-gray-200 hover:border-primary/50 hover:scale-105'
                              } bg-muted`}
                              aria-label={`Görsel ${idx + 1}`}
                            >
                              <div className="w-16 h-16 md:w-20 md:h-20">
                                <img 
                                  src={getImageUrl(src)} 
                                  alt={`Küçük görsel ${idx + 1}`} 
                                  className="w-full h-full object-cover" 
                                  loading="lazy" 
                                  decoding="async" 
                                  onContextMenu={(e) => e.preventDefault()} 
                                  draggable={false} 
                                />
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
                    <Badge variant="outline">
                      <Package className="h-3 w-3 mr-1" />
                      {getDeliveryText(listing.deliveryType)}
                    </Badge>
                    {listing.exactProductOnly && (
                      <Badge className="bg-blue-100 text-blue-800">Aynı Ürün Zorunlu</Badge>
                    )}
                  </div>

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
                        {listing.buyerId ? (
                          <Link 
                            to={`/profile/${listing.buyerId}`}
                            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {maskDisplayName(listing.buyerName)}
                          </Link>
                        ) : (
                          <span className="font-semibold">{maskDisplayName(listing.buyerName)}</span>
                        )}
                        {listing.buyerId && (() => {
                          const reviewCount = DataManager.getUserReviewCount(listing.buyerId);
                          const averageRating = DataManager.getUserAverageRating(listing.buyerId);
                          // Test için: her zaman göster
                          return (
                            <button
                              type="button"
                              onClick={() => setIsReviewsModalOpen(true)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md border border-transparent hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                            >
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-semibold">{reviewCount > 0 ? averageRating.toFixed(1) : '0.0'}</span>
                              <span className="text-xs text-gray-500">({reviewCount})</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                    {/* Teklif görünürlüğü her zaman açık olduğundan ayrı gösterim kaldırıldı */}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4">
                    {canMakeOffer ? (
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-700"
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
                          <div className="space-y-2">
                            {hasAccepted ? (
                              <>
                                <p className="text-sm text-green-700 font-medium text-center">Aradığın ürünü buldun: Tekliflerden birini kabul ettin.</p>
                                <p className="text-xs text-muted-foreground text-center">İlan, son gününde otomatik silinecek. Bu süreçte yeterli adedi olan teklifler diğer kullanıcılar tarafından değerlendirilebilir.</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={handleEditListing}
                                    disabled
                                    title="Kabul edilen teklif olduğu için düzenlenemez"
                                  >
                                    Düzenle
                                  </Button>
                                  <Button variant="destructive" disabled title="Kabul edilen teklif olduğu için silinemez">
                                    <Trash2 className="h-4 w-4 mr-1" /> Sil
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" onClick={handleEditListing}>Düzenle</Button>
                                <Button variant="destructive" onClick={handleDeleteListing}>
                                  <Trash2 className="h-4 w-4 mr-1" /> Sil
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : alreadyOffered ? (
                      <Button variant="outline" className="w-full" disabled>
                        Bu ilana zaten teklif verdiniz
                      </Button>
                    ) : !authUser ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground text-center">Teklif vermek için giriş yapın</p>
                        <Button variant="outline" className="w-full" onClick={handleLogin}>
                          Giriş Yap
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        İlan kapalı
                      </Button>
                    )}

                    {authUser && (
                      <FavoriteButton
                        listingId={listing.id}
                        userId={authUser.id?.toString()}
                        variant="outline"
                        showText={true}
                        className="w-full mt-2"
                        isOwnListing={isOwner}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Yorumlar ve Sorular */}
            {listing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Yorumlar ve Sorular</span>
                    {commentCount > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        ({commentCount})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preview Comments - Only Root Comments */}
                  {previewComments.length > 0 && (
                    <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
                      {previewComments
                        .slice(0, 4)
                        .map((comment) => {
                          // Count all nested replies recursively
                          const countReplies = (c: any): number => {
                            let count = 0;
                            if (c.replies && c.replies.length > 0) {
                              count += c.replies.length;
                              c.replies.forEach((reply: any) => {
                                count += countReplies(reply);
                              });
                            }
                            return count;
                          };
                          const replyCount = countReplies(comment);
                          
                          // TODO: Get real user rating - for now show 5 stars
                          const rating = 5;
                          const ratingCount = 0; // TODO: Get real rating count
                          
                          return (
                            <button
                              key={comment.id}
                              onClick={() => {
                                console.log('🎯 Preview card clicked, thread ID:', comment.id);
                                setInitialThreadId(comment.id);
                                setIsCommentsModalOpen(true);
                              }}
                              className="flex-shrink-0 w-[280px] rounded-lg border bg-card hover:shadow-md transition-shadow text-left overflow-hidden"
                            >
                              {/* Header with user info */}
                              <div className="p-4 pb-3 border-b">
                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                  <span className="font-semibold text-sm text-blue-600">
                                    {comment.userName?.split(' ')[0] || 'Anonim'}****
                                  </span>
                                  
                                  {/* Rating Display */}
                                  {rating > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 -mx-2">
                                      <div className="flex items-center">
                                        <svg className="w-3 h-3 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
                                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                        </svg>
                                        <span className="text-xs font-medium text-gray-700 ml-1">
                                          {rating.toFixed(1)}
                                        </span>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        ({ratingCount})
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Content */}
                              <div className="p-4 pt-3">
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                                  {comment.comment}
                                </p>
                                {replyCount > 0 && (
                                  <div className="text-xs text-blue-600 font-medium">
                                    {replyCount} cevap
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}

                  {/* View All Button */}
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => {
                      setInitialThreadId(null); // Clear any previous thread selection
                      setIsCommentsModalOpen(true);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {commentCount > 0 
                      ? 'Tüm Yorumları Göster' 
                      : 'İlk Yorumu Siz Yapın'}
                  </Button>
                </CardContent>
              </Card>
            )}

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
                          listingId={listing.id}
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
                          onImageClick={(images, index) => {
                            setOfferLightboxImages(images);
                            setOfferLightboxIndex(index);
                            setOfferLightboxOpen(true);
                          }}
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
                  <span className="text-sm text-muted-foreground">Favori</span>
                  <span className="font-semibold">{listing?.favoriteCount || 0}</span>
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

            {/* Similar Listings */}
            {similarListings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Benzer İlanlar
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {listing?.category} kategorisindeki diğer ilanlar
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
                    {similarListings.map((item: any) => (
                      <Link
                        key={item.id}
                        to={`/listing/${item.id}`}
                        className="flex gap-3 p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
                      >
                        {/* Image */}
                        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          {item.images && item.images.length > 0 ? (
                            <img
                              src={getImageUrl(item.images[0])}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-purple-600 transition-colors">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {item.category}
                            </Badge>
                            {item.city && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.city}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const budget = item.budgetMax || item.budget_max;
                            const budgetNum = parseFloat(budget || 0);
                            if (budgetNum > 0) {
                              return (
                                <p className="text-sm font-bold text-purple-600 mt-1">
                                  Bütçe: ₺{budgetNum.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Bunu Alanlar Bunları da Aldı - Full Width Below Content */}
        {alsoViewedListings.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Bunu Alanlar Bunları da Aldı
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Diğer kullanıcıların ilgilendiği ilanlar
                </p>
              </CardHeader>
              <CardContent>
                <div className="relative group/carousel">
                  {/* Left Arrow Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const container = e.currentTarget.parentElement?.querySelector('.scroll-container');
                      if (container) {
                        container.scrollBy({ left: -280, behavior: 'smooth' });
                      }
                    }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white shadow-lg rounded-full p-3 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 border border-gray-200"
                    aria-label="Önceki"
                  >
                    <ChevronLeft className="h-6 w-6 text-gray-700" />
                  </button>

                  {/* Right Arrow Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const container = e.currentTarget.parentElement?.querySelector('.scroll-container');
                      if (container) {
                        container.scrollBy({ left: 280, behavior: 'smooth' });
                      }
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white shadow-lg rounded-full p-3 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 border border-gray-200"
                    aria-label="Sonraki"
                  >
                    <ChevronRight className="h-6 w-6 text-gray-700" />
                  </button>

                  {/* Horizontal Scrollable Container */}
                  <div 
                    ref={carouselRef}
                    {...swipeHandlers}
                    className="scroll-container flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-gray-100 pb-4 snap-x snap-mandatory touch-pan-x"
                    role="region"
                    aria-label="Bunu alanlar bunları da aldı carousel"
                    tabIndex={0}
                  >
                    {alsoViewedListings.map((item: any) => (
                      <AlsoViewedCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
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

      {/* Seller Reviews Modal */}
      {listing?.buyerId && (
        <SellerReviewsModal
          isOpen={isReviewsModalOpen}
          onClose={() => setIsReviewsModalOpen(false)}
          sellerId={listing.buyerId}
          sellerName={listing.buyerName || 'Kullanıcı'}
        />
      )}
      
      {/* Create Listing Modal */}
      <CreateListingModal
        open={isCreateListingModalOpen}
        onOpenChange={setIsCreateListingModalOpen}
      />

      {/* Lightbox Modal */}
      {isLightboxOpen && listing && listing.images && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Modal Container */}
          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-7xl max-h-[95vh] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-[101] bg-white rounded-full p-1.5 shadow-lg"
              aria-label="Kapat"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Main Content Area */}
            <div className="flex h-full">
              {/* Left Thumbnail Column */}
              {listing.images.length > 1 && (
                <div className="hidden lg:flex flex-col gap-3 p-4 bg-gray-50 max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {listing.images.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage(idx);
                      }}
                      className={`shrink-0 rounded-lg border-2 overflow-hidden transition-all ${
                        idx === activeImage 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={getImageUrl(src)}
                        alt={`Küçük görsel ${idx + 1}`}
                        className="w-20 h-20 object-cover"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Center Image Container */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 relative flex items-center justify-center p-8">
                  {/* Navigation Arrows */}
                  {listing.images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImage(prev => prev === 0 ? listing.images.length - 1 : prev - 1);
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-100 shadow-lg text-gray-700 rounded-full p-2 transition-all z-10"
                        aria-label="Önceki resim"
                      >
                        <ChevronLeft className="h-8 w-8" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImage(prev => prev === listing.images.length - 1 ? 0 : prev + 1);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-100 shadow-lg text-gray-700 rounded-full p-2 transition-all z-10"
                        aria-label="Sonraki resim"
                      >
                        <ChevronRight className="h-8 w-8" />
                      </button>
                    </>
                  )}

                  {/* Main Image */}
                  <img
                    src={getImageUrl(listing.images[activeImage])}
                    alt={`${listing.title} görsel ${activeImage + 1}`}
                    className="max-w-full max-h-[70vh] object-contain"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>

                {/* Mobile Thumbnail Gallery (Bottom) */}
                {listing.images.length > 1 && (
                  <div className="lg:hidden flex gap-2 p-4 border-t bg-gray-50 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {listing.images.map((src, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImage(idx);
                        }}
                        className={`shrink-0 rounded-lg border-2 overflow-hidden transition-all ${
                          idx === activeImage 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <img
                          src={getImageUrl(src)}
                          alt={`Küçük görsel ${idx + 1}`}
                          className="w-16 h-16 object-cover"
                          draggable={false}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Images Lightbox */}
      {offerLightboxOpen && offerLightboxImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setOfferLightboxOpen(false)}
        >
          {/* Modal Container */}
          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-7xl max-h-[95vh] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setOfferLightboxOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-[101] bg-white rounded-full p-1.5 shadow-lg"
              aria-label="Kapat"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Main Content Area */}
            <div className="flex h-full">
              {/* Left Thumbnail Column */}
              {offerLightboxImages.length > 1 && (
                <div className="hidden lg:flex flex-col gap-3 p-4 bg-gray-50 max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {offerLightboxImages.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOfferLightboxIndex(idx);
                      }}
                      className={`shrink-0 rounded-lg border-2 overflow-hidden transition-all ${
                        idx === offerLightboxIndex 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={src}
                        alt={`Küçük görsel ${idx + 1}`}
                        className="w-20 h-20 object-cover"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Center Image Container */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 relative flex items-center justify-center p-8">
                  {/* Navigation Arrows */}
                  {offerLightboxImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOfferLightboxIndex(prev => prev === 0 ? offerLightboxImages.length - 1 : prev - 1);
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-100 shadow-lg text-gray-700 rounded-full p-2 transition-all z-10"
                        aria-label="Önceki resim"
                      >
                        <ChevronLeft className="h-8 w-8" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOfferLightboxIndex(prev => prev === offerLightboxImages.length - 1 ? 0 : prev + 1);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-100 shadow-lg text-gray-700 rounded-full p-2 transition-all z-10"
                        aria-label="Sonraki resim"
                      >
                        <ChevronRight className="h-8 w-8" />
                      </button>
                    </>
                  )}

                  {/* Main Image */}
                  <img
                    src={offerLightboxImages[offerLightboxIndex]}
                    alt={`Teklif görseli ${offerLightboxIndex + 1}`}
                    className="max-w-full max-h-[70vh] object-contain"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Mobile Thumbnail Gallery (Bottom) */}
                {offerLightboxImages.length > 1 && (
                  <div className="lg:hidden flex gap-2 p-4 border-t bg-gray-50 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {offerLightboxImages.map((src, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOfferLightboxIndex(idx);
                        }}
                        className={`shrink-0 rounded-lg border-2 overflow-hidden transition-all ${
                          idx === offerLightboxIndex 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <img
                          src={src}
                          alt={`Küçük görsel ${idx + 1}`}
                          className="w-16 h-16 object-cover"
                          draggable={false}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {listing && (
        <ListingCommentsModal
          isOpen={isCommentsModalOpen}
          onClose={() => {
            setIsCommentsModalOpen(false);
            setInitialThreadId(null); // Reset on close
          }}
          listingId={listing.id}
          isOwner={isOwner}
          initialThreadId={initialThreadId}
          onCommentAdded={() => {
            loadCommentCount();
            loadPreviewComments();
          }}
        />
      )}

      {/* Footer */}
      <footer className="relative bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {/* Company Info */}
            <div className="col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-2xl">🛍️</div>
                <h3 className="text-xl font-bold text-white">
                  Varmii.com
                </h3>
              </div>
              <p className="text-sm text-gray-400 mb-4 max-w-md leading-relaxed">
                İstediğin ürünü ilan ver, satıcılar sana teklif versin! Türkiye'nin en yenilikçi alışveriş platformu.
              </p>
              
              {/* Social Media */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 mb-2">Bizi Takip Edin</h4>
                <div className="flex space-x-2">
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">📋</span>
                Yasal
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/terms" className="text-sm text-gray-300 hover:text-white transition-all duration-200">
                    Kullanım Şartları
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-sm text-gray-300 hover:text-white transition-all duration-200">
                    Gizlilik Politikası
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="text-sm text-gray-300 hover:text-white transition-all duration-200">
                    Çerez Politikası
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-sm text-gray-300 hover:text-white transition-all duration-200">
                    İletişim
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="text-sm text-gray-300 hover:text-white transition-all duration-200">
                    Yardım
                  </Link>
                </li>
              </ul>
            </div>

            {/* Mobile Apps */}
            <div>
              <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">📱</span>
                Mobil Uygulamalarımız
              </h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="#" className="group flex items-center gap-3 bg-black hover:bg-gray-900 text-white px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 w-fit">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs text-gray-300 leading-tight">Download on the</div>
                    <div className="text-sm font-semibold leading-tight">App Store</div>
                  </div>
                </a>
                <a href="#" className="group flex items-center gap-3 bg-black hover:bg-gray-900 text-white px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 w-fit">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs text-gray-300 leading-tight">GET IT ON</div>
                    <div className="text-sm font-semibold leading-tight">Google Play</div>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2">
              <p className="text-gray-400 text-xs">
                © 2024 Varmii.com. Tüm hakları saklıdır.
              </p>
              <div className="text-gray-400 text-xs">
                🚀 Türkiye'nin en yenilikçi marketplace'i
              </div>
            </div>
          </div>
        </div>
      </footer>
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