import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Settings,
  Save,
  RefreshCw
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import { formatPrice } from '@/utils/formatPrice';

interface CommissionStats {
  totalUsersWithCommission: number;
  totalEarned: number;
  totalWithdrawn: number;
  totalEarnedTransactions: number;
  totalWithdrawnTransactions: number;
}

interface CommissionSettings {
  listingOwnerRate: number;
  sellerRate: number;
  enabled: boolean;
}

export default function AdminCommission() {
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [settings, setSettings] = useState<CommissionSettings>({
    listingOwnerRate: 5,
    sellerRate: 5,
    enabled: true
  });
  const [newSettings, setNewSettings] = useState<CommissionSettings>({
    listingOwnerRate: 5,
    sellerRate: 5,
    enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load commission statistics
      const statsResponse = await fetch('/api/admin/commission/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mysql-auth-token')}`
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load current commission settings
      const settingsResponse = await fetch('/api/commission/settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        console.log('📊 Settings response:', settingsData);
        
        // Backend returns { success, settings: { listingOwnerRate, sellerRate, enabled } }
        const settings = settingsData.settings || settingsData;
        const currentSettings = {
          listingOwnerRate: settings.listingOwnerRate || 5,
          sellerRate: settings.sellerRate || 5,
          enabled: settings.enabled !== false
        };
        console.log('⚙️ Parsed settings:', currentSettings);
        setSettings(currentSettings);
        setNewSettings(currentSettings);
      }
    } catch (error) {
      console.error('Error loading commission data:', error);
      toast.error('Komisyon verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    // Validation
    if (newSettings.listingOwnerRate < 0 || newSettings.listingOwnerRate > 100) {
      toast.error('İlan sahibi oranı 0-100 arasında olmalıdır');
      return;
    }
    if (newSettings.sellerRate < 0 || newSettings.sellerRate > 100) {
      toast.error('Satıcı oranı 0-100 arasında olmalıdır');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/commission/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mysql-auth-token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listingOwnerRate: newSettings.listingOwnerRate,
          sellerRate: newSettings.sellerRate
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSettings(newSettings);
        toast.success('Komisyon oranları başarıyla güncellendi');
        loadData(); // Reload stats
      } else {
        toast.error(result.message || 'Ayarlar güncellenemedi');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Ayarlar kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setNewSettings(settings);
    toast.info('Değişiklikler geri alındı');
  };

  const hasChanges = 
    newSettings.listingOwnerRate !== settings.listingOwnerRate ||
    newSettings.sellerRate !== settings.sellerRate;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Komisyon Yönetimi</h1>
          <p className="text-gray-600 mt-2">
            Komisyon oranlarını yönetin ve istatistikleri görüntüleyin
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Komisyon Kazanan Kullanıcılar
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsersWithCommission || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Aktif kullanıcı</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Toplam Kazanılan Komisyon
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(stats?.totalEarned || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.totalEarnedTransactions || 0} işlem
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Alışverişte Kullanılan
              </CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatPrice(stats?.totalWithdrawn || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.totalWithdrawnTransactions || 0} işlem
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Platformda Kalan Bakiye
              </CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatPrice((stats?.totalEarned || 0) - (stats?.totalWithdrawn || 0))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Kullanılabilir bakiye</p>
            </CardContent>
          </Card>
        </div>

        {/* Commission Settings */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Komisyon Oranları
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Platform komisyon oranlarını buradan güncelleyebilirsiniz
                </p>
              </div>
              {hasChanges && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                  Kaydedilmemiş değişiklikler
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Active Rates Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Aktif Oranlar
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-700 mb-1">İlan Sahibi Komisyonu</p>
                  <p className="text-2xl font-bold text-blue-900">{settings.listingOwnerRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700 mb-1">Satıcı Komisyonu</p>
                  <p className="text-2xl font-bold text-blue-900">{settings.sellerRate}%</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Settings Form */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Yeni Oranları Belirleyin</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Listing Owner Rate */}
                <div className="space-y-2">
                  <Label htmlFor="listingOwnerRate">
                    İlan Sahibi Komisyon Oranı (%)
                  </Label>
                  <Input
                    id="listingOwnerRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newSettings.listingOwnerRate}
                    onChange={(e) => setNewSettings({
                      ...newSettings,
                      listingOwnerRate: parseFloat(e.target.value) || 0
                    })}
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500">
                    İlan sahibinin, kendi ilanındaki tekliflerin başkaları tarafından satın alınması durumunda kazanacağı komisyon oranı
                  </p>
                  {newSettings.listingOwnerRate !== settings.listingOwnerRate && (
                    <p className="text-xs text-orange-600 font-medium">
                      Değişiklik: {settings.listingOwnerRate}% → {newSettings.listingOwnerRate}%
                    </p>
                  )}
                </div>

                {/* Seller Rate */}
                <div className="space-y-2">
                  <Label htmlFor="sellerRate">
                    Satıcı Komisyon Oranı (%)
                  </Label>
                  <Input
                    id="sellerRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newSettings.sellerRate}
                    onChange={(e) => setNewSettings({
                      ...newSettings,
                      sellerRate: parseFloat(e.target.value) || 0
                    })}
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500">
                    Teklif sahibinin, kendi teklifinin başkaları tarafından satın alınması durumunda kazanacağı komisyon oranı
                  </p>
                  {newSettings.sellerRate !== settings.sellerRate && (
                    <p className="text-xs text-orange-600 font-medium">
                      Değişiklik: {settings.sellerRate}% → {newSettings.sellerRate}%
                    </p>
                  )}
                </div>
              </div>

              {/* Example Calculation */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Örnek Hesaplama</h4>
                <p className="text-sm text-gray-600 mb-2">
                  50.000 TL'lik bir teklif satın alındığında:
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">İlan sahibi kazancı:</span>
                    <span className="font-semibold text-green-600">
                      {formatPrice(50000 * (newSettings.listingOwnerRate / 100))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Satıcı kazancı:</span>
                    <span className="font-semibold text-green-600">
                      {formatPrice(50000 * (newSettings.sellerRate / 100))}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Toplam komisyon:</span>
                    <span className="font-bold text-blue-600">
                      {formatPrice(50000 * ((newSettings.listingOwnerRate + newSettings.sellerRate) / 100))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Important Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ Önemli:</strong> Komisyon oranı değişiklikleri sadece yeni siparişler için geçerli olacaktır. 
                  Mevcut siparişlerin komisyon oranları değişmeyecektir.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasChanges || saving}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  İptal
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={!hasChanges || saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Kaydet
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Komisyon Sistemi Hakkında</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-2">
              <div className="text-green-600 font-bold">✓</div>
              <p>
                <strong>İlan Sahibi Komisyonu:</strong> Bir kullanıcı kendi ilanına gelen tekliflerden birini başka bir kullanıcı satın aldığında kazanır.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="text-green-600 font-bold">✓</div>
              <p>
                <strong>Satıcı Komisyonu:</strong> Bir kullanıcının verdiği teklif başka bir kullanıcı tarafından satın alındığında kazanır.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="text-blue-600 font-bold">ℹ</div>
              <p>
                <strong>Kendi Alımları:</strong> Kullanıcılar kendi ilanlarındaki kendi tekliflerini satın aldıklarında komisyon kazanmazlar.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="text-purple-600 font-bold">💰</div>
              <p>
                <strong>Bakiye Kullanımı:</strong> Kazanılan komisyonlar kullanıcıların bakiyesine eklenir ve sonraki alışverişlerinde kullanabilirler. Para çekme özelliği yoktur.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
