import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Plus, LogOut } from 'lucide-react';
import { DataManager, categories, cities } from '@/lib/mockData';
import AuthModal from '@/components/AuthModal';
import { toast } from 'sonner';

export default function CreateListing() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(DataManager.getCurrentUser());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budgetMin: '',
    budgetMax: '',
    condition: 'any',
    city: '',
    deliveryType: 'both',
    expiresAt: ''
  });

  // Görseller (data URL'ler)
  const [images, setImages] = useState<string[]>([]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!formData.title || !formData.description || !formData.category || 
        !formData.budgetMin || !formData.budgetMax || !formData.city) {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    // En az 1 görsel zorunlu
    if (images.length === 0) {
      toast.error('İlan için en az 1 görsel yüklemelisiniz');
      return;
    }

    if (parseInt(formData.budgetMin) >= parseInt(formData.budgetMax)) {
      toast.error('Maksimum bütçe minimum bütçeden büyük olmalıdır');
      return;
    }

    // Tarih kuralları: bugün >= min, max = bugün + 30 gün
    const todayStr = new Date().toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxStr = maxDate.toISOString().split('T')[0];

    if (formData.expiresAt) {
      if (formData.expiresAt < todayStr) {
        toast.error('İlan bitiş tarihi bugünden önce olamaz');
        return;
      }
      if (formData.expiresAt > maxStr) {
        toast.error('İlan bitiş tarihi en fazla 30 gün sonrası olabilir');
        return;
      }
    }

    setIsLoading(true);

    try {
      const expiresAt = formData.expiresAt || 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 gün varsayılan

      const newListing = DataManager.addListing({
        buyerId: currentUser.id,
        buyerName: currentUser.name,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budgetMin: parseInt(formData.budgetMin),
        budgetMax: parseInt(formData.budgetMax),
        condition: formData.condition as 'new' | 'used' | 'any',
        city: formData.city,
        deliveryType: formData.deliveryType as 'shipping' | 'pickup' | 'both',
        status: 'active',
        expiresAt,
        images
      });

      toast.success('İlanınız başarıyla oluşturuldu!');
      navigate(`/listing/${newListing.id}`);
    } catch (error) {
      toast.error('İlan oluşturulurken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Dosya seçiminden görsellere dönüştürme (data URL)
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const MAX_FILE_MB = 2; // LocalStorage taşmaması için 2MB öneri limiti

    const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const toAdd: string[] = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) {
        toast.error(`${f.name}: Sadece görsel dosyaları yükleyebilirsiniz`);
        continue;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${f.name}: Dosya boyutu ${MAX_FILE_MB}MB'den küçük olmalı`);
        continue;
      }
      try {
        const url = await readAsDataUrl(f);
        toAdd.push(url);
      } catch {
        toast.error(`${f.name}: Dosya okunamadı`);
      }
    }
    if (toAdd.length) setImages(prev => [...prev, ...toAdd]);
    // input değerini sıfırla (aynı dosyayı tekrar seçebilmek için)
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAuthSuccess = () => {
    setCurrentUser(DataManager.getCurrentUser());
  };

  const handleLogout = () => {
    DataManager.logoutUser();
    setCurrentUser(null);
    navigate('/');
  };

  // Set default expiry date (30 days from now)
  const defaultExpiryDate = new Date();
  defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30);
  const defaultExpiryString = defaultExpiryDate.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ana Sayfaya Dön
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-blue-600">İlan Ver</h1>
            </div>
            <div className="flex items-center gap-2">
              {currentUser ? (
                <>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Panelim
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Çıkış Yap
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsAuthModalOpen(true)}>
                  Giriş Yap
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Yeni İlan Oluştur
            </CardTitle>
            <p className="text-muted-foreground">
              Aradığınız ürün veya hizmeti detaylı bir şekilde tanımlayın, satıcılar size teklif versin.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Images */}
              <div className="space-y-2">
                <Label>İlan Görselleri (en az 1 adet) *</Label>
                <div className="flex flex-col gap-3">
                  {/* Önizlemeler */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {images.map((src, idx) => (
                        <div key={idx} className="relative group border rounded-md overflow-hidden bg-muted/20">
                          <img src={src} alt={`İlan görseli ${idx+1}`} className="h-28 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition"
                            aria-label="Görseli kaldır"
                          >
                            Kaldır
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFilesSelected(e.target.files)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Sadece görsel dosyaları kabul edilir. Önerilen tek dosya boyutu ≤ 2MB.</p>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">İlan Başlığı *</Label>
                <Input
                  id="title"
                  placeholder="Örn: iPhone 15 Pro Max Aranıyor"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama *</Label>
                <Textarea
                  id="description"
                  placeholder="Aradığınız ürün hakkında detaylı bilgi verin. Marka, model, özellikler, durum vb."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  required
                />
              </div>

              {/* Category and City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Şehir *</Label>
                  <Select value={formData.city} onValueChange={(value) => handleInputChange('city', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Şehir seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(city => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Budget Range */}
              <div className="space-y-2">
                <Label>Bütçe Aralığı (TL) *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budgetMin" className="text-sm">Minimum Bütçe</Label>
                    <Input
                      id="budgetMin"
                      type="number"
                      placeholder="1000"
                      value={formData.budgetMin}
                      onChange={(e) => handleInputChange('budgetMin', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="budgetMax" className="text-sm">Maksimum Bütçe</Label>
                    <Input
                      id="budgetMax"
                      type="number"
                      placeholder="5000"
                      value={formData.budgetMax}
                      onChange={(e) => handleInputChange('budgetMax', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Condition */}
              <div className="space-y-3">
                <Label>Ürün Durumu</Label>
                <RadioGroup
                  value={formData.condition}
                  onValueChange={(value) => handleInputChange('condition', value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new">Sıfır</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="used" id="used" />
                    <Label htmlFor="used">2. El</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="any" id="any" />
                    <Label htmlFor="any">Farketmez</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Delivery Type */}
              <div className="space-y-3">
                <Label>Teslimat Tercihi</Label>
                <RadioGroup
                  value={formData.deliveryType}
                  onValueChange={(value) => handleInputChange('deliveryType', value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shipping" id="shipping" />
                    <Label htmlFor="shipping">Kargo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup">Elden Teslim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both">Her İkisi de Olur</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label htmlFor="expiresAt">İlan Bitiş Tarihi</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt || defaultExpiryString}
                  onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  max={defaultExpiryString}
                />
                <p className="text-sm text-muted-foreground">
                  Boş bırakılırsa 30 gün sonra otomatik olarak kapanır (maksimum +30 gün)
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'İlan Oluşturuluyor...' : 'İlanı Yayınla'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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