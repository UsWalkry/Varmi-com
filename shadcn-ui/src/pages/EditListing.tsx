import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DataManager, Listing, categories, cities } from '@/lib/mockData';
import Header from '@/components/Header';
import { toast } from 'sonner';

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    budgetMin: '',
    budgetMax: '',
    city: '',
    category: '',
    condition: 'new',
    deliveryType: 'shipping',
    expiresAt: ''
  });
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
          budgetMin: found.budgetMin.toString(),
          budgetMax: found.budgetMax.toString(),
          city: found.city,
          category: found.category,
          condition: found.condition,
          deliveryType: found.deliveryType,
          expiresAt: (found.expiresAt ? new Date(found.expiresAt) : (()=>{ const d=new Date(found.createdAt); d.setDate(d.getDate()+30); return d; })()).toISOString().split('T')[0]
        });
      }
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!listing) return;
    if (images.length === 0) {
      toast.error('İlan için en az 1 görsel bulunmalıdır');
      return;
    }
    // Doğrulamalar
    const todayStr = new Date().toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxStr = maxDate.toISOString().split('T')[0];
    if (form.expiresAt) {
      if (form.expiresAt < todayStr) {
        toast.error('İlan bitiş tarihi bugünden önce olamaz');
        return;
      }
      if (form.expiresAt > maxStr) {
        toast.error('İlan bitiş tarihi en fazla 30 gün sonrası olabilir');
        return;
      }
    }
    DataManager.updateListing(listing.id, {
      title: form.title,
      description: form.description,
      budgetMin: parseInt(form.budgetMin),
      budgetMax: parseInt(form.budgetMax),
      city: form.city,
      category: form.category,
      condition: form.condition as 'new' | 'used' | 'any',
      deliveryType: form.deliveryType as 'shipping' | 'pickup' | 'both',
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : listing.expiresAt,
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
        toAdd.push(compressed);
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>İlanı Düzenle</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              {/* Images */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Görseller</label>
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((src, idx) => (
                      <div key={idx} className="relative group border rounded-md overflow-hidden bg-muted/20">
                        <img src={src} alt={`İlan görseli ${idx+1}`} className="h-28 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition"
                        >
                          Kaldır
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <p className="text-xs text-muted-foreground">Sadece görsel dosyaları kabul edilir. Önerilen tek dosya boyutu ≤ 2MB.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Başlık</label>
                <Input name="title" value={form.title} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Açıklama</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="w-full border rounded-md p-2" required />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min. Bütçe</label>
                  <Input name="budgetMin" value={form.budgetMin} onChange={handleChange} type="number" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max. Bütçe</label>
                  <Input name="budgetMax" value={form.budgetMax} onChange={handleChange} type="number" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">İlan Bitiş Tarihi</label>
                <Input
                  name="expiresAt"
                  type="date"
                  value={form.expiresAt}
                  onChange={handleChange}
                  min={todayStr}
                  max={maxStr}
                />
                <p className="text-xs text-muted-foreground mt-1">Maksimum +30 gün</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Şehir</label>
                  <Select value={form.city} onValueChange={value => setForm(f => ({ ...f, city: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Şehir seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kategori</label>
                  <Select value={form.category} onValueChange={value => setForm(f => ({ ...f, category: value }))}>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    <option value="both">Kargo/Elden</option>
                  </select>
                </div>
              </div>
              <Button type="button" className="w-full mt-4" onClick={handleSave}>
                Kaydet
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
