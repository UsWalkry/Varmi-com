import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, TrendingUp, Users, Package, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ListingCard from '@/components/ListingCard';
import { Listing, DataManager, categories, cities } from '@/lib/mockData';

export default function Index() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    city: 'all',
    budgetMax: '',
    condition: 'all'
  });

  useEffect(() => {
    loadListings();
  }, [searchQuery, filters]);

  const loadListings = () => {
    const results = DataManager.searchListings(searchQuery, {
      category: filters.category !== 'all' ? filters.category : undefined,
      city: filters.city !== 'all' ? filters.city : undefined,
      budgetMax: filters.budgetMax ? parseFloat(filters.budgetMax) : undefined,
      condition: filters.condition !== 'all' ? filters.condition : undefined
    });
    setListings(results);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadListings();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      category: 'all',
      city: 'all',
      budgetMax: '',
      condition: 'all'
    });
  };

  const stats = {
    totalListings: DataManager.getListings().length,
    activeListings: DataManager.getListings().filter(l => l.status === 'active').length,
    totalOffers: DataManager.getOffers().length,
    avgOffersPerListing: Math.round(DataManager.getOffers().length / Math.max(DataManager.getListings().length, 1) * 10) / 10
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Var mı?
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                <Users className="h-4 w-4 mr-2" />
                Panelim
              </Button>
              <Button onClick={() => navigate('/create-listing')}>
                <Plus className="h-4 w-4 mr-2" />
                İlan Ver
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            İhtiyacınızı İlan Edin, <span className="text-blue-600">Teklifleri Karşılaştırın</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Geleneksel pazaryerinin tersi! Siz ne aradığınızı söyleyin, satıcılar size teklif versin. 
            En iyi fiyat ve koşulları siz belirleyin.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.activeListings}</p>
                <p className="text-sm text-muted-foreground">Aktif İlan</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Package className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.totalOffers}</p>
                <p className="text-sm text-muted-foreground">Toplam Teklif</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.avgOffersPerListing}</p>
                <p className="text-sm text-muted-foreground">Ort. Teklif/İlan</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-muted-foreground">Saat İçinde</p>
              </CardContent>
            </Card>
          </div>
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
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Ne arıyorsunuz? (örn: iPhone, saç kurutma makinesi, laptop)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  Ara
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Kategoriler</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.city} onValueChange={(value) => setFilters({ ...filters, city: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Şehir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Şehirler</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="Maksimum bütçe (TL)"
                  value={filters.budgetMax}
                  onChange={(e) => setFilters({ ...filters, budgetMax: e.target.value })}
                />

                <Select value={filters.condition} onValueChange={(value) => setFilters({ ...filters, condition: value })}>
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

              {(searchQuery || filters.category !== 'all' || filters.city !== 'all' || filters.budgetMax || filters.condition !== 'all') && (
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {searchQuery && <Badge variant="secondary">Arama: "{searchQuery}"</Badge>}
                    {filters.category !== 'all' && <Badge variant="secondary">Kategori: {filters.category}</Badge>}
                    {filters.city !== 'all' && <Badge variant="secondary">Şehir: {filters.city}</Badge>}
                    {filters.budgetMax && <Badge variant="secondary">Max: {DataManager.formatPrice(parseFloat(filters.budgetMax))}</Badge>}
                    {filters.condition !== 'all' && <Badge variant="secondary">Durum: {filters.condition}</Badge>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Filtreleri Temizle
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Listings */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-semibold">
              {searchQuery || Object.values(filters).some(v => v !== 'all' && v !== '') 
                ? `Arama Sonuçları (${listings.length})` 
                : 'Son İlanlar'}
            </h3>
            {listings.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {listings.length} ilan bulundu
              </p>
            )}
          </div>

          {listings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">İlan bulunamadı</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || Object.values(filters).some(v => v !== 'all' && v !== '')
                    ? 'Arama kriterlerinize uygun ilan bulunamadı. Filtreleri değiştirmeyi deneyin.'
                    : 'Henüz hiç ilan yok. İlk ilanı siz verin!'}
                </p>
                <div className="flex gap-2 justify-center">
                  {(searchQuery || Object.values(filters).some(v => v !== 'all' && v !== '')) && (
                    <Button variant="outline" onClick={clearFilters}>
                      Filtreleri Temizle
                    </Button>
                  )}
                  <Button onClick={() => navigate('/create-listing')}>
                    <Plus className="h-4 w-4 mr-2" />
                    İlan Ver
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Hemen İlan Verin!</h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              İhtiyacınızı belirtin, satıcılar size en iyi teklifleri getirsin. 
              Pazarlık yapın, en uygun fiyat ve koşullarda alışveriş yapın.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => navigate('/create-listing')}
            >
              <Plus className="h-5 w-5 mr-2" />
              Ücretsiz İlan Ver
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}