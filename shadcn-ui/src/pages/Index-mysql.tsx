import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Clock, TrendingUp, Package, Star, ShoppingCart, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Listing } from '@/lib/mockData';
import { mysqlAPI, getImageUrl } from '@/lib/mysql-api';

type ListingWithFeatured = Listing & { featured?: boolean; };
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { formatPrice as formatPriceOld, getTimeAgo, categories, cities, CATEGORY_GROUPS } from '@/lib/uiUtils';
import { formatPriceShort } from '@/utils/formatPrice';
import Header from '@/components/Header';
import FavoriteButton from '@/components/FavoriteButton';
import AuthModal from '@/components/AuthModal-mysql';
import CreateListingModal from '@/components/CreateListingModal';
import { useAuth } from '@/hooks/use-auth-mysql';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '@/lib/imageOptimization';

// Helper functions
function getConditionText(condition: string) {
  if (condition === 'new') return 'Sıfır';
  if (condition === 'any') return 'Farketmez';
  return '2. El'; // good, used, and all others map to 2. El
}

function getDeliveryText(delivery: string) {
  const deliveryMap: { [key: string]: string } = {
    'shipping': 'Kargo',
    'pickup': 'Elden Teslim',
    'both': 'Her İkisi'
  };
  return deliveryMap[delivery] || delivery;
}

// ListingCard component with hover image switching
interface ListingCardProps {
  listing: ListingWithFeatured;
  isOwnListing: boolean;
  currentUser: any;
}

function ListingCard({ listing, isOwnListing, currentUser }: ListingCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [showBudget, setShowBudget] = useState(true);
  const { addToCart } = useCart();
  const navigate = useNavigate(); // true = bütçe, false = teklif sayısı
  const hoverIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const images = listing.images && listing.images.length > 0 ? listing.images : ['/image-placeholder.png'];
  const hasMultipleImages = images.length > 1;

  const startImageCycle = () => {
    if (!hasMultipleImages) return;
    
    setIsHovering(true);
    
    // İlk görsel değişimi hemen başlat
    setCurrentImageIndex(1);
    
    // Sonraki görseller için interval başlat
    hoverIntervalRef.current = setInterval(() => {
      setCurrentImageIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % images.length;
        return nextIndex;
      });
    }, 800); // Her 800ms'de bir görsel değiştir
  };

  const stopImageCycle = () => {
    setIsHovering(false);
    if (hoverIntervalRef.current) {
      clearInterval(hoverIntervalRef.current);
      hoverIntervalRef.current = null;
    }
    setCurrentImageIndex(0); // İlk görsele geri dön
  };

  useEffect(() => {
    return () => {
      if (hoverIntervalRef.current) {
        clearInterval(hoverIntervalRef.current);
      }
    };
  }, []);

  // Bütçe ve teklif sayısı arasında otomatik geçiş
  useEffect(() => {
    const infoRotationInterval = setInterval(() => {
      setShowBudget(prev => !prev);
    }, 3000); // Her 3 saniyede bir değiştir
    
    return () => {
      clearInterval(infoRotationInterval);
    };
  }, []);

  return (
    <Link to={`/listing/${listing.id}`} className="block h-full">
      <Card
        className={`cursor-pointer hover:shadow-lg transition-all duration-200 group overflow-hidden h-[320px] flex flex-col ${
          isOwnListing 
            ? 'ring-2 ring-orange-500 ring-opacity-50 bg-gradient-to-br from-orange-50/50 to-amber-50/50 hover:ring-opacity-75' 
            : listing.featured
              ? 'ring-2 ring-orange-400 ring-opacity-40 bg-orange-50/60'
              : ''
        }`}
        title={isOwnListing ? 'Bu sizin ilanınız' : ''}
        onMouseEnter={startImageCycle}
        onMouseLeave={stopImageCycle}
      >
      {/* İlan Görseli */}
      <div className="aspect-[4/3] relative overflow-hidden bg-white">
        <img
          src={getOptimizedImageUrl(images[currentImageIndex].startsWith('http') 
            ? images[currentImageIndex] 
            : getImageUrl(images[currentImageIndex])
          )}
          srcSet={getResponsiveSrcSet(
            images[currentImageIndex].startsWith('http') 
              ? images[currentImageIndex] 
              : getImageUrl(images[currentImageIndex]),
            [320, 640, 960]
          )}
          sizes="(max-width: 640px) 320px, (max-width: 960px) 640px, 960px"
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/image-placeholder.png';
          }}
        />

        {/* Sepete Ekle İkonu - Hover'da ve teklif varsa Görünür */}
        {listing.status === 'active' && !isOwnListing && isHovering && (listing.offerCount ?? 0) > 0 && (
          <button
            className="absolute bottom-2 right-2 transition-all duration-300 bg-orange-600 hover:bg-orange-700 shadow-lg rounded-md p-2 border-2 border-white cursor-pointer"
            style={{ zIndex: 100, opacity: 1 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!currentUser) {
                toast.error('Sepete eklemek için giriş yapmalısınız');
                navigate('/?login=true');
                return;
              }
              addToCart(listing.id);
            }}
            title="Sepete Ekle"
          >
            <ShoppingCart className="h-4 w-4 text-white" />
          </button>
        )}
      </div>
      
      <CardHeader className="p-3 pb-2 flex-shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <CardTitle className="text-sm font-semibold line-clamp-1 leading-tight truncate">{listing.title}</CardTitle>
              {isOwnListing && (
                <Badge 
                  variant="default" 
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-1 py-0 flex-shrink-0"
                >
                  Sizin
                </Badge>
              )}
              {listing.featured && !isOwnListing && (
                <Badge 
                  variant="default" 
                  className="bg-amber-500 text-white text-xs px-1 py-0 flex-shrink-0"
                >
                  Vitrin
                </Badge>
              )}
            </div>
          </div>
          {currentUser && !isOwnListing && (
            <FavoriteButton 
              listingId={listing.id} 
              userId={currentUser.id}
              size="sm"
              variant="ghost"
            />
          )}
        </div>
        <div className="flex items-center text-xs text-muted-foreground gap-2">
          {/* Şehir sadece kargo değilse göster */}
          {listing.deliveryType !== 'shipping' && listing.city && (
            <div className="flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="truncate">{listing.city}</span>
            </div>
          )}
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span className="truncate">{getTimeAgo(listing.createdAt)}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0 flex-1 flex flex-col justify-between">
        {/* Description - sadece hover'da göster */}
        <div className="hidden group-hover:block">
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {listing.description}
          </p>
        </div>
        
        {/* Badges - daha küçük */}
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge variant="secondary" className="text-xs px-1 py-0">{listing.category}</Badge>
          <Badge variant="outline" className="text-xs px-1 py-0">{getConditionText(listing.condition)}</Badge>
        </div>
        
        {/* Price ve offer count - 3 saniyede bir değişir */}
        <div className="flex justify-between items-center mb-1">
          <div className="text-sm font-bold transition-opacity duration-300">
            {showBudget ? (
              <span className="text-green-600">{formatPriceShort(listing.budgetMax || 0)}'ye kadar</span>
            ) : (
              <div className="flex items-center text-sm text-orange-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span className="font-medium">{listing.offerCount ?? 0} teklif var</span>
              </div>
            )}
          </div>
        </div>
        
      </CardContent>
    </Card>
    </Link>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const [listings, setListings] = useState<ListingWithFeatured[]>([]);
  const [featuredListings, setFeaturedListings] = useState<ListingWithFeatured[]>([]);
  const featuredCarouselRef = useRef<HTMLDivElement | null>(null);
  const [allListings, setAllListings] = useState<ListingWithFeatured[]>([]); // Tüm ilanları sakla
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [budgetMax, setBudgetMax] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateListingModalOpen, setIsCreateListingModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // URL'den search parametresini oku ve state'e aktar
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
      // Arama inputuna odaklan ve scroll yap (isteğe bağlı)
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // URL'de search parametresi yoksa arama inputunu temizle
      setSearchQuery('');
    }
  }, [searchParams]);

  // Client-side filtering - sayfa yenilenmez - MEMOIZED
  const filteredListings = useMemo(() => {
    // console.log('🔍 Filtering - allListings:', allListings.length);
    // console.log('🔍 Search query:', searchQuery);
    // console.log('🔍 Selected category:', selectedCategory);
    
    const result = allListings.filter((listing) => {
      // console.log('🔍 Checking listing:', listing.title, listing);
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        listing.title.toLowerCase().includes(q) || 
        (listing.description || '').toLowerCase().includes(q);
      
      const matchesCategory =
        selectedCategory === 'all' ||
        listing.category === selectedCategory ||
        !!(CATEGORY_GROUPS.find(g => g.group === selectedCategory)?.subcategories.includes(listing.category));
      const matchesCity = selectedCity === 'all' || listing.city === selectedCity;
      const matchesBudget = !budgetMax || (listing.budgetMax || 0) <= parseInt(budgetMax);
      
      // Condition matching: 2 options (Sıfır, 2.El)
      let matchesCondition = true;
      if (selectedCondition !== 'all') {
        if (selectedCondition === 'new') {
          // Sıfır: only 'new'
          matchesCondition = listing.condition === 'new';
        } else if (selectedCondition === 'used') {
          // 2. El: anything that's NOT 'new' (includes good, used, like_new, fair, poor, any, etc.)
          matchesCondition = listing.condition !== 'new';
        }
      }
      
      const matchesDeliveryType = selectedDeliveryType === 'all' || listing.deliveryType === selectedDeliveryType;
      
      const passes = matchesSearch && matchesCategory && matchesCity && matchesBudget && matchesCondition && matchesDeliveryType;
      // console.log('🔍 Filter result for', listing.title, ':', passes, {
      //   matchesSearch, matchesCategory, matchesCity, matchesBudget, matchesCondition
      // });
      
      return passes;
    });
    
    // console.log('🎯 Final filtered listings:', result.length);
    return result;
  }, [allListings, searchQuery, selectedCategory, selectedCity, budgetMax, selectedCondition, selectedDeliveryType]);

  // Email change success notification
  useEffect(() => {
    const emailChanged = searchParams.get('email-changed');
    if (emailChanged === 'true') {
      toast.success('🎉 Email değişikliği tamamlandı!', {
        description: 'Güvenlik için oturumunuz sonlandırıldı. Yeni email adresinizle giriş yapabilirsiniz.',
        duration: 6000
      });
      
      // URL'den parametreyi temizle
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);
  
  // Get current user from MySQL API


  // Load listings from MySQL API - ONLY ONCE when component mounts
  useEffect(() => {
    // console.log('🔄 useEffect triggered - loading listings...');
    let ignore = false;
    
    // Double mount check - prevent duplicate API calls
    if (allListings.length > 0) {
      // console.log('📋 Listings already loaded, skipping...');
      return;
    }
    
    const load = async () => {
      if (ignore) return;
      setIsLoading(true);
      
      try {
        // console.log('🚀 MySQL API aktif ilanlar yükleniyor...');
        
        // MySQL API'den aktif ilanları al
        const response = await mysqlAPI.getActiveListings();
        // console.log('✅ MySQL API tam response:', response);
        // console.log('🔍 Response structure:', {
        //   isArray: Array.isArray(response),
        //   hasSuccess: response?.success,
        //   hasListings: !!response?.listings,
        //   listingsArray: Array.isArray(response?.listings),
        //   listingsLength: response?.listings?.length,
        //   directLength: response?.length
        // });
        
        const rows = response?.success && Array.isArray(response.listings) ? response.listings : 
                     Array.isArray(response) ? response : [];
        // console.log('✅ MySQL API ilanlar:', rows?.length || 0, 'ilan');
        
        if (!ignore) {
          // Tarihe göre sırala
          const sorted = rows.sort((a: any, b: any) => 
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
          // console.log('📋 Sorted listings:', sorted);
          setAllListings(sorted); // Tüm ilanları sakla
          setListings(sorted); // Başlangıçta tümünü göster
          // console.log('🎯 State updated - allListings length:', sorted.length);
        }
      } catch (e) {
        // console.error('❌ MySQL API error:', e);
        if (!ignore) {
          setAllListings([]);
          setListings([]);
          // Fallback olarak localStorage'dan yükle
          try {
            const localData = localStorage.getItem('listings');
            if (localData) {
              const parsed = JSON.parse(localData);
              const activeListings = parsed.filter((l: any) => l.status === 'active');
              setAllListings(activeListings);
              setListings(activeListings);
            }
          } catch {
            // Ignore localStorage errors
          }
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    
    load();
    return () => { ignore = true; };
  }, []); // Sadece component mount'ta çalışır

  // Load featured listings from MySQL API
  useEffect(() => {
    let ignore = false;
    
    const loadFeatured = async () => {
      if (ignore) return;
      
      try {
        const response = await mysqlAPI.getFeaturedListings();
        const rows = response?.success && Array.isArray(response.listings) ? response.listings : 
                     Array.isArray(response) ? response : [];
        
        if (!ignore) {
          setFeaturedListings(rows);
        }
      } catch (e) {
        console.error('❌ Featured listings error:', e);
        if (!ignore) {
          setFeaturedListings([]);
        }
      }
    };
    
    loadFeatured();
    return () => { ignore = true; };
  }, []); // Sadece component mount'ta çalışır

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p>Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />

      {/* Custom CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          33% { transform: translateY(-15px) translateX(10px) rotate(10deg); }
          66% { transform: translateY(-25px) translateX(-10px) rotate(-10deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes swing {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5)); }
          50% { filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.8)); }
        }
        .float-animation { animation: float 3s ease-in-out infinite; }
        .float-slow { animation: floatSlow 4s ease-in-out infinite; }
        .spin-slow { animation: spin-slow 20s linear infinite; }
        .swing { animation: swing 2s ease-in-out infinite; }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
      `}</style>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300 text-white py-12 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        {/* Decorative Geometric Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-400/10 rounded-full blur-3xl"></div>
          <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)"/>
          </svg>
          <div className="absolute top-10 right-10 w-32 h-32 border border-white/10 rounded-full"></div>
          <div className="absolute top-10 right-10 w-56 h-56 border border-white/5 rounded-full -translate-x-12 -translate-y-12"></div>
          <div className="absolute bottom-10 left-10 w-40 h-40 border border-white/10 rounded-full"></div>
          <div className="absolute bottom-10 left-10 w-64 h-64 border border-white/5 rounded-full -translate-x-12"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="mb-6">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
              Aradığın Ürünü Bul, <span className="text-amber-100">En İyi Fiyata Al!</span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl mb-8 opacity-90 max-w-4xl mx-auto leading-relaxed">
              Ürün ilanı oluştur, satıcılardan teklif al, karşılaştır ve en uygununu seç!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-6">
            <div className="relative inline-block">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
              <Button
                size="lg"
                className="relative bg-white text-orange-600 hover:bg-gray-100 text-lg px-10 py-6 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 font-bold group"
                onClick={() => setIsCreateListingModalOpen(true)}
              >
                <span className="flex items-center gap-2">
                  <span>Ücretsiz İlan Ver</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </Button>
            </div>

            {/* Features Pills */}
            <div className="flex flex-wrap gap-3 justify-center items-center max-w-2xl mx-auto">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/30 transition-all duration-200 cursor-default">
                <span className="text-xl">⚡</span>
                <span>Hızlı ve Kolay</span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/30 transition-all duration-200 cursor-default">
                <span className="text-xl">🔒</span>
                <span>Güvenli Alışveriş</span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/30 transition-all duration-200 cursor-default">
                <span className="text-xl">🤝</span>
                <span>Komisyonlu Kazanç</span>
              </div>
            </div>

            {/* App Store Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-6">
              <a
                href="#"
                className="group inline-flex items-center bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1"
              >
                <svg className="w-8 h-8 mr-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs opacity-75">App Store'dan</div>
                  <div className="font-semibold">İndir</div>
                </div>
              </a>
              <a
                href="#"
                className="group inline-flex items-center bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1"
              >
                <svg className="w-8 h-8 mr-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs opacity-75">Google Play'den</div>
                  <div className="font-semibold">İndir</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Content Grid: Filters on Left, Results on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Filtreler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }}
                  action="javascript:void(0)"
                  className="space-y-4"
                >
                  {/* 1. Search Input */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Ürün Ara</label>
                    <input
                      ref={searchInputRef}
                      key="search-input-native"
                      type="text"
                      placeholder="Ürün ara..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
                          searchInputRef.current.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      autoComplete="off"
                      autoFocus={false}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    />
                  </div>

                  {/* 2. Category */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Kategori</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Kategoriler</SelectItem>
                        {CATEGORY_GROUPS.map((group) => (
                          <SelectGroup key={group.group}>
                            <SelectLabel className="font-bold text-xs text-muted-foreground uppercase tracking-wide">{group.group}</SelectLabel>
                            {group.subcategories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. Delivery Type */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Teslimat Türü</label>
                    <Select 
                      value={selectedDeliveryType} 
                      onValueChange={(value) => {
                        setSelectedDeliveryType(value);
                        // Eğer kargo seçilirse şehir filtresini temizle
                        if (value === 'shipping') {
                          setSelectedCity('all');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Teslimat Türü" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Teslimat Türleri</SelectItem>
                        <SelectItem value="shipping">Kargo</SelectItem>
                        <SelectItem value="pickup">Elden Teslim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3.1 City - Only show when pickup or both selected */}
                  {(selectedDeliveryType === 'pickup' || selectedDeliveryType === 'both') && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Şehir</label>
                      <Select value={selectedCity} onValueChange={setSelectedCity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Şehir" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tüm Şehirler</SelectItem>
                          {cities && cities.map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* 4. Condition */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Durum</label>
                    <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                      <SelectTrigger>
                        <SelectValue placeholder="Durum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Durumlar</SelectItem>
                        <SelectItem value="new">Sıfır</SelectItem>
                        <SelectItem value="used">2. El</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 5. Max Budget */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Bütçe</label>
                    <Input
                      type="number"
                      placeholder="Max Bütçe"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                    />
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Results */}
          <div className="lg:col-span-3">
            {/* Category Navigation Bar with hover dropdowns */}
            <div className="mb-8 border-b border-gray-200/80">
              <div className="flex flex-wrap gap-0 pb-0">
                {/* Tümü butonu */}
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`text-sm font-semibold whitespace-nowrap px-3 py-3 transition-all duration-200 border-b-2 ${
                    selectedCategory === 'all'
                      ? 'text-orange-600 border-orange-600'
                      : 'text-gray-500 border-transparent hover:text-orange-600 hover:border-orange-300'
                  }`}
                >
                  Tümü
                </button>

                {CATEGORY_GROUPS.map((group) => {
                  const isActive =
                    selectedCategory === group.group ||
                    group.subcategories.includes(selectedCategory);
                  return (
                    <div key={group.group} className="relative group">
                      {/* Ana başlık */}
                      <button
                        onClick={() => setSelectedCategory(group.group)}
                        className={`flex items-center gap-1 text-sm font-semibold whitespace-nowrap px-3 py-3 transition-all duration-200 border-b-2 ${
                          isActive
                            ? 'text-orange-600 border-orange-600'
                            : 'text-gray-600 border-transparent hover:text-orange-600 hover:border-orange-300'
                        }`}
                      >
                        {group.group}
                        <ChevronDown className="h-3.5 w-3.5 mt-0.5 opacity-50 group-hover:opacity-100 transition-transform duration-200 group-hover:rotate-180" />
                      </button>

                      {/* Alt kategori dropdown */}
                      <div className="absolute left-0 top-full z-50 hidden group-hover:block pt-0">
                        <div className="bg-white border border-gray-200 rounded-xl shadow-xl shadow-black/10 min-w-[200px] py-2 mt-1">
                          {/* Grubun hepsini seç */}
                          <button
                            onClick={() => setSelectedCategory(group.group)}
                            className={`w-full text-left px-4 py-2 text-sm font-bold border-b border-gray-100 mb-1 transition-colors ${
                              selectedCategory === group.group
                                ? 'text-orange-600 bg-orange-50'
                                : 'text-gray-800 hover:bg-gray-50'
                            }`}
                          >
                            Tüm {group.group}
                          </button>
                          {group.subcategories.map((sub) => (
                            <button
                              key={sub}
                              onClick={() => setSelectedCategory(sub)}
                              className={`w-full text-left px-4 py-1.5 text-sm transition-colors ${
                                selectedCategory === sub
                                  ? 'text-orange-600 font-semibold bg-orange-50'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {featuredListings.length > 0 && (
              <div className="mb-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Vitrin İlanları ✨</h2>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                      En öne çıkmış ilanlar burada. Admin panelden yönetilebilen özel vitrinin en güncel ilanlarını kaydırarak inceleyebilirsiniz.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => featuredCarouselRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 transition"
                      aria-label="Önceki vitrin ilanı"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => featuredCarouselRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 transition"
                      aria-label="Sonraki vitrin ilanı"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <Link
                      to="/listings?featured=1"
                      className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                    >
                      Tümünü Gör
                      <span>›</span>
                    </Link>
                  </div>
                </div>

                <div
                  ref={featuredCarouselRef}
                  className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
                >
                  {featuredListings.map((listing) => {
                    const isOwnListing = currentUser && listing.buyerId === currentUser.id;
                    return (
                      <div key={listing.id} className="min-w-[320px] snap-start">
                        <ListingCard
                          listing={listing}
                          isOwnListing={isOwnListing}
                          currentUser={currentUser}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Aktif İlanlar 🛒</h2>
              <Link 
                to="/listings" 
                className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
              >
                Tümünü Gör
                <span>›</span>
              </Link>
            </div>

            {filteredListings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">İlan bulunamadı</h3>
                  <p className="text-muted-foreground mb-4">
                    Arama kriterlerinize uygun ilan bulunmuyor. Filtreleri değiştirmeyi deneyin.
                  </p>
                  <Button onClick={() => setIsCreateListingModalOpen(true)}>
                    İlk İlanı Siz Verin
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredListings.map((listing, index) => {
                  if (!listing || !listing.id) return null;
                  
                  // Kullanıcının kendi ilanı mı kontrol et
                  const isOwnListing = currentUser && listing.buyerId === currentUser.id;

                  return (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isOwnListing={isOwnListing}
                      currentUser={currentUser}
                    />
                  );
                })}
              </div>
            )}

            {/* En Çok Teklif Alanlar Bölümü */}
            {listings.filter(l => (l.offerCount ?? 0) > 0).length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-orange-500" />
                    En Çok Teklif Alanlar 🤩
                  </h2>
                  <Link 
                    to="/listings?sort=offers" 
                    className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                  >
                    Tümünü Gör
                    <span>›</span>
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {listings
                    .filter(l => (l.offerCount ?? 0) > 0)
                    .sort((a, b) => (b.offerCount ?? 0) - (a.offerCount ?? 0))
                    .slice(0, 8)
                    .map((listing) => {
                      if (!listing || !listing.id) return null;
                      const isOwnListing = currentUser && listing.buyerId === currentUser.id;
                      return (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          isOwnListing={isOwnListing}
                          currentUser={currentUser}
                        />
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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

      {/* Create Listing Modal */}
      <CreateListingModal
        open={isCreateListingModalOpen}
        onOpenChange={setIsCreateListingModalOpen}
        onSuccess={() => {
          // İlan başarıyla oluşturulduğunda listeyi yenile
          setSearchQuery(searchQuery + ' '); // Force reload by changing search
          setTimeout(() => setSearchQuery(searchQuery.trim()), 100);
        }}
      />
    </div>
  );
}