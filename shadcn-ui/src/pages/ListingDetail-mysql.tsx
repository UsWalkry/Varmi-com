import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Clock, Package, MessageCircle } from 'lucide-react';
import { mysqlAPI } from '@/lib/mysql-api';
import { useAuth } from '@/hooks/use-auth-mysql';
import Header from '@/components/Header';
import CreateListingModal from '@/components/CreateListingModal';
import { toast } from 'sonner';
import { formatPrice, getTimeAgo } from '@/lib/uiUtils';

export default function ListingDetailMySQL() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateListingModalOpen, setIsCreateListingModalOpen] = useState(false);

  useEffect(() => {
    const loadListing = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      try {
        setIsLoading(true);
        console.log('🔍 Loading listing:', id);
        const response = await mysqlAPI.getListingById(id);
        console.log('📥 Listing response:', response);
        
        if (!response.success || !response.listing) {
          toast.error('İlan bulunamadı');
          navigate('/');
          return;
        }
        
        setListing(response.listing);
      } catch (error) {
        console.error('❌ Listing load error:', error);
        toast.error('İlan yüklenirken hata oluştu');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadListing();
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>İlan yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">İlan bulunamadı</h3>
              <p className="text-muted-foreground mb-4">
                Aradığınız ilan mevcut değil veya kaldırılmış olabilir.
              </p>
              <Button onClick={() => navigate('/')}>
                Ana Sayfaya Dön
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />
      
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri Dön
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Listing Header */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{listing.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {listing.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {getTimeAgo(listing.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(listing.price)} {listing.currency}
                    </div>
                    <div className="text-sm text-muted-foreground">Maksimum Bütçe</div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Açıklama</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {listing.description || 'Açıklama bulunmuyor.'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Seller Info */}
            <Card>
              <CardHeader>
                <CardTitle>İlan Sahibi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {listing.seller?.firstName?.[0] || 'U'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {listing.seller?.firstName} {listing.seller?.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Üye
                    </div>
                  </div>
                </div>
                
                {currentUser ? (
                  <Button className="w-full" disabled>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Mesaj Gönder
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    Mesaj göndermek için giriş yapın
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Listing Details */}
            <Card>
              <CardHeader>
                <CardTitle>İlan Detayları</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durum:</span>
                  <Badge variant="outline">{listing.condition || 'Belirtilmemiş'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">İlan Tarihi:</span>
                  <span className="text-sm">{getTimeAgo(listing.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Listing Modal */}
      <CreateListingModal
        open={isCreateListingModalOpen}
        onOpenChange={setIsCreateListingModalOpen}
      />
    </div>
  );
}