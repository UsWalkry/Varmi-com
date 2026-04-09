import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Store, MapPin, Phone, Mail, CheckCircle } from 'lucide-react';
import { mysqlAPI } from '@/lib/mysql-api';

interface SellerProfile {
  id: string;
  user_id: string;
  store_name: string;
  store_description?: string;
  store_logo_url?: string;
  business_type: 'individual' | 'company';
  business_city?: string;
  business_phone?: string;
  business_email?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface StoreStats {
  total_offers: number;
  total_sales: number;
  avg_rating: number;
  rating_count: number;
}

export default function StoreProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchStoreProfile = async () => {
      try {
        setLoading(true);
        
        // Satıcı profili bilgisi al
        const profileRes = await mysqlAPI.getSellerProfile(userId);
        if (profileRes.success && profileRes.profile) {
          setProfile(profileRes.profile);
        }

        // Satıcı istatistiklerini al (offers, sales, ratings)
        // Bu endpoint'ler varsa kullan, yoksa mockla
        try {
          const statsRes = await fetch(`/api/seller-profile/${userId}/stats`);
          if (statsRes.ok) {
            const data = await statsRes.json();
            setStats(data.stats);
          }
        } catch (err) {
          console.log('Stats endpoint not available, using defaults');
          setStats({
            total_offers: 0,
            total_sales: 0,
            avg_rating: 0,
            rating_count: 0
          });
        }
      } catch (error) {
        console.error('Error loading store profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStoreProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Mağaza profili bulunamadı</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Store Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              {/* Store Logo */}
              <div className="flex-shrink-0">
                {profile.store_logo_url ? (
                  <img 
                    src={profile.store_logo_url} 
                    alt={profile.store_name}
                    className="w-24 h-24 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                    <Store className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>

              {/* Store Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{profile.store_name}</h1>
                  {profile.approval_status === 'approved' && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Doğrulanmış
                    </Badge>
                  )}
                </div>

                {profile.store_description && (
                  <p className="text-muted-foreground mb-4">{profile.store_description}</p>
                )}

                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  {profile.business_city && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.business_city}</span>
                    </div>
                  )}
                  {profile.business_phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{profile.business_phone}</span>
                    </div>
                  )}
                  {profile.business_email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{profile.business_email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Store Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Teklif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_offers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Satış</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_sales}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ortalama Puan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{stats.avg_rating.toFixed(1)}</div>
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Değerlendirme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.rating_count}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Business Type */}
        <Card>
          <CardHeader>
            <CardTitle>İşletme Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <span className="text-muted-foreground">İşletme Tipi: </span>
              <Badge variant="outline">
                {profile.business_type === 'company' ? 'Şirket' : 'Bireysel'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
