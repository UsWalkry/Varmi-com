import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { mysqlAPI } from '@/lib/mysql-api';
import { Loader2, Store, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface SellerProfile {
  id: string;
  user_id: string;
  store_name: string;
  store_description?: string;
  store_logo_url?: string;
  business_type: 'individual' | 'company';
  tax_office?: string;
  tax_number?: string;
  company_name?: string;
  trade_registry_number?: string;
  mersis_number?: string;
  business_phone?: string;
  business_email?: string;
  business_address?: string;
  business_city?: string;
  business_district?: string;
  business_postal_code?: string;
  bank_name?: string;
  iban?: string;
  account_holder_name?: string;
  documents?: string[];
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejection_reason?: string;
  suspended_reason?: string;
  created_at: string;
  updated_at: string;
}

export default function SellerProfileTab() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [formData, setFormData] = useState({
    store_name: '',
    store_description: '',
    business_type: 'individual' as 'individual' | 'company',
    tax_office: '',
    tax_number: '',
    company_name: '',
    trade_registry_number: '',
    mersis_number: '',
    business_phone: '',
    business_email: '',
    business_address: '',
    business_city: '',
    business_district: '',
    business_postal_code: '',
    bank_name: '',
    iban: '',
    account_holder_name: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await mysqlAPI.getMySellerProfile();
      
      if (response.success && response.data) {
        setProfile(response.data);
        // Formu mevcut verilerle doldur
        setFormData({
          store_name: response.data.store_name || '',
          store_description: response.data.store_description || '',
          business_type: response.data.business_type || 'individual',
          tax_office: response.data.tax_office || '',
          tax_number: response.data.tax_number || '',
          company_name: response.data.company_name || '',
          trade_registry_number: response.data.trade_registry_number || '',
          mersis_number: response.data.mersis_number || '',
          business_phone: response.data.business_phone || '',
          business_email: response.data.business_email || '',
          business_address: response.data.business_address || '',
          business_city: response.data.business_city || '',
          business_district: response.data.business_district || '',
          business_postal_code: response.data.business_postal_code || '',
          bank_name: response.data.bank_name || '',
          iban: response.data.iban || '',
          account_holder_name: response.data.account_holder_name || '',
        });
      }
    } catch (error) {
      console.error('Satıcı profili yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasyon
    if (!formData.store_name) {
      toast.error('Mağaza adı zorunludur');
      return;
    }

    if (formData.business_type === 'company' && !formData.tax_number) {
      toast.error('Şirketler için vergi numarası zorunludur');
      return;
    }

    try {
      setSubmitting(true);
      const response = await mysqlAPI.createOrUpdateSellerProfile(formData);
      
      if (response.success) {
        toast.success(response.message || 'Satıcı profiliniz kaydedildi ve onay için gönderildi');
        await loadProfile();
      } else {
        toast.error(response.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Satıcı profili kaydedilemedi:', error);
      toast.error('Satıcı profili kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Onaylandı
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Onay Bekliyor
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Reddedildi
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Askıya Alındı
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      {profile && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                <CardTitle>Satıcı Profili Durumu</CardTitle>
              </div>
              {getStatusBadge(profile.approval_status)}
            </div>
          </CardHeader>
          <CardContent>
            {profile.approval_status === 'pending' && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Satıcı profiliniz inceleniyor. Onaylandığında email ile bildirim alacaksınız.
                </AlertDescription>
              </Alert>
            )}
            
            {profile.approval_status === 'approved' && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  Tebrikler! Satıcı profiliniz onaylandı. Artık teklif verebilirsiniz.
                </AlertDescription>
              </Alert>
            )}
            
            {profile.approval_status === 'rejected' && profile.rejection_reason && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Red Nedeni:</strong> {profile.rejection_reason}
                  <br />
                  <span className="text-sm mt-2 inline-block">
                    Eksiklikleri tamamlayıp tekrar gönderebilirsiniz.
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {profile.approval_status === 'suspended' && profile.suspended_reason && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Askıya Alma Nedeni:</strong> {profile.suspended_reason}
                  <br />
                  <span className="text-sm mt-2 inline-block">
                    Lütfen destek ekibi ile iletişime geçin.
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seller Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {profile ? 'Satıcı Profilini Güncelle' : 'Satıcı Profili Oluştur'}
          </CardTitle>
          <CardDescription>
            Teklif verebilmek için satıcı profilinizi oluşturun ve onay alın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mağaza Bilgileri */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Mağaza Bilgileri</h3>
              
              <div>
                <Label htmlFor="store_name">Mağaza Adı *</Label>
                <Input
                  id="store_name"
                  value={formData.store_name}
                  onChange={(e) => handleChange('store_name', e.target.value)}
                  placeholder="Örn: ABC Elektronik"
                  required
                />
              </div>

              <div>
                <Label htmlFor="store_description">Mağaza Açıklaması</Label>
                <Textarea
                  id="store_description"
                  value={formData.store_description}
                  onChange={(e) => handleChange('store_description', e.target.value)}
                  placeholder="Mağazanız hakkında kısa bir açıklama yazın..."
                  rows={4}
                />
              </div>
            </div>

            {/* İşletme Tipi */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">İşletme Bilgileri</h3>
              
              <div>
                <Label htmlFor="business_type">İşletme Tipi *</Label>
                <Select
                  value={formData.business_type}
                  onValueChange={(value) => handleChange('business_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Şahıs Firması</SelectItem>
                    <SelectItem value="company">Şirket</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.business_type === 'company' && (
                <div>
                  <Label htmlFor="company_name">Şirket Adı</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    placeholder="Şirket ünvanı"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tax_office">Vergi Dairesi</Label>
                  <Input
                    id="tax_office"
                    value={formData.tax_office}
                    onChange={(e) => handleChange('tax_office', e.target.value)}
                    placeholder="Vergi dairesi adı"
                  />
                </div>

                <div>
                  <Label htmlFor="tax_number">
                    Vergi Numarası {formData.business_type === 'company' && '*'}
                  </Label>
                  <Input
                    id="tax_number"
                    value={formData.tax_number}
                    onChange={(e) => handleChange('tax_number', e.target.value)}
                    placeholder="10 haneli vergi no"
                    required={formData.business_type === 'company'}
                  />
                </div>
              </div>

              {formData.business_type === 'company' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="trade_registry_number">Ticaret Sicil No</Label>
                    <Input
                      id="trade_registry_number"
                      value={formData.trade_registry_number}
                      onChange={(e) => handleChange('trade_registry_number', e.target.value)}
                      placeholder="Ticaret sicil numarası"
                    />
                  </div>

                  <div>
                    <Label htmlFor="mersis_number">MERSİS No</Label>
                    <Input
                      id="mersis_number"
                      value={formData.mersis_number}
                      onChange={(e) => handleChange('mersis_number', e.target.value)}
                      placeholder="16 haneli MERSİS no"
                      maxLength={16}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* İletişim Bilgileri */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">İletişim Bilgileri</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_phone">İş Telefonu</Label>
                  <Input
                    id="business_phone"
                    type="tel"
                    value={formData.business_phone}
                    onChange={(e) => handleChange('business_phone', e.target.value)}
                    placeholder="(5XX) XXX XX XX"
                  />
                </div>

                <div>
                  <Label htmlFor="business_email">İş E-posta</Label>
                  <Input
                    id="business_email"
                    type="email"
                    value={formData.business_email}
                    onChange={(e) => handleChange('business_email', e.target.value)}
                    placeholder="firma@example.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="business_address">İş Adresi</Label>
                <Textarea
                  id="business_address"
                  value={formData.business_address}
                  onChange={(e) => handleChange('business_address', e.target.value)}
                  placeholder="Tam adres"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="business_city">İl</Label>
                  <Input
                    id="business_city"
                    value={formData.business_city}
                    onChange={(e) => handleChange('business_city', e.target.value)}
                    placeholder="İl"
                  />
                </div>

                <div>
                  <Label htmlFor="business_district">İlçe</Label>
                  <Input
                    id="business_district"
                    value={formData.business_district}
                    onChange={(e) => handleChange('business_district', e.target.value)}
                    placeholder="İlçe"
                  />
                </div>

                <div>
                  <Label htmlFor="business_postal_code">Posta Kodu</Label>
                  <Input
                    id="business_postal_code"
                    value={formData.business_postal_code}
                    onChange={(e) => handleChange('business_postal_code', e.target.value)}
                    placeholder="34XXX"
                  />
                </div>
              </div>
            </div>

            {/* Banka Bilgileri (Opsiyonel) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Banka Bilgileri (Opsiyonel)</h3>
              <p className="text-sm text-muted-foreground">
                Komisyon ödemeleriniz için banka bilgilerinizi ekleyebilirsiniz.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_name">Banka Adı</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => handleChange('bank_name', e.target.value)}
                    placeholder="Banka adı"
                  />
                </div>

                <div>
                  <Label htmlFor="account_holder_name">Hesap Sahibi</Label>
                  <Input
                    id="account_holder_name"
                    value={formData.account_holder_name}
                    onChange={(e) => handleChange('account_holder_name', e.target.value)}
                    placeholder="Ad Soyad / Ünvan"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => handleChange('iban', e.target.value)}
                  placeholder="TR XX XXXX XXXX XXXX XXXX XXXX XX"
                  maxLength={34}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="submit"
                disabled={submitting}
                className="min-w-[150px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  profile ? 'Güncelle ve Onaya Gönder' : 'Kaydet ve Onaya Gönder'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ℹ️ Bilgilendirme</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Satıcı profiliniz oluşturulduktan sonra admin tarafından incelenecektir.</p>
          <p>• Onay süreci genellikle 1-2 iş günü sürmektedir.</p>
          <p>• Satıcı profiliniz onaylandıktan sonra teklif verebilirsiniz.</p>
          <p>• Profil bilgilerinizde değişiklik yaptığınızda tekrar onay gerekebilir.</p>
        </CardContent>
      </Card>
    </div>
  );
}
