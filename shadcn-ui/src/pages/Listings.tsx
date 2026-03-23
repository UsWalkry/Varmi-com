import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Clock, TrendingUp, Package, ChevronLeft } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Listing } from '@/lib/mockData';
import { mysqlAPI, getImageUrl } from '@/lib/mysql-api';
import { formatPriceShort } from '@/utils/formatPrice';
import { getTimeAgo, categories, cities } from '@/lib/uiUtils';
import Header from '@/components/Header';
import FavoriteButton from '@/components/FavoriteButton';
import CreateListingModal from '@/components/CreateListingModal';
import { useAuth } from '@/hooks/use-auth-mysql';

// Helper functions
function getConditionText(condition: string) {
  if (condition === 'new') return 'Sıfır';
  if (condition === 'any') return 'Farketmez';
  return '2. El';
}

function getDeliveryText(delivery: string) {
  const deliveryMap: { [key: string]: string } = {
    'shipping': 'Kargo',
    'pickup': 'Elden Teslim',
    'both': 'Her İkisi'
  };
  return deliveryMap[delivery] || delivery;
}

// ListingCard component
interface ListingCardProps {
  listing: Listing;
  isOwnListing: boolean;
  currentUser: any;
}

function ListingCard({ listing, isOwnListing, currentUser }: ListingCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const hoverIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const images = listing.images && listing.images.length > 0 ? listing.images : ['/image-placeholder.png'];
  const hasMultipleImages = images.length > 1;

  const startImageCycle = () => {
    if (!hasMultipleImages) return;
    setIsHovering(true);
    setCurrentImageIndex(1);
    hoverIntervalRef.current = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % images.length);
    }, 800);
  };

  const stopImageCycle = () => {
    setIsHovering(false);
    if (hoverIntervalRef.current) {
      clearInterval(hoverIntervalRef.current);
      hoverIntervalRef.current = null;
    }
    setCurrentImageIndex(0);
  };

  useEffect(() => {
    return () => {
      if (hoverIntervalRef.current) {
        clearInterval(hoverIntervalRef.current);
      }
    };
  }, []);

  return (
    <Link to={`/listing/${listing.id}`} className="block h-full">
      <Card
        className={`cursor-pointer hover:shadow-lg transition-all duration-200 group overflow-hidden h-[320px] flex flex-col ${
          isOwnListing ? 'ring-2 ring-primary/50' : ''
        }`}
        onMouseEnter={startImageCycle}
        onMouseLeave={stopImageCycle}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={getImageUrl(images[currentImageIndex])}
            alt={listing.title}
            className={`w-full h-full object-cover transition-all duration-300 ${
              isHovering ? 'scale-105' : 'group-hover:scale-105'
            }`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/image-placeholder.png';
            }}
          />
          {isOwnListing && (
            <Badge className="absolute top-2 left-2 bg-primary text-white text-xs">
              Sizin
            </Badge>
          )}
          {hasMultipleImages && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.slice(0, 5).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
          <div className="absolute top-2 right-2">
            <FavoriteButton
              listingId={listing.id}
              showCount={false}
              size="sm"
            />
          </div>
        </div>
        <CardContent className="p-3 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
              {listing.title}
            </h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Clock className="h-3 w-3" />
              <span>{getTimeAgo(listing.createdAt)}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {listing.description}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs px-1.5 py-0">{listing.category}</Badge>
              <Badge variant="outline" className="text-xs px-1.5 py-0">{getConditionText(listing.condition || 'any')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-primary font-bold text-sm">
                {formatPriceShort(listing.budgetMax || 0)}'ye kadar
              </span>
              {(listing.offerCount ?? 0) > 0 && (
                <div className="flex items-center text-xs text-orange-600">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  <span>{listing.offerCount} teklif</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Listings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || 'all');
  const [budgetMax, setBudgetMax] = useState(searchParams.get('budget') || '');
  const [selectedCondition, setSelectedCondition] = useState(searchParams.get('condition') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateListingModalOpen, setIsCreateListingModalOpen] = useState(false);

  // Load listings from MySQL API
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setIsLoading(true);
      try {
        console.log('🚀 Listings page - Loading active listings...');
        const response = await mysqlAPI.getActiveListings();
        console.log('✅ Listings API response:', response);
        
        // Handle both response formats: { success, listings } and raw array
        const rows = response?.success && Array.isArray(response.listings) 
          ? response.listings 
          : Array.isArray(response) 
            ? response 
            : [];
        
        console.log('📋 Parsed listings:', rows.length);
        
        if (!ignore) {
          setListings(rows);
        }
      } catch (e) {
        console.error('❌ MySQL API error:', e);
        if (!ignore) setListings([]);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    
    load();
    return () => { ignore = true; };
  }, []);

  // Filter and sort listings
  const filteredListings = listings
    .filter((listing) => {
      const q = searchQuery.toLowerCase();
      const matchesQ = !q || listing.title.toLowerCase().includes(q) || (listing.description ?? '').toLowerCase().includes(q);
      const matchesC = selectedCategory === 'all' || listing.category === selectedCategory;
      const matchesCity = selectedCity === 'all' || listing.city === selectedCity;
      const matchesB = !budgetMax || (listing.budgetMax || 0) <= parseInt(budgetMax);
      const matchesCond = selectedCondition === 'all' || listing.condition === selectedCondition;
      
      // sort=offers ise sadece teklif alanları göster
      const matchesOfferFilter = sortBy !== 'offers' || (listing.offerCount ?? 0) > 0;
      
      return matchesQ && matchesC && matchesCity && matchesB && matchesCond && matchesOfferFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'offers':
          return (b.offerCount ?? 0) - (a.offerCount ?? 0);
        case 'price-low':
          return (a.budgetMax || 0) - (b.budgetMax || 0);
        case 'price-high':
          return (b.budgetMax || 0) - (a.budgetMax || 0);
        case 'newest':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />
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
      <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Ana Sayfa
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              İlan Ara
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              <div className="lg:col-span-2">
                <Input
                  placeholder="Ürün ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  {categories && categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Input
                type="number"
                placeholder="Max Bütçe"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
              />
              <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="new">Sıfır</SelectItem>
                  <SelectItem value="used">2. El</SelectItem>
                  <SelectItem value="any">Farketmez</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">En Yeni</SelectItem>
                  <SelectItem value="offers">En Çok Teklif</SelectItem>
                  <SelectItem value="price-low">Fiyat (Düşük)</SelectItem>
                  <SelectItem value="price-high">Fiyat (Yüksek)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {sortBy === 'offers' && <TrendingUp className="h-6 w-6 text-orange-500" />}
            {sortBy === 'offers' ? 'En Çok Teklif Alanlar' : 'Tüm Aktif İlanlar'} ({filteredListings.length})
          </h1>
        </div>

        {/* Results */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredListings.map(listing => {
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
        )}
      </div>

      <CreateListingModal
        isOpen={isCreateListingModalOpen}
        onClose={() => setIsCreateListingModalOpen(false)}
        onListingCreated={() => {
          setIsCreateListingModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
