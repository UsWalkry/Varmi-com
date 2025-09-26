import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Plus } from 'lucide-react';
import { DataManager, categories, cities } from '@/lib/mockData';
import { applyWatermarkToDataUrl } from '@/lib/watermark';
import AuthModal from '@/components/AuthModal';
import { toast } from 'sonner';

export default function CreateProduct() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(DataManager.getCurrentUser());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    title: '',
  description: '', // HTML saklanır
    category: '',
    city: '',
    condition: 'new' as 'new' | 'used',
    deliveryType: 'both' as 'shipping' | 'pickup' | 'both',
    price: '',
    stock: '1',
  });

  const [images, setImages] = useState<string[]>([]);

  const handleInput = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
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
      return canvas.toDataURL('image/webp', 0.85);
    };

    const toAdd: string[] = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) {
        toast.error(`${f.name}: Sadece görsel dosyaları yükleyebilirsiniz`);
        continue;
      }
      try {
        const raw = await readAsDataUrl(f);
        const compressed = await compressImageDataUrl(raw);
        const watermarked = await applyWatermarkToDataUrl(compressed, {
          text: 'var mıı?', opacity: 0.2, fontSize: 42, color: '#FFFFFF', angle: -30,
          tileSize: 320, outType: 'image/webp', quality: 0.9,
        });
        toAdd.push(watermarked);
      } catch {
        toast.error(`${f.name}: Dosya okunamadı`);
      }
    }
    if (toAdd.length) setImages((p) => [...p, ...toAdd]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = () => {
    if (!currentUser) { setIsAuthModalOpen(true); return; }
    if (!form.title || !form.description || !form.category || !form.city) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }
    if (images.length === 0) { toast.error('En az 1 görsel yükleyin'); return; }
    const price = parseInt(form.price, 10);
    const stock = Math.max(1, parseInt(form.stock, 10) || 1);
    try {
      const p = DataManager.addProduct({
        title: form.title,
        description: form.description,
        images,
        category: form.category,
        price,
        condition: form.condition,
        city: form.city,
        deliveryType: form.deliveryType,
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        stock,
      });
      toast.success('Ürün eklendi');
      navigate(`/`);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleAuthSuccess = () => setCurrentUser(DataManager.getCurrentUser());

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={() => navigate('/')}> <ArrowLeft className="h-4 w-4 mr-2"/> Ana Sayfaya Dön </Button>
            <h1 className="text-xl font-bold text-green-600">Ürün Ekle</h1>
            <div />
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5"/> Yeni Ürün</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Başlık *</Label>
              <Input value={form.title} onChange={(e)=>handleInput('title', e.target.value)} placeholder="Örn: iPhone 13 128GB"/>
            </div>
            <div className="space-y-2">
              <Label>Açıklama *</Label>
              <RichTextEditor value={form.description} onChange={(val)=>handleInput('description', val)} placeholder="Ürün hakkında detaylı bilgi verin"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori *</Label>
                <Select value={form.category} onValueChange={(v)=>handleInput('category', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin"/>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c)=>(<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Şehir *</Label>
                <Select value={form.city} onValueChange={(v)=>handleInput('city', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Şehir seçin"/>
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c)=>(<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Durum</Label>
              <RadioGroup value={form.condition} onValueChange={(v)=>handleInput('condition', v)}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="new" id="pnew"/><Label htmlFor="pnew">Sıfır</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="used" id="pused"/><Label htmlFor="pused">2. El</Label></div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Teslimat</Label>
              <RadioGroup value={form.deliveryType} onValueChange={(v)=>handleInput('deliveryType', v)}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="shipping" id="pship"/><Label htmlFor="pship">Kargo</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="pickup" id="ppick"/><Label htmlFor="ppick">Elden Teslim</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="both" id="pboth"/><Label htmlFor="pboth">Her İkisi de</Label></div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fiyat (TL) *</Label>
                <Input type="number" value={form.price} onChange={(e)=>handleInput('price', e.target.value)} placeholder="Örn: 5000"/>
              </div>
              <div className="space-y-2">
                <Label>Stok *</Label>
                <Input type="number" value={form.stock} onChange={(e)=>handleInput('stock', e.target.value)} placeholder="Örn: 1"/>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ürün Görselleri (en az 1) *</Label>
              {images.length>0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((src,i)=>(
                    <div key={i} className="relative group border rounded-md overflow-hidden bg-muted aspect-square">
                      <img src={src} className="w-full h-full object-cover"/>
                      <button type="button" className="absolute top-1 right-1 text-xs px-2 py-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100" onClick={()=>setImages(p=>p.filter((_,idx)=>idx!==i))}>Kaldır</button>
                    </div>
                  ))}
                </div>
              )}
              <Input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e)=>handleFilesSelected(e.target.files)} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={()=>navigate('/')}>Vazgeç</Button>
              <Button onClick={onSubmit} disabled={isLoading}>{isLoading? 'Kaydediliyor...' : 'Ürünü Yayınla'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={()=>setIsAuthModalOpen(false)} onAuthSuccess={()=>setCurrentUser(DataManager.getCurrentUser())}/>
    </div>
  );
}
