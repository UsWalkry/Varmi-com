import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { Listing, cities } from '@/lib/mockData';
import { CATEGORY_GROUPS } from '@/lib/uiUtils';
import { mysqlAPI, getImageUrl } from '@/lib/mysql-api';
import { useAuth } from '@/hooks/use-auth-mysql';
import Header from '@/components/Header';
import { toast } from 'sonner';

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTitles, setAiTitles] = useState<string[]>([]);
  const [aiDescs, setAiDescs] = useState<string[]>([]);
  const [showAiTitles, setShowAiTitles] = useState(false);
  const [showAiDescs, setShowAiDescs] = useState(false);
  const [categoryDetecting, setCategoryDetecting] = useState(false);
  const [autoDetectedCategory, setAutoDetectedCategory] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    city: '',
    condition: 'any',
    deliveryType: 'both',
    budgetMax: '',
    expiresAt: '',
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxStr = maxDate.toISOString().split('T')[0];

  useEffect(() => {
    const loadListing = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await mysqlAPI.getListingById(id);
        if (!response.success || !response.listing) {
          toast.error('İlan bulunamadı');
          navigate('/');
          return;
        }
        const found = response.listing;
        if (!authUser || authUser.id?.toString() !== found.seller?.id?.toString()) {
          toast.error('Bu ilanı düzenleme yetkiniz yok');
          navigate('/');
          return;
        }
        const mappedListing: Listing = {
          id: found.id,
          title: found.title,
          description: found.description || '',
          budgetMax: found.price || 0,
          category: found.category || 'genel',
          city: found.location || '',
          condition: found.condition || 'any',
          deliveryType: found.deliveryType || 'both',
          buyerId: found.seller?.id || '',
          buyerName: `${found.seller?.firstName || ''} ${found.seller?.lastName || ''}`.trim() || 'Anonim',
          status: 'active',
          createdAt: found.createdAt || '',
          expiresAt: found.expiresAt || '',
          offerCount: 0,
          offersPublic: true,
          offersPurchasable: true,
          images: found.images || [],
          maskOwnerName: found.maskOwnerName || false,
        };
        setListing(mappedListing);
        setUploadedImages(found.images || []);
        setFormData({
          title: found.title,
          description: found.description || '',
          category: found.category || '',
          city: found.location || '',
          condition: found.condition || 'any',
          deliveryType: found.deliveryType || 'both',
          budgetMax: (found.price || 0).toString(),
          expiresAt: found.expiresAt ? new Date(found.expiresAt).toISOString().split('T')[0] : '',
        });
      } catch (error) {
        console.error('❌ Edit listing load error:', error);
        toast.error('İlan yüklenemedi');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    loadListing();
  }, [id, authUser, navigate]);

  const nextStep = () => {
    if (currentStep === 1 && uploadedImages.length > 0 && !autoDetectedCategory) {
      detectCategoryFromImages(uploadedImages);
    }
    if (currentStep < totalSteps) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return uploadedImages.length > 0;
      case 2: return !!(formData.title && formData.category);
      case 3: {
        const cityRequired = formData.deliveryType === 'pickup' || formData.deliveryType === 'both';
        return !!(formData.budgetMax && parseFloat(formData.budgetMax) > 0 && (!cityRequired || formData.city));
      }
      case 4: return true;
      default: return false;
    }
  };

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
      // sessiz hata
    } finally {
      setCategoryDetecting(false);
    }
  };

  const handleImageUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    try {
      setIsLoading(true);
      const response = await mysqlAPI.uploadListingImages(files);
      if (response.success) {
        const newUrls = response.data.imageUrls as string[];
        setUploadedImages(prev => [...prev, ...newUrls]);
        toast.success('Resimler başarıyla yüklendi!');
      } else {
        toast.error('Resim yükleme hatası: ' + response.error);
      }
    } catch {
      toast.error('Resim yükleme sırasında hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const getAiSuggestions = async (type: 'titles' | 'descriptions') => {
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

  const handleSave = async () => {
    if (!listing || !authUser) return;
    try {
      setIsLoading(true);
      const updateData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.budgetMax),
        location: formData.deliveryType === 'shipping' ? '' : (formData.city || ''),
        condition: formData.condition,
        deliveryType: formData.deliveryType,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
        images: uploadedImages,
      };
      const response = await mysqlAPI.updateListing(listing.id, updateData);
      if (response.success) {
        toast.success(response.message || 'İlan başarıyla güncellendi ve admin onayına gönderildi!');
        navigate('/dashboard');
      } else {
        toast.error(response.error || 'İlan güncellenemedi');
      }
    } catch {
      toast.error('İlan güncellenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Adım 1: Görseller + Durum + Teslimat
  const renderStep1 = () => (
    <div className="space-y-5">
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
            disabled={uploadedImages.length >= 5 || isLoading}
          />
          <label
            htmlFor="image-upload"
            className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              uploadedImages.length >= 5 || isLoading
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-gray-400 hover:border-orange-500 hover:bg-orange-50'
            }`}
          >
            <div className="text-center">
              {isLoading ? (
                <Loader2 className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
              ) : (
                <Plus className="mx-auto h-8 w-8 text-gray-400" />
              )}
              <p className="mt-2 text-sm text-gray-600">
                {isLoading ? 'Yükleniyor...' : uploadedImages.length >= 5 ? 'Maksimum 5 resim' : 'Resim eklemek için tıklayın'}
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
                alt={`Resim ${index + 1}`}
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

      <div>
        <Label className="text-sm font-medium">Ürün Durumu</Label>
        <RadioGroup
          value={formData.condition}
          onValueChange={(value) => setFormData({ ...formData, condition: value })}
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

      <div>
        <Label className="text-sm font-medium">Teslimat Tercihi *</Label>
        <RadioGroup
          value={formData.deliveryType}
          onValueChange={(value) => {
            const newCity = value === 'shipping' ? '' : formData.city;
            setFormData({ ...formData, deliveryType: value, city: newCity });
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

  // Adım 2: Kategori & Başlık (AI)
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
          onValueChange={(value) => { setFormData({ ...formData, category: value }); setShowAiTitles(false); }}
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
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">
          Başlığınızın sonuna otomatik "Var mı?" eklenecektir
        </p>

        {showAiTitles && aiTitles.length > 0 && (
          <div className="mt-2 border border-purple-200 rounded-lg bg-purple-50 p-3 space-y-1.5">
            <p className="text-xs font-medium text-purple-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Yapay Zeka Önerileri — birini seçin:
            </p>
            {aiTitles.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setFormData({ ...formData, title: t }); setShowAiTitles(false); }}
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

  // Adım 3: Açıklama (AI) + Bütçe + Şehir + Tarih + Ad Gizleme
  const renderStep3 = () => (
    <div className="space-y-4">
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
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
        {showAiDescs && aiDescs.length > 0 && (
          <div className="mt-2 border border-purple-200 rounded-lg bg-purple-50 p-3 space-y-1.5">
            <p className="text-xs font-medium text-purple-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Yapay Zeka Önerileri — birini seçin:
            </p>
            {aiDescs.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setFormData({ ...formData, description: d }); setShowAiDescs(false); }}
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
          onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
        />
      </div>

      {(formData.deliveryType === 'pickup' || formData.deliveryType === 'both') && (
        <div>
          <Label htmlFor="city">Şehir *</Label>
          <Select
            value={formData.city}
            onValueChange={(value) => setFormData({ ...formData, city: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Şehir seçin" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="expiresAt">İlan Bitiş Tarihi</Label>
        <Input
          id="expiresAt"
          type="date"
          value={formData.expiresAt}
          onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
          min={todayStr}
          max={maxStr}
        />
        <p className="text-xs text-gray-500 mt-1">Maksimum +30 gün</p>
      </div>

    </div>
  );

  // Adım 4: Özet
  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="font-semibold text-orange-900 mb-3">Güncelleme Özeti</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Başlık:</span>
            <span className="font-medium">{formData.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Kategori:</span>
            <span className="font-medium">{formData.category}</span>
          </div>
          {formData.deliveryType !== 'shipping' && formData.city && (
            <div className="flex justify-between">
              <span className="text-gray-600">Şehir:</span>
              <span className="font-medium">{formData.city}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Bütçe:</span>
            <span className="font-medium text-green-600">
              ₺{parseFloat(formData.budgetMax || '0').toLocaleString('tr-TR')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ürün Durumu:</span>
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
          {formData.expiresAt && (
            <div className="flex justify-between">
              <span className="text-gray-600">Bitiş Tarihi:</span>
              <span className="font-medium">{formData.expiresAt}</span>
            </div>
          )}
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

      {uploadedImages.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Görseller:</p>
          <div className="grid grid-cols-3 gap-2">
            {uploadedImages.map((url, i) => (
              <img key={i} src={getImageUrl(url)} alt={`Görsel ${i + 1}`} className="w-full h-24 object-cover rounded-lg border" />
            ))}
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          ℹ️ Güncelleme sonrası ilanınız admin onayından geçecek ve tekrar yayına alınacaktır.
        </p>
      </div>
    </div>
  );

  if (loading || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p>İlan yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">İlanı Düzenle — Adım {currentStep}/{totalSteps}</h2>
              <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
            </div>

            <ScrollArea className="max-h-[65vh] pr-2">
              <div className="py-2">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
              </div>
            </ScrollArea>

            <div className="flex gap-3 pt-4 border-t mt-4">
              {currentStep > 1 ? (
                <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Geri
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => navigate(`/listing/${listing.id}`)} className="flex-1">
                  Vazgeç
                </Button>
              )}
              {currentStep < totalSteps ? (
                <Button type="button" onClick={nextStep} disabled={!canProceed() || isLoading} className="flex-1">
                  İleri <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSave} disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700">
                  {isLoading ? 'Kaydediliyor...' : 'Güncelle'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}