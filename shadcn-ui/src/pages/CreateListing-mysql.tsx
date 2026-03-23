import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Plus, X, CheckCircle, Clock } from 'lucide-react';
import { categories, cities } from '@/lib/uiUtils';
import { useAuth } from '@/hooks/use-auth-mysql';
import { mysqlAPI } from '@/lib/mysql-api';
import AuthModal from '@/components/AuthModal-mysql';
import { toast } from 'sonner';

export default function CreateListing() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    city: '',
    condition: 'any',
    deliveryType: 'both',
    budgetMax: ''
  });

  // Handle file upload
  const handleImageUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    try {
      setIsLoading(true);
      const response = await mysqlAPI.uploadListingImages(files);
      
      if (response.success) {
        setUploadedImages(prev => [...prev, ...response.data.imageUrls]);
        toast.success('Resimler başarıyla yüklendi!');
      } else {
        toast.error('Resim yükleme hatası: ' + response.error);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Resim yükleme sırasında hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove uploaded image
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    // Validation
    if (!formData.title || !formData.category || !formData.city || !formData.budgetMax) {
      toast.error('Lütfen tüm gerekli alanları doldurun');
      return;
    }

    try {
      setIsLoading(true);

      // Başlık sonuna "Var mı?" ekle
      const withSuffix = (() => {
        const base = formData.title.trim();
        const lower = base.toLowerCase();
        const suffix = ' var mı?';
        if (lower.endsWith(suffix)) return base;
        const cleaned = base.replace(/[\s?]+$/g, '');
        return cleaned + ' Var mı?';
      })();

      const listingData = {
        title: withSuffix,
        description: formData.description,
        category: formData.category,
        city: formData.city,
        condition: formData.condition,
        deliveryType: formData.deliveryType,
        budgetMax: parseFloat(formData.budgetMax),
        offersPublic: true,
        offersPurchasable: true,
        images: uploadedImages
      };

      const response = await mysqlAPI.createListing(listingData);

      if (response.success) {
        // Başarı dialog'unu göster
        setShowSuccessDialog(true);
      } else {
        toast.error('İlan oluşturulamadı: ' + response.error);
      }
    } catch (error) {
      console.error('Create listing error:', error);
      toast.error('İlan oluşturma sırasında hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    console.log('Auth success');
    setIsAuthModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold">İlan Ver</h1>
            </div>
            {currentUser && (
              <div className="text-sm text-gray-500">
                Hoş geldin, {currentUser.firstName || currentUser.email}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Başlık */}
          <Card>
            <CardHeader>
              <CardTitle>İlan Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Ne arıyorsunuz?</Label>
                <Input
                  id="title"
                  placeholder="Örn: iPhone 15 Pro Max"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Başlığınızın sonuna otomatik "Var mı?" eklenecektir
                </p>
              </div>

              <div>
                <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
                <Textarea
                  id="description"
                  placeholder="Aradığınız ürün hakkında detayları yazın..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Kategori</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Şehir</Label>
                  <Select value={formData.city} onValueChange={(value) => setFormData({...formData, city: value})}>
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

              <div>
                <Label htmlFor="budgetMax">Maksimum Bütçe (TL)</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  min="1"
                  placeholder="0"
                  value={formData.budgetMax}
                  onChange={(e) => setFormData({...formData, budgetMax: e.target.value})}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Tercihler */}
          <Card>
            <CardHeader>
              <CardTitle>Tercihler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-base font-medium">Ürün Durumu</Label>
                <RadioGroup 
                  value={formData.condition} 
                  onValueChange={(value) => setFormData({...formData, condition: value})}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new">Sıfır</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="used" id="used" />
                    <Label htmlFor="used">İkinci el</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="any" id="any" />
                    <Label htmlFor="any">Fark etmez</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-medium">Teslimat Tercihi</Label>
                <RadioGroup 
                  value={formData.deliveryType} 
                  onValueChange={(value) => setFormData({...formData, deliveryType: value})}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shipping" id="shipping" />
                    <Label htmlFor="shipping">Kargo ile</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup">Elden teslim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both">Her ikisi</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Resim Yükleme */}
          <Card>
            <CardHeader>
              <CardTitle>Resimler (Opsiyonel)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="images">Aradığınız ürünün örnek resimlerini yükleyebilirsiniz</Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImageUpload(e.target.files);
                    }
                  }}
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maksimum 5 resim, her biri 5MB'dan küçük olmalı
                </p>
              </div>

              {/* Yüklenen resimler */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {uploadedImages.map((imageUrl, index) => (
                    <div key={index} className="relative">
                      <img
                        src={imageUrl.startsWith('/uploads/') ? imageUrl : `/uploads/images/${imageUrl}`}
                        alt={`Yüklenen resim ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
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
              {isLoading ? 'İlan Oluşturuluyor...' : 'İlan Ver'}
            </Button>
          </div>
        </form>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Success Dialog - Onay Bekliyor */}
      <Dialog open={showSuccessDialog} onOpenChange={(open) => {
        setShowSuccessDialog(open);
        if (!open) {
          navigate('/dashboard');
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 animate-ping">
                  <Clock className="h-16 w-16 text-yellow-500 opacity-20" />
                </div>
                <Clock className="h-16 w-16 text-yellow-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              İlanınız Onay Bekliyor
            </DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium mb-2">
                  ⏳ İlanınız başarıyla oluşturuldu!
                </p>
                <p className="text-yellow-700 text-sm">
                  İlanınız yönetici kontrolünden geçtikten sonra yayına alınacaktır.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-blue-800 font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Sonraki Adımlar:
                </p>
                <ul className="text-blue-700 text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Yönetici ekibimiz ilanınızı en kısa sürede inceleyecektir</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Onaylandığında size e-posta bildirimi gönderilecektir</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>İlan onaylandıktan sonra satıcılar teklif göndermeye başlayabilir</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>İlanınızın durumunu "Panelim" sayfasından takip edebilirsiniz</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-gray-600 text-xs">
                  💡 İpucu: Onay süreci genellikle birkaç saat içinde tamamlanır.
                  İlanınızın durumunu "Panelim" sayfasındaki "İlanlarım" bölümünden takip edebilirsiniz.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center mt-4">
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                navigate('/dashboard');
              }}
              className="w-full sm:w-auto px-8"
            >
              Dashboard'a Git
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}