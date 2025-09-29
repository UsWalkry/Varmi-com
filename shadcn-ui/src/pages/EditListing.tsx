import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DataManager, Listing, categories, cities } from '@/lib/mockData';
import Header from '@/components/Header';
import { applyWatermarkToDataUrl } from '@/lib/watermark';
import Stepper from '@/components/ui/stepper';
import { toast } from 'sonner';

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    budgetMax: '',
    city: '',
    category: '',
    condition: 'new',
    deliveryType: 'shipping',
    expiresAt: '',
    maskOwnerName: false
  });
  // Adım durumu
  const [step, setStep] = useState(1); // 1: Temel, 2: Detay & Bütçe, 3: Önizleme
  const [images, setImages] = useState<string[]>([]);

  // Tarih sınırları: bugün ve +30 gün
  const todayStr = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxStr = maxDate.toISOString().split('T')[0];

  useEffect(() => {
    if (id) {
      const found = DataManager.getListings().find(l => l.id === id);
      if (found) {
        setListing(found);
        setImages(found.images || []);
        setForm({
          title: found.title,
          description: found.description,
          budgetMax: found.budgetMax.toString(),
          city: found.city,
          category: found.category,
          condition: found.condition,
          deliveryType: found.deliveryType,
          expiresAt: (found.expiresAt ? new Date(found.expiresAt) : (()=>{ const d=new Date(found.createdAt); d.setDate(d.getDate()+30); return d; })()).toISOString().split('T')[0],
          maskOwnerName: found.maskOwnerName ?? false
        });
      }
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!form.title || !form.description || !form.category || !form.city) {
        toast.error('Başlık, açıklama, kategori ve şehir zorunlu');
        return false;
      }
    }
    if (s === 2) {
      if (!form.budgetMax) {
        toast.error('Maksimum bütçeyi girin');
        return false;
      }
      if (images.length === 0) {
        toast.error('En az 1 görsel gerekli');
        return false;
      }
      // Tarih kontrolü
      if (form.expiresAt) {
        if (form.expiresAt < todayStr) { toast.error('Bitiş tarihi bugünden önce olamaz'); return false; }
        if (form.expiresAt > maxStr) { toast.error('Bitiş tarihi max 30 gün sonrası olabilir'); return false; }
      }
    }
    return true;
  };

  const goNext = () => { if (validateStep(step)) setStep(p => Math.min(p + 1, 3)); };
  const goBack = () => setStep(p => Math.max(p - 1, 1));

  const handleSave = () => {
    if (!listing) return;
    if (!validateStep(1) || !validateStep(2)) return; // güvenlik
    DataManager.updateListing(listing.id, {
      title: form.title,
      description: form.description,
      budgetMax: parseInt(form.budgetMax),
      city: form.city,
      category: form.category,
      condition: form.condition as 'new' | 'used' | 'any',
      deliveryType: form.deliveryType as 'shipping' | 'pickup' | 'both',
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : listing.expiresAt,
      maskOwnerName: form.maskOwnerName,
      images
    });
    toast.success('İlan başarıyla güncellendi!');
    navigate(`/listing/${listing.id}`);
  };

  // Image helpers (same compression approach as CreateListing)
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const MAX_FILE_MB = 2;
    const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
          // ignore
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
          opacity: 0.22,
          fontSize: 48,
          color: '#FFFFFF',
          angle: -30,
          tileSize: 360,
          outType: 'image/webp',
          quality: 0.9,
        });
        toAdd.push(watermarked);
      } catch {
        toast.error(`${f.name}: Dosya okunamadı`);
      }
    }
    if (toAdd.length) setImages(prev => [...prev, ...toAdd]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>İlan yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>İlanı Düzenle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <Stepper
              current={step}
              steps={[
                { id: 1, title: 'Temel Bilgiler', description: 'Başlık, açıklama, kategori, şehir' },
                { id: 2, title: 'Detay & Bütçe', description: 'Görseller, bütçe, tercihler' },
                { id: 3, title: 'Önizleme', description: 'Kontrol & kaydet' }
              ]}
              onStepClick={(id) => { if (id < step) setStep(id); }}
            />

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Başlık *</label>
                  <Input name="title" value={form.title} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Açıklama *</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="w-full border rounded-md p-2" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Kategori *</label>
                    <Select value={form.category} onValueChange={value => setForm(f => ({ ...f, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Şehir *</label>
                    <Select value={form.city} onValueChange={value => setForm(f => ({ ...f, city: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Şehir seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Görseller *</label>
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {images.map((src, idx) => (
                        <div key={idx} className="relative group border rounded-md overflow-hidden bg-muted aspect-square">
                          <img src={src} alt={`İlan görseli ${idx+1}`} className="w-full h-full object-cover" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                          <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition">Kaldır</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleFilesSelected(e.target.files)} />
                  <p className="text-xs text-muted-foreground">Önerilen tek dosya boyutu ≤ 2MB.</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Maksimum Bütçe (TL) *</label>
                  <Input name="budgetMax" value={form.budgetMax} onChange={handleChange} type="number" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Durum</label>
                    <select name="condition" value={form.condition} onChange={handleChange} className="w-full border rounded-md p-2">
                      <option value="new">Sıfır</option>
                      <option value="used">2. El</option>
                      <option value="any">Farketmez</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Teslimat</label>
                    <select name="deliveryType" value={form.deliveryType} onChange={handleChange} className="w-full border rounded-md p-2">
                      <option value="shipping">Kargo</option>
                      <option value="pickup">Elden Teslim</option>
                      <option value="both">Her İkisi de</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">İlan Bitiş Tarihi</label>
                  <Input name="expiresAt" type="date" value={form.expiresAt} onChange={handleChange} min={todayStr} max={maxStr} />
                  <p className="text-xs text-muted-foreground mt-1">Maksimum +30 gün</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Kullanıcı Adı Gizliliği</Label>
                    <div className="flex items-start space-x-2">
                      <Checkbox id="maskOwnerName" checked={form.maskOwnerName} onCheckedChange={(checked) => setForm(p => ({ ...p, maskOwnerName: checked === true }))} />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="maskOwnerName" className="text-sm font-medium">Kullanıcı adımı gizle</label>
                        <p className="text-xs text-muted-foreground">Soyad(lar) '**' ile maskelenir.</p>
                      </div>
                    </div>
                  </div>
                  {/* Teklif görünürlüğü kaldırıldı: tüm ilanlarda teklifler herkese açıktır */}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Önizleme</h3>
                  <p className="text-sm text-muted-foreground">Güncellemeleri kontrol edin.</p>
                </div>
                <div className="grid gap-4 text-sm">
                  <div><span className="font-medium">Başlık:</span> {form.title}</div>
                  <div>
                    <span className="font-medium">Açıklama:</span>
                    <p className="whitespace-pre-wrap text-muted-foreground mt-1">{form.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="font-medium">Kategori:</span> {form.category}</div>
                    <div><span className="font-medium">Şehir:</span> {form.city}</div>
                    <div><span className="font-medium">Durum:</span> {form.condition === 'new' ? 'Sıfır' : form.condition === 'used' ? '2. El' : 'Farketmez'}</div>
                    <div><span className="font-medium">Teslimat:</span> {form.deliveryType === 'shipping' ? 'Kargo' : form.deliveryType === 'pickup' ? 'Elden Teslim' : 'Her İkisi de'}</div>
                    <div><span className="font-medium">Bütçe (Üst Sınır):</span> {form.budgetMax} TL</div>
                    <div><span className="font-medium">Bitiş:</span> {form.expiresAt}</div>
                    <div><span className="font-medium">Ad Gizleme:</span> {form.maskOwnerName ? 'Evet' : 'Hayır'}</div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Görseller</h4>
                    {images.length === 0 ? <p className="text-xs text-muted-foreground">Görsel yok</p> : (
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

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => (step === 1 ? navigate(`/listing/${listing.id}`) : goBack())} className="flex-1">
                {step === 1 ? 'Vazgeç' : 'Geri'}
              </Button>
              {step < 3 && (
                <Button type="button" onClick={goNext} className="flex-1">Devam</Button>
              )}
              {step === 3 && (
                <Button type="button" onClick={handleSave} className="flex-1">Kaydet</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
