import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Plus, X, CheckCircle, Clock, ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { categories, cities, CATEGORY_GROUPS } from '@/lib/uiUtils';
import { useAuth } from '@/hooks/use-auth-mysql';
import { mysqlAPI, getImageUrl } from '@/lib/mysql-api';
import AuthModal from '@/components/AuthModal-mysql';
import { toast } from 'sonner';

interface CreateListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function CreateListingModal({ open, onOpenChange, onSuccess }: CreateListingModalProps) {
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTitles, setAiTitles] = useState<string[]>([]);
  const [aiDescs, setAiDescs] = useState<string[]>([]);
  const [showAiTitles, setShowAiTitles] = useState(false);
  const [showAiDescs, setShowAiDescs] = useState(false);
  const [categoryDetecting, setCategoryDetecting] = useState(false);
  const [autoDetectedCategory, setAutoDetectedCategory] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    city: '',
    condition: 'any',
    deliveryType: 'both',
    budgetMax: '',
    maskOwnerName: false
  });

  // Reset form when modal closes
  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      city: '',
      condition: 'any',
      deliveryType: 'both',
      budgetMax: '',
      maskOwnerName: false
    });
    setUploadedImages([]);
    setCurrentStep(1);
    setAiTitles([]);
    setAiDescs([]);
    setShowAiTitles(false);
    setShowAiDescs(false);
    setCategoryDetecting(false);
    setAutoDetectedCategory('');
    onOpenChange(false);
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep < totalSteps) {
      // Step 1'den geçerken AI kategori tespiti başlat (non-blocking)
      if (currentStep === 1 && uploadedImages.length > 0) {
        detectCategoryFromImages(uploadedImages);
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Validate current step
  const canProceed = () => {
    switch (currentStep) {
      case 1: // Ürün Resimleri
        return uploadedImages.length > 0;
      case 2: // Kategori & Başlık
        return !!(formData.title && formData.category);
      case 3: // Detaylar
        // Şehir sadece elden teslim veya fark etmez seçiliyse zorunlu
        const cityRequired = formData.deliveryType === 'pickup' || formData.deliveryType === 'both';
        return !!(formData.budgetMax && parseFloat(formData.budgetMax) > 0 && (!cityRequired || formData.city));
      case 4: // Özet
        return true;
      default:
        return false;
    }
  };

  // Handle file upload
  const detectCategoryFromImages = async (imageUrls: string[]) => {
    if (imageUrls.length === 0) return;
    try {
      setCategoryDetecting(true);
      const response = await mysqlAPI.post('/ai/detect-category', { imageUrls });
      if (response.success && response.category) {
        setFormData(prev => ({ ...prev, category: response.category }));
        setAutoDetectedCategory(response.category);
        toast.success(`🤖 Kategori otomatik tespit edildi: ${response.category}`);
      }
    } catch {
      // sessiz hata — kullanıcı manuel seçer
    } finally {
      setCategoryDetecting(false);
    }
  };

  const handleImageUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    try {
      setIsLoading(true);
      console.log('🔄 Starting image upload...', files.length, 'files');
      
      // Check if user is authenticated
      if (!currentUser) {
        toast.error('Resim yüklemek için giriş yapmalısınız');
        setIsAuthModalOpen(true);
        return;
      }

      const response = await mysqlAPI.uploadListingImages(files);
      console.log('📤 Upload response:', response);
      
      if (response.success) {
        const newUrls = response.data.imageUrls as string[];
        setUploadedImages(prev => [...prev, ...newUrls]);
        toast.success('Resimler başarıyla yüklendi!');
      } else {
        console.error('❌ Upload failed:', response.error);
        toast.error('Resim yükleme hatası: ' + response.error);
      }
    } catch (error) {
      console.error('💥 Image upload error:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast.error('Sunucu ile bağlantı kurulamadı. Backend çalışıyor mu?');
      } else {
        toast.error('Resim yükleme sırasında hata oluştu: ' + error.message);
      }
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
    const cityRequired = formData.deliveryType === 'pickup' || formData.deliveryType === 'both';
    if (!formData.title || !formData.category || !formData.budgetMax || (cityRequired && !formData.city)) {
      toast.error('Lütfen tüm gerekli alanları doldurun');
      return;
    }

    if (uploadedImages.length === 0) {
      toast.error('En az 1 resim yüklemeniz gerekiyor');
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
        city: formData.deliveryType === 'shipping' ? '' : (formData.city || ''), // Sadece kargo ise şehir boş
        condition: formData.condition,
        deliveryType: formData.deliveryType,
        budgetMax: parseFloat(formData.budgetMax),
        offersPublic: true,
        offersPurchasable: true,
        maskOwnerName: formData.maskOwnerName,
        images: uploadedImages
      };

      console.log('📤 Sending listing data:', listingData);
      const response = await mysqlAPI.createListing(listingData);
      console.log('📥 Server response:', response);

      if (response.success) {
        // Form'u temizle ve modal'ı kapat
        handleClose();
        
        // Başarı dialog'unu göster
        setShowSuccessDialog(true);
        
        // Callback'i çağır
        onSuccess?.();
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
    setIsAuthModalOpen(false);
  };

  // AI: başlık + açıklama önerileri al
  const getAiSuggestions = async (type: 'titles' | 'descriptions') => {
    if (!currentUser) { setIsAuthModalOpen(true); return; }
    setAiLoading(true);
    try {
      const token = localStorage.getItem('mysql-auth-token');
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          category: formData.category,
          title: formData.title,
          imageUrls: uploadedImages,
          condition: formData.condition,
          deliveryType: formData.deliveryType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (type === 'titles') {
          setAiTitles(data.titles ?? []);
          setShowAiTitles(true);
          setShowAiDescs(false);
        } else {
          setAiDescs(data.descriptions ?? []);
          setShowAiDescs(true);
          setShowAiTitles(false);
        }
      } else {
        toast.error(data.error || 'AI önerisi alınamadı');
      }
    } catch {
      toast.error('AI servisine bağlanılamadı');
    } finally {
      setAiLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  // Step 1: Görseller + Ürün Durumu + Teslimat Şekli
  const renderStep1 = () => (
    <div className="space-y-5">
      {/* Görseller */}
      <div>
        <Label>Ürün Resimleri * (En az 1, en fazla 5)</Label>
        <div className="mt-2">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
            className="hidden"
            id="image-upload"
            disabled={uploadedImages.length >= 5}
          />
          <label
            htmlFor="image-upload"
            className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              uploadedImages.length >= 5
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-gray-400 hover:border-orange-500 hover:bg-orange-50'
            }`}
          >
            <div className="text-center">
              <Plus className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                {uploadedImages.length >= 5 ? 'Maksimum 5 resim' : 'Resim yüklemek için tıklayın'}
              </p>
            </div>
          </label>
        </div>
      </div>

      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {uploadedImages.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={getImageUrl(url)}
                alt={`Upload ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadedImages.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          Henüz resim yüklemediniz. En az 1 resim yüklemeniz gerekmektedir.
        </p>
      )}

      {/* Ürün Durumu */}
      <div>
        <Label className="text-sm font-medium">Ürün Durumu</Label>
        <RadioGroup
          value={formData.condition}
          onValueChange={(value) => setFormData({...formData, condition: value})}
          className="flex flex-row gap-4 mt-2"
        >
          <div className="flex items-center space-x-1.5">
            <RadioGroupItem value="any" id="cond-any" />
            <Label htmlFor="cond-any" className="font-normal cursor-pointer">Fark Etmez</Label>
          </div>
          <div className="flex items-center space-x-1.5">
            <RadioGroupItem value="new" id="cond-new" />
            <Label htmlFor="cond-new" className="font-normal cursor-pointer">Sıfır</Label>
          </div>
          <div className="flex items-center space-x-1.5">
            <RadioGroupItem value="used" id="cond-used" />
            <Label htmlFor="cond-used" className="font-normal cursor-pointer">İkinci El</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Teslimat Tercihi */}
      <div>
        <Label className="text-sm font-medium">Teslimat Tercihi *</Label>
        <RadioGroup
          value={formData.deliveryType}
          onValueChange={(value) => {
            const newCity = value === 'shipping' ? '' : formData.city;
            setFormData({...formData, deliveryType: value, city: newCity});
          }}
          className="flex flex-row gap-4 mt-2"
        >
          <div className="flex items-center space-x-1.5">
            <RadioGroupItem value="both" id="del-both" />
            <Label htmlFor="del-both" className="font-normal cursor-pointer">Fark Etmez</Label>
          </div>
          <div className="flex items-center space-x-1.5">
            <RadioGroupItem value="shipping" id="del-shipping" />
            <Label htmlFor="del-shipping" className="font-normal cursor-pointer">Kargo</Label>
          </div>
          <div className="flex items-center space-x-1.5">
            <RadioGroupItem value="pickup" id="del-pickup" />
            <Label htmlFor="del-pickup" className="font-normal cursor-pointer">Elden Teslim</Label>
          </div>
        </RadioGroup>
      </div>

      {uploadedImages.length > 0 && (
        <p className="text-xs text-purple-600 flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> İleri'ye basınca AI kategoriyi otomatik belirleyecek
        </p>
      )}
    </div>
  );

  // Step 2: Kategori & Başlık (AI önerili)
  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="category">Kategori *</Label>
          {categoryDetecting && (
            <span className="flex items-center gap-1 text-xs text-purple-600">
              <Loader2 className="h-3 w-3 animate-spin" /> AI kategori tespit ediyor...
            </span>
          )}
          {!categoryDetecting && autoDetectedCategory && formData.category === autoDetectedCategory && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Sparkles className="h-3 w-3" /> AI otomatik belirledi
            </span>
          )}
        </div>
        <Select
          value={formData.category}
          onValueChange={(value) => { setFormData({...formData, category: value}); setShowAiTitles(false); }}
        >
          <SelectTrigger>
            <SelectValue placeholder={categoryDetecting ? 'AI kategori belirleniyor...' : 'Kategori seçin'} />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_GROUPS.map((group) => (
              <SelectGroup key={group.group}>
                <SelectLabel className="font-bold text-xs text-muted-foreground uppercase tracking-wide">{group.group}</SelectLabel>
                {group.subcategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="title">Ne arıyorsunuz? *</Label>
          <button
            type="button"
            onClick={() => getAiSuggestions('titles')}
            disabled={aiLoading}
            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50 transition-colors"
          >
            {aiLoading && !showAiDescs ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Yapay Zeka Öner
          </button>
        </div>
        <Input
          id="title"
          placeholder="Örn: iPhone 15 Pro Max"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Başlığınızın sonuna otomatik "Var mı?" eklenecektir
        </p>

        {/* AI Başlık Önerileri */}
        {showAiTitles && aiTitles.length > 0 && (
          <div className="mt-2 border border-purple-200 rounded-lg bg-purple-50 p-3 space-y-1.5">
            <p className="text-xs font-medium text-purple-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Yapay Zeka Önerileri — birini seçin:
            </p>
            {aiTitles.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setFormData({...formData, title: t}); setShowAiTitles(false); }}
                className="block w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-purple-100 text-purple-900 transition-colors border border-transparent hover:border-purple-300"
              >
                {t}
              </button>
            ))}
            <button type="button" onClick={() => setShowAiTitles(false)} className="text-xs text-gray-400 hover:text-gray-600 mt-1">Kapat</button>
          </div>
        )}
      </div>
    </div>
  );

  // Step 3: Açıklama (AI: görsel+durum+teslimat) + Bütçe + Şehir
  const renderStep3 = () => (
    <div className="space-y-4">
      {/* AI ipucu */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-700 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
        Yapay Zeka açıklamayı resimlerinize, ürün durumuna ({formData.condition === 'any' ? 'Fark Etmez' : formData.condition === 'new' ? 'Sıfır' : 'İkinci El'})
        ve teslimat tercihine ({formData.deliveryType === 'both' ? 'Fark Etmez' : formData.deliveryType === 'shipping' ? 'Kargo' : 'Elden Teslim'}) göre oluşturacak.
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="description">Açıklama</Label>
          <button
            type="button"
            onClick={() => getAiSuggestions('descriptions')}
            disabled={aiLoading}
            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50 transition-colors"
          >
            {aiLoading && !showAiTitles ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Yapay Zeka Öner
          </button>
        </div>
        <Textarea
          id="description"
          placeholder="Aradığınız ürün hakkında detayları yazın..."
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={3}
        />

        {/* AI Açıklama Önerileri */}
        {showAiDescs && aiDescs.length > 0 && (
          <div className="mt-2 border border-purple-200 rounded-lg bg-purple-50 p-3 space-y-1.5">
            <p className="text-xs font-medium text-purple-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Yapay Zeka Önerileri — birini seçin:
            </p>
            {aiDescs.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setFormData({...formData, description: d}); setShowAiDescs(false); }}
                className="block w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-purple-100 text-purple-900 transition-colors border border-transparent hover:border-purple-300"
              >
                {d}
              </button>
            ))}
            <button type="button" onClick={() => setShowAiDescs(false)} className="text-xs text-gray-400 hover:text-gray-600 mt-1">Kapat</button>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="budgetMax">Maksimum Bütçe (₺) *</Label>
        <Input
          id="budgetMax"
          type="number"
          placeholder="0"
          value={formData.budgetMax}
          onChange={(e) => setFormData({...formData, budgetMax: e.target.value})}
          required
        />
      </div>

      {/* Şehir - Sadece elden teslim veya fark etmez seçiliyse göster */}
      {(formData.deliveryType === 'pickup' || formData.deliveryType === 'both') && (
        <div>
          <Label htmlFor="city">Şehir *</Label>
          <Select
            value={formData.city}
            onValueChange={(value) => setFormData({...formData, city: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Şehir seçin" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  // Step 4: Özet
  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="font-semibold text-orange-900 mb-3">İlan Özeti</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Başlık:</span>
            <span className="font-medium">{formData.title} Var mı?</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Kategori:</span>
            <span className="font-medium">{formData.category}</span>
          </div>
          {/* Şehir sadece kargo değilse göster */}
          {formData.deliveryType !== 'shipping' && formData.city && (
            <div className="flex justify-between">
              <span className="text-gray-600">Şehir:</span>
              <span className="font-medium">{formData.city}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Bütçe:</span>
            <span className="font-medium text-green-600">
              ₺{parseFloat(formData.budgetMax).toLocaleString('tr-TR')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Durum:</span>
            <span className="font-medium">
              {formData.condition === 'any' ? 'Fark Etmez' : formData.condition === 'new' ? 'Sıfır' : 'İkinci El'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Teslimat:</span>
            <span className="font-medium">
              {formData.deliveryType === 'both' ? 'Fark Etmez' : formData.deliveryType === 'shipping' ? 'Kargo' : 'Elden Teslim'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Resim Sayısı:</span>
            <span className="font-medium">{uploadedImages.length} adet</span>
          </div>
        </div>
      </div>

      {formData.description && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Açıklama:</h4>
          <p className="text-sm text-gray-700">{formData.description}</p>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          ℹ️ İlanınız admin onayından sonra yayına alınacaktır. Onaylandığında size e-posta ile bildirim gönderilecektir.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">İlan Ver - Adım {currentStep}/{totalSteps}</DialogTitle>
            <div className="mt-2">
              <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
            </div>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="py-4">
              {renderStepContent()}
            </div>
          </ScrollArea>

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Geri
              </Button>
            )}
            
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex-1"
              >
                İleri
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !canProceed()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'İlan Oluşturuluyor...' : 'İlan Ver'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Success Dialog - Onay Bekliyor */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
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

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left">
                <p className="text-orange-800 font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Sonraki Adımlar:
                </p>
                <ul className="text-orange-700 text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Yönetici ekibimiz ilanınızı en kısa sürede inceleyecektir</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Onaylandığında size e-posta bildirimi gönderilecektir</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>İlan onaylandıktan sonra satıcılar teklif göndermeye başlayabilir</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
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
              onClick={() => setShowSuccessDialog(false)}
              className="w-full sm:w-auto px-8"
            >
              Anladım
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}