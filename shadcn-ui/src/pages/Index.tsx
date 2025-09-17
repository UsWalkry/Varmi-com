import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Clock, TrendingUp, Package, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Listing, DataManager, categories, cities } from '@/lib/mockData';
import Header from '@/components/Header';
import FavoriteButton from '@/components/FavoriteButton';

export default function Index() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [budgetMax, setBudgetMax] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const currentUser = DataManager.getCurrentUser();

  useEffect(() => {
    loadListings();
  }, [searchQuery, selectedCategory, selectedCity, budgetMax, selectedCondition]);

  const loadListings = () => {
    const filters = {
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      city: selectedCity !== 'all' ? selectedCity : undefined,
      budgetMax: budgetMax ? parseInt(budgetMax) : undefined,
      condition: selectedCondition !== 'all' ? selectedCondition : undefined,
    };

    const filteredListings = DataManager.searchListings(searchQuery, filters);
    setListings(filteredListings);
  };

  const handleListingClick = (listingId: string) => {
    navigate(`/listing/${listingId}`);
  };

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
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Aradığın Ürün <span className="text-yellow-300">Var mı?</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            İstediğin ürünü ilan ver, satıcılar sana teklif versin!
          </p>
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
            onClick={() => navigate('/create-listing')}
          >
            Hemen İlan Ver
          </Button>
        </div>
      </section>

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
                  {categories.map(category => (
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
                  {cities.map(city => (
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
              <Button onClick={() => navigate('/create-listing')}>
                İlk İlanı Siz Verin
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(listing => (
              <Card 
                key={listing.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleListingClick(listing.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2 flex-1 mr-2">{listing.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <FavoriteButton 
                        listingId={listing.id}
                        userId={currentUser?.id}
                        size="sm"
                        variant="ghost"
                      />
                      <Badge className="bg-green-100 text-green-800">
                        {listing.status === 'active' ? 'Aktif' : 'Kapalı'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    {listing.description}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Bütçe</span>
                      <span className="font-semibold text-green-600">
                        {DataManager.formatPrice(listing.budgetMin)} - {DataManager.formatPrice(listing.budgetMax)}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{listing.category}</Badge>
                      <Badge variant="outline">{getConditionText(listing.condition)}</Badge>
                      <Badge variant="outline">
                        <Package className="h-3 w-3 mr-1" />
                        {getDeliveryText(listing.deliveryType)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{listing.city}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{DataManager.getTimeAgo(listing.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">İlan sahibi:</span>
                        <span className="font-medium">{listing.buyerName}</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">4.8</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-semibold">{listing.offerCount} teklif</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}