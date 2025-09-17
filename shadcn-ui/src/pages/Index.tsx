import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, MapPin, Clock, TrendingUp, User, LogOut } from 'lucide-react';
import { Listing, DataManager, categories, cities } from '@/lib/mockData';
import ListingCard from '@/components/ListingCard';
import AuthModal from '@/components/AuthModal';

export default function Index() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(DataManager.getCurrentUser());

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    filterListings();
  }, [listings, searchQuery, selectedCategory, selectedCity, selectedCondition]);

  const loadListings = () => {
    const allListings = DataManager.getListings();
    const activeListings = allListings.filter(listing => listing.status === 'active');
    setListings(activeListings);
  };

  const filterListings = () => {
    let filtered = [...listings];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(listing => listing.category === selectedCategory);
    }

    if (selectedCity !== 'all') {
      filtered = filtered.filter(listing => listing.city === selectedCity);
    }

    if (selectedCondition !== 'all') {
      filtered = filtered.filter(listing =>
        listing.condition === selectedCondition || listing.condition === 'any'
      );
    }

    setFilteredListings(filtered);
  };

  const handleAuthSuccess = () => {
    setCurrentUser(DataManager.getCurrentUser());
  };

  const handleLogout = () => {
    DataManager.logoutUser();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-blue-600">Var mı?</h1>
              <Badge variant="secondary" className="text-xs">
                Ters Pazar Yeri
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              {currentUser ? (
                <>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    <User className="h-4 w-4 mr-2" />
                    Panelim
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Çıkış Yap
                  </Button>
                  <Button onClick={() => navigate('/create-listing')}>
                    <Plus className="h-4 w-4 mr-2" />
                    İlan Ver
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsAuthModalOpen(true)}>
                    Giriş Yap
                  </Button>
                  <Button onClick={() => navigate('/create-listing')}>
                    <Plus className="h-4 w-4 mr-2" />
                    İlan Ver
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Aradığınızı Bulun, Satıcılar Size Gelsin
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            İhtiyacınızı ilan edin, en iyi teklifleri alın
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              İlan Ara ve Filtrele
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <Input
                  placeholder="Ne arıyorsunuz?"
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
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Şehir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şehirler</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{listings.length}</p>
              <p className="text-sm text-muted-foreground">Aktif İlan</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{new Set(listings.map(l => l.city)).size}</p>
              <p className="text-sm text-muted-foreground">Şehir</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{categories.length}</p>
              <p className="text-sm text-muted-foreground">Kategori</p>
            </CardContent>
          </Card>
        </div>

        {/* Listings */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">
              Aktif İlanlar ({filteredListings.length})
            </h3>
            <Button onClick={() => navigate('/create-listing')}>
              <Plus className="h-4 w-4 mr-2" />
              İlan Ver
            </Button>
          </div>

          {filteredListings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">İlan bulunamadı</h3>
                <p className="text-muted-foreground mb-4">
                  Arama kriterlerinize uygun ilan bulunamadı. Filtreleri değiştirmeyi deneyin.
                </p>
                <Button onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedCity('all');
                  setSelectedCondition('all');
                }}>
                  Filtreleri Temizle
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}