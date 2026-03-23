import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Clock, TrendingUp, Package, Star, Smartphone, Shirt, Home, Dumbbell, Music, Sparkles, Baby, Car } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Listing } from '@/lib/mockData';
import { mysqlAPI } from '@/lib/mysql-api';
import { maskDisplayName } from '@/lib/utils';
import { formatPrice, getTimeAgo, categories, cities } from '@/lib/uiUtils';
import Header from '@/components/Header';
import FavoriteButton from '@/components/FavoriteButton';
import AuthModal from '@/components/AuthModal-mysql';
import CreateListingModal from '@/components/CreateListingModal';
import { useAuth } from '@/hooks/use-auth-mysql';
import { toast } from 'sonner';

export default function Index() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [budgetMax, setBudgetMax] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateListingModalOpen, setIsCreateListingModalOpen] = useState(false);

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


  // Load listings from MySQL API
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setIsLoading(true);
      
      try {
        console.log('🚀 MySQL API aktif ilanlar yükleniyor...');
        
        // MySQL API'den aktif ilanları al
        const response = await mysqlAPI.getActiveListings();
        console.log('✅ MySQL API tam response:', response);
        
        // getActiveListings() artık otomatik parse ediyor
        const rows = Array.isArray(response) ? response : [];
        console.log('✅ MySQL API ilanlar:', rows?.length || 0, 'ilan');
        
        if (!ignore) {
          // Filtreleme işlemi
          const filtered = rows.filter((r: any) => {
            const q = searchQuery.toLowerCase();
            const matchesQ = !q || r.title.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q);
            const matchesC = selectedCategory === 'all' || r.category === selectedCategory;
            const matchesCity = selectedCity === 'all' || r.city === selectedCity;
            const matchesB = !budgetMax || r.budget_max <= parseInt(budgetMax);
            const matchesCond = selectedCondition === 'all' || r.condition === selectedCondition;
            return matchesQ && matchesC && matchesCity && matchesB && matchesCond;
          });
          
          // Tarihe göre sırala
          filtered.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          setListings(filtered);
        }
      } catch (e) {
        console.error('❌ MySQL API error:', e);
        if (!ignore) {
          setListings([]);
          // Fallback olarak localStorage'dan yükle
          try {
            const localData = localStorage.getItem('listings');
            if (localData) {
              const parsed = JSON.parse(localData);
              setListings(parsed.filter((l: any) => l.status === 'active'));
            }
          } catch {
            // Ignore localStorage errors
          }
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    
    const timer = setTimeout(load, 50);
    return () => { ignore = true; clearTimeout(timer); };
  }, [searchQuery, selectedCategory, selectedCity, budgetMax, selectedCondition]);

  const handleListingClick = (listingId: string) => {
    navigate(`/listing/${listingId}`);
  };

  const getConditionText = (condition: string) => {
    if (condition === 'new') return 'Sıfır';
    if (condition === 'any') return 'Farketmez';
    return '2. El'; // good, used, and all others map to 2. El
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

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-green-500 text-white py-12 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-16 h-16 bg-white/10 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
          <div className="absolute top-32 right-20 w-12 h-12 bg-yellow-300/20 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-20 left-20 w-20 h-20 bg-green-300/10 rounded-full animate-bounce" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-32 right-10 w-14 h-14 bg-blue-300/15 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="mb-6">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
              Aradığın Ürün <span className="text-yellow-300 animate-pulse">var mı?</span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl mb-8 opacity-90 max-w-4xl mx-auto leading-relaxed">
              İstediğin ürünü ilan ver, satıcılar sana teklif versin!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-6">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              onClick={() => setIsCreateListingModalOpen(true)}
            >
              Hemen İlan Ver
            </Button>

            {/* App Store Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-6">
              <a
                href="#"
                className="inline-flex items-center bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200 shadow-lg"
              >
                <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs opacity-75">App Store'dan</div>
                  <div className="font-semibold">İndir</div>
                </div>
              </a>

              <a
                href="#"
                className="inline-flex items-center bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200 shadow-lg"
              >
                <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
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

      {/* Category Bar */}
      <div className="bg-white border-b border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`text-sm font-medium whitespace-nowrap px-3 py-2 rounded-md transition-all duration-200 ${
                selectedCategory === 'all' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Elektronik
            </button>
            <button
              onClick={() => setSelectedCategory('Moda & Giyim')}
              className={`text-sm font-medium whitespace-nowrap px-3 py-2 rounded-md transition-all duration-200 ${
                selectedCategory === 'Moda & Giyim' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Moda
            </button>
            <button
              onClick={() => setSelectedCategory('Ev & Yaşam')}
              className={`text-sm font-medium whitespace-nowrap px-3 py-2 rounded-md transition-all duration-200 ${
                selectedCategory === 'Ev & Yaşam' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Ev, Yaşam, Kırtasiye, Ofis
            </button>
            <button
              onClick={() => setSelectedCategory('Otomotiv')}
              className={`text-sm font-medium whitespace-nowrap px-3 py-2 rounded-md transition-all duration-200 ${
                selectedCategory === 'Otomotiv' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Oto, Bahçe, Yapı Market
            </button>
            <button
              onClick={() => setSelectedCategory('Anne & Bebek')}
              className={`text-sm font-medium whitespace-nowrap px-3 py-2 rounded-md transition-all duration-200 ${
                selectedCategory === 'Anne & Bebek' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Anne, Bebek, Oyuncak
            </button>
            <button
              onClick={() => setSelectedCategory('Spor & Outdoor')}
              className={`text-sm font-medium whitespace-nowrap px-3 py-2 rounded-md transition-all duration-200 ${
                selectedCategory === 'Spor & Outdoor' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Spor, Outdoor
            </button>
            <button
              onClick={() => setSelectedCategory('Kozmetik & Kişisel Bakım')}
              className={`text-sm font-medium whitespace-nowrap px-3 py-2 rounded-md transition-all duration-200 ${
                selectedCategory === 'Kozmetik & Kişisel Bakım' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Kozmetik, Kişisel Bakım
            </button>
            <button
              onClick={() => setSelectedCategory('Süpermarket & Petshop')}
              className={`text-sm font-medium whitespace-nowrap px-3 py-2 rounded-md transition-all duration-200 ${
                selectedCategory === 'Süpermarket & Petshop' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Süpermarket, Pet Shop
            </button>
            <button
              onClick={() => setSelectedCategory('Kitap & Müzik')}
              className={`text-sm font-medium whitespace-nowrap px-3 py-2 rounded-md transition-all duration-200 ${
                selectedCategory === 'Kitap & Müzik' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              Kitap, Müzik, Film, Hobi
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              İlan Ara
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Aktif İlanlar ({listings.length})</h2>
        </div>

        {listings.length === 0 ? (
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
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(listing => {
              if (!listing || !listing.id) return null;
              
              // Kullanıcının kendi ilanı mı kontrol et
              const isOwnListing = currentUser && listing.buyerId === currentUser.id;

              return (
                <Card
                  key={listing.id}
                  className={`cursor-pointer hover:shadow-lg transition-all duration-200 group ${
                    isOwnListing 
                      ? 'ring-2 ring-blue-500 ring-opacity-50 bg-gradient-to-br from-blue-50/50 to-green-50/50 hover:ring-opacity-75' 
                      : ''
                  }`}
                  onClick={() => handleListingClick(listing.id)}
                  title={isOwnListing ? 'Bu sizin ilanınız' : ''}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{listing.title}</CardTitle>
                          {isOwnListing && (
                            <Badge 
                              variant="default" 
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1"
                            >
                              Sizin İlanınız
                            </Badge>
                          )}
                        </div>
                        {isOwnListing && (
                          <p className="text-xs text-blue-600 font-medium mb-2">
                            Bu sizin ilanınız - düzenlemek için tıklayın
                          </p>
                        )}
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
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      {listing.city}
                      <Clock className="h-4 w-4 ml-4 mr-1" />
                      {getTimeAgo(listing.createdAt)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {listing.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary">{listing.category}</Badge>
                      <Badge variant="outline">{getConditionText(listing.condition)}</Badge>
                      <Badge variant="outline">{getDeliveryText(listing.deliveryType)}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-semibold text-green-600">
                        {formatPrice(listing.budgetMax || 0)} TL'ye kadar
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span className="font-semibold">{listing.offerCount ?? 0} teklif</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs">
                      {isOwnListing ? (
                        <span className="text-blue-600 font-medium">
                          İlan sahibi: Siz
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          İlan sahibi: {maskDisplayName(listing.buyerName || 'Anonim')}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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