import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Clock, TrendingUp, Plus, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataManager, categories, cities, type Listing } from '@/lib/mockData';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import FavoriteButton from '@/components/FavoriteButton';

export default function Index() {
  const navigate = useNavigate();
  
  // State management with proper initialization
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Memoize current user to prevent unnecessary re-renders
  const currentUser = useMemo(() => DataManager.getCurrentUser(), []);
  
  // Memoize listings with proper dependency array
  const listings = useMemo(() => {
    const filters = {
      category: selectedCategory || undefined,
      city: selectedCity || undefined
    };
    return DataManager.searchListings(searchQuery, filters);
  }, [searchQuery, selectedCategory, selectedCity]);

  // Stable callback functions
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the useMemo above
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setIsAuthModalOpen(false);
    window.location.reload();
  }, []);

  const handleListingClick = useCallback((listingId: string) => {
    navigate(`/listing/${listingId}`);
  }, [navigate]);

  const handleCreateListing = useCallback(() => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    navigate('/create-listing');
  }, [currentUser, navigate]);

  const getConditionText = useCallback((condition: string) => {
    switch (condition) {
      case 'new': return 'Sıfır';
      case 'used': return '2. El';
      case 'any': return 'Farketmez';
      default: return condition;
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-green-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Aradığınız Var mı?
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-blue-100">
            İhtiyacınızı paylaşın, en iyi teklifleri alın
          </p>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-4 shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Ne arıyorsunuz? (iPhone, laptop, araba...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 text-gray-900"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tüm Kategoriler</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" size="lg" className="h-12 bg-blue-600 hover:bg-blue-700">
                  <Search className="h-5 w-5 mr-2" />
                  Ara
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtreler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Şehir</label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Şehir seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tüm Şehirler</SelectItem>
                      {cities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedCity('');
                    setSearchQuery('');
                  }}
                >
                  Filtreleri Temizle
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Hızlı İşlemler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={handleCreateListing}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  İlan Ver
                </Button>
                {currentUser && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/dashboard')}
                  >
                    Panelim
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Listings Grid */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {listings.length} ilan bulundu
              </h2>
            </div>

            {listings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-gray-500 mb-4">
                    <Search className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">İlan bulunamadı</h3>
                    <p>Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
                  </div>
                  <Button onClick={handleCreateListing}>
                    <Plus className="h-4 w-4 mr-2" />
                    İlk İlanı Siz Verin
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {listings.map((listing) => (
                  <Card 
                    key={listing.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handleListingClick(listing.id)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                            {listing.title}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{listing.city}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{DataManager.getTimeAgo(listing.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <FavoriteButton 
                          listingId={listing.id}
                          userId={currentUser?.id}
                          variant="ghost"
                          size="sm"
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {listing.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="secondary">{listing.category}</Badge>
                        <Badge variant="outline">{getConditionText(listing.condition)}</Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Bütçe</p>
                          <p className="font-semibold text-green-600">
                            {DataManager.formatPrice(listing.budgetMin)} - {DataManager.formatPrice(listing.budgetMax)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          <span>{listing.offerCount} teklif</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}