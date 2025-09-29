import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, LogOut } from 'lucide-react';
import { DataManager, categories, cities } from '@/lib/mockData';
import { applyWatermarkToDataUrl } from '@/lib/watermark';
import AuthModal from '@/components/AuthModal';
import Stepper from '@/components/ui/stepper';
import { toast } from 'sonner';

export default function CreateListing() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(DataManager.getCurrentUser());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form durumu: tek state üzerinde tutulur; adımlar arasında paylaşılır
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    city: '',
    condition: 'any',
    deliveryType: 'both',
    budgetMax: '',
    expiresAt: '',
    exactProductOnly: false,
    maskOwnerName: false,
  });

  // Wizard adımı (1: Temel Bilgiler, 2: Detay & Bütçe, 3: Önizleme & Yayınla)
  const [step, setStep] = useState(1);

  // Görseller (data URL'ler)
  const [images, setImages] = useState<string[]>([]);


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep: number): boolean => {
    // Adım bazlı minimal doğrulamalar
    if (currentStep === 1) {
      if (!formData.title || !formData.description || !formData.category || !formData.city) {
        toast.error('Lütfen başlık, açıklama, kategori ve şehir alanlarını doldurun');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.budgetMax) {
        toast.error('Lütfen maksimum bütçeyi girin');
        return false;
      }
      if (images.length === 0) {
        toast.error('En az 1 görsel yüklemelisiniz');
        return false;
      }
      // Tarih kontrolü (girildiyse)
      const todayStr = new Date().toISOString().split('T')[0];
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
      const maxStr = maxDate.toISOString().split('T')[0];
      if (formData.expiresAt) {
        if (formData.expiresAt < todayStr) {
          toast.error('Bitiş tarihi bugünden önce olamaz');
          return false;
        }
        if (formData.expiresAt > maxStr) {
          toast.error('Bitiş tarihi max 30 gün sonrası olabilir');
          return false;
        }
      }
    }
    return true;
  };

  const goNext = () => {
    if (validateStep(step)) setStep(prev => Math.min(prev + 1, 3));
  };
  const goBack = () => setStep(prev => Math.max(prev - 1, 1));

  const handleFinalSubmit = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!validateStep(1) || !validateStep(2)) return; // güvenlik
    setIsLoading(true);
    try {
      const expiresAt = formData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      // Başlık sonuna otomatik "Var mıı?" ekle (UI tarafında da uygula)
      const withSuffix = (() => {
        const base = (formData.title || '').trim();
        const lower = base.toLowerCase();
        const suffix = ' var mıı?';
        if (lower.endsWith(suffix)) return base;
        const cleaned = base.replace(/[\s?]+$/g, '');
        return cleaned + ' Var mıı?';
      })();
      const newListing = DataManager.addListing({
        buyerId: currentUser.id,
        buyerName: currentUser.name,
        title: withSuffix,
        description: formData.description,
        category: formData.category,
        budgetMax: parseInt(formData.budgetMax),
        condition: formData.condition as 'new' | 'used' | 'any',
        city: formData.city,
        deliveryType: formData.deliveryType as 'shipping' | 'pickup' | 'both',
        exactProductOnly: formData.exactProductOnly,
        maskOwnerName: formData.maskOwnerName,
        offersPublic: true,
        offersPurchasable: true,
        status: 'active',
        expiresAt,
        images
      });
      toast.success('İlanınız başarıyla oluşturuldu!');
      navigate(`/listing/${newListing.id}`);
    } catch (error) {
      if (/quota|storage/i.test(String(error))) {
        toast.error('Tarayıcı depolama sınırı aşıldı. Görselleri azaltın veya küçültün.');
      } else {
        toast.error('İlan oluşturulurken bir hata oluştu');
      }
      console.error('CreateListing final submit error:', error);
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

    // Basit sıkıştırma/yeniden boyutlandırma: max 1280px, kalite 0.8, webp veya jpeg
    const compressImageDataUrl = async (dataUrl: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('Görsel yüklenemedi'));
        img.src = dataUrl;
      });
      const maxDim = 1280;
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return dataUrl;
      ctx.drawImage(img, 0, 0, width, height);
      const tryTypes: Array<[string, number]> = [['image/webp', 0.8], ['image/jpeg', 0.8]];
      for (const [type, q] of tryTypes) {
        try {
          const out = canvas.toDataURL(type, q);
          if (out && out.startsWith('data:image')) return out;
        } catch (_e) {
          // fallback to next type
        }
      }
      return canvas.toDataURL('image/png');
    };

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
        const raw = await readAsDataUrl(f);
        const compressed = await compressImageDataUrl(raw);
        const watermarked = await applyWatermarkToDataUrl(compressed, {
          text: 'var mıı?',
          opacity: 0.22, // beyaz için biraz daha belirgin ama şeffaf
          fontSize: 48,  // daha büyük filigran yazısı
          color: '#FFFFFF', // beyaz
          angle: -30,
          tileSize: 360, // daha geniş aralıklarla tekrar
          outType: 'image/webp',
          quality: 0.9,
        });
        toAdd.push(watermarked);
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

  // Önizleme için durum etiketleri
  const conditionLabels: Record<string, string> = {
    new: 'Sıfır',
    used: '2. El',
    any: 'Farketmez'
  };
  const deliveryTypeLabels: Record<string, string> = {
    shipping: 'Kargo',
    pickup: 'Elden Teslim',
    both: 'Her İkisi de'
  };

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
          <CardContent className="space-y-8">
            <Stepper
              current={step}
              steps={[
                { id: 1, title: 'Temel Bilgiler', description: 'Başlık, açıklama, kategori, şehir' },
                { id: 2, title: 'Detay & Bütçe', description: 'Görseller, bütçe, tercihler' },
                { id: 3, title: 'Önizleme', description: 'Kontrol et & yayınla' }
              ]}
              onStepClick={(id) => { if (id < step) setStep(id); }}
              className="mb-4"
            />

            {/* Adım İçeriği */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">İlan Başlığı *</Label>
                  <Input
                    id="title"
                    placeholder="Örn: iPhone 15 Pro Max Aranıyor"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama *</Label>
                  <Textarea
                    id="description"
                    placeholder="Aradığınız ürün hakkında detaylı bilgi verin. Marka, model, özellikler, durum vb."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ürün Eşleşme Tercihi</Label>
                  <RadioGroup value={formData.exactProductOnly ? 'exact' : 'similar'} onValueChange={(v) => setFormData(p => ({ ...p, exactProductOnly: v === 'exact' }))}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="exact" id="exact" /><Label htmlFor="exact">İlanımda belirtilen ürünle tam uyumlu / aynı nitelikte teklifler gelsin</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="similar" id="similar" /><Label htmlFor="similar">Benzer ürünlerin de teklifleri gelebilir</Label></div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">Aynı ürün seçiliyse, satıcı teklif verirken ürün adı otomatik ilan başlığından gelir (düzenleyebilirsiniz).</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kategori *</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Şehir *</Label>
                    <Select value={formData.city} onValueChange={(value) => handleInputChange('city', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Şehir seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>İlan Görselleri (en az 1) *</Label>
                  <div className="flex flex-col gap-3">
                    {images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {images.map((src, idx) => (
                          <div key={idx} className="relative group border rounded-md overflow-hidden bg-muted aspect-square">
                            <img src={src} alt={`İlan görseli ${idx+1}`} className="w-full h-full object-cover" onContextMenu={(e) => e.preventDefault()} draggable={false} />
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
                    <p className="text-xs text-muted-foreground">Önerilen tek dosya boyutu ≤ 2MB.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Maksimum Bütçe (TL) *</Label>
                  <Input id="budgetMax" type="number" placeholder="5000" value={formData.budgetMax} onChange={(e) => handleInputChange('budgetMax', e.target.value)} />
                </div>

                <div className="space-y-3">
                  <Label>Ürün Durumu</Label>
                  <RadioGroup value={formData.condition} onValueChange={(value) => handleInputChange('condition', value)}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="new" id="new" /><Label htmlFor="new">Sıfır</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="used" id="used" /><Label htmlFor="used">2. El</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="any" id="any" /><Label htmlFor="any">Farketmez</Label></div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Teslimat Tercihi</Label>
                  <RadioGroup value={formData.deliveryType} onValueChange={(value) => handleInputChange('deliveryType', value)}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="shipping" id="shipping" /><Label htmlFor="shipping">Kargo</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="pickup" id="pickup" /><Label htmlFor="pickup">Elden Teslim</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="both" id="both" /><Label htmlFor="both">Her İkisi de</Label></div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">İlan Bitiş Tarihi</Label>
                  <Input id="expiresAt" type="date" value={formData.expiresAt || defaultExpiryString} onChange={(e) => handleInputChange('expiresAt', e.target.value)} min={new Date().toISOString().split('T')[0]} max={defaultExpiryString} />
                  <p className="text-xs text-muted-foreground">Boş bırakılırsa 30 gün sonra kapanır.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Kullanıcı Adı Gizliliği</Label>
                    <div className="flex items-start space-x-2">
                      <Checkbox id="maskOwnerName" checked={formData.maskOwnerName} onCheckedChange={(checked) => setFormData(p => ({ ...p, maskOwnerName: checked === true }))} />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="maskOwnerName" className="text-sm font-medium">Kullanıcı adımı gizle</label>
                        <p className="text-xs text-muted-foreground">Soyad(lar) '**' ile maskelenir.</p>
                      </div>
                    </div>
                  </div>
                  {/* 'Diğer kullanıcılar tekliften satın alabilsin' ayarı kaldırıldı; tüm ilanlar için otomatik aktiftir */}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Önizleme</h3>
                  <p className="text-sm text-muted-foreground">Bilgileri kontrol edin, gerekirse önceki adımlara dönün.</p>
                </div>
                <div className="grid gap-4">
                  <div>
                    <h4 className="font-medium mb-1">Başlık</h4>
                    <p className="text-sm text-muted-foreground">{formData.title}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Açıklama</h4>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{formData.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Kategori:</span> {formData.category}</div>
                    <div><span className="font-medium">Şehir:</span> {formData.city}</div>
                    <div><span className="font-medium">Durum:</span> {conditionLabels[formData.condition] || formData.condition}</div>
                    <div><span className="font-medium">Teslimat:</span> {deliveryTypeLabels[formData.deliveryType] || formData.deliveryType}</div>
                    <div><span className="font-medium">Bütçe (Üst Sınır):</span> {formData.budgetMax} TL</div>
                    <div><span className="font-medium">Bitiş:</span> {formData.expiresAt || defaultExpiryString}</div>
                    <div><span className="font-medium">Ürün Eşleşme:</span> {formData.exactProductOnly ? 'Aynı Ürün' : 'Benzer Olur'}</div>
                    <div><span className="font-medium">Ad Gizleme:</span> {formData.maskOwnerName ? 'Evet' : 'Hayır'}</div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Görseller</h4>
                    {images.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Görsel yok</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {images.map((src, i) => (
                          <img key={i} src={src} className="rounded-md border object-cover aspect-square" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => (step === 1 ? navigate('/') : goBack())} className="flex-1">
                {step === 1 ? 'Vazgeç' : 'Geri'}
              </Button>
              {step < 3 && (
                <Button type="button" onClick={goNext} className="flex-1">
                  Devam
                </Button>
              )}
              {step === 3 && (
                <Button type="button" onClick={handleFinalSubmit} disabled={isLoading} className="flex-1">
                  {isLoading ? 'Yayınlanıyor...' : 'İlanı Yayınla'}
                </Button>
              )}
            </div>
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