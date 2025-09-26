import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Listing, DataManager, type DesiBracket } from '@/lib/mockData';
import Stepper from '@/components/ui/stepper';
import { toast } from 'sonner';
import DesiInfo from '@/components/DesiInfo';
import { Dialog as SubDialog, DialogContent as SubDialogContent, DialogHeader as SubDialogHeader, DialogTitle as SubDialogTitle } from '@/components/ui/dialog';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  onOfferCreated: () => void;
}

export default function CreateOfferModal({ 
  isOpen, 
  onClose, 
  listing, 
  onOfferCreated 
}: CreateOfferModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    price: '',
    quantity: '1',
    condition: 'new',
    brand: '',
    model: '',
    description: '',
    deliveryType: 'shipping',
    shippingDesi: '' as '' | DesiBracket,
    shippingPackage: '' as '' | 'small' | 'medium' | 'large',
    largeWidth: '',
    largeHeight: '',
    largeLength: '',
    computedDesi: '',
    shippingCost: '0',
    etaDays: '3',
    validUntil: ''
  });

  const PACKAGE_LABELS: Record<'small'|'medium'|'large', string> = {
    small: 'Küçük Paket',
    medium: 'Orta Paket',
    large: 'Büyük Paket'
  };
  const PACKAGE_FIXED_COST: Record<'small'|'medium', number> = {
    small: 44.99,
    medium: 99.99
  };
  const PACKAGE_DESI_MAP: Record<'small'|'medium'|'large', DesiBracket> = {
    small: '0-1',
    medium: '6-10',
    large: '31-40' // Varsayılan; büyük hesaplama sonrası güncellenebilir
  };

  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Fiyat & Temel, 2: Detaylar & Kargo, 3: Önizleme
  const [images, setImages] = useState<string[]>([]);

  const currentUser = DataManager.getCurrentUser();

  // Tarih sınırları
  const minValidStr = (() => { const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; })();
  const maxValidStr = (() => {
    if (!listing.expiresAt) return undefined as string | undefined;
    const d = new Date(listing.expiresAt);
    return d.toISOString().split('T')[0];
  })();

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!formData.price || parseFloat(formData.price) <= 0) {
        toast.error('Geçerli bir fiyat giriniz');
        return false;
      }
      const qty = parseInt(formData.quantity);
      if (!Number.isFinite(qty) || qty < 1) {
        toast.error('Adet en az 1 olmalıdır');
        return false;
      }
      const minAllowed = DataManager.getMinAllowedOfferPriceForListing(listing);
      const price = parseFloat(formData.price);
      if (price < minAllowed || price > listing.budgetMax) {
        toast.error(`Fiyat ${DataManager.formatPrice(minAllowed)} - ${DataManager.formatPrice(listing.budgetMax)} aralığında olmalıdır`);
        return false;
      }
    }
    if (s === 2) {
      if (!formData.description.trim()) {
        toast.error('Ürün açıklaması zorunlu');
        return false;
      }
      if (formData.deliveryType === 'shipping') {
        if (!formData.shippingPackage) { toast.error('Paket tipi seçin'); return false; }
        if (formData.shippingPackage === 'large') {
          const w = parseFloat(formData.largeWidth); const h = parseFloat(formData.largeHeight); const l = parseFloat(formData.largeLength);
          if (!w || !h || !l) { toast.error('Büyük paket için tüm ölçüleri girin'); return false; }
          const desi = (w * h * l) / 3000;
          if (desi <= 0) { toast.error('Ölçüler geçersiz'); return false; }
          if (!formData.shippingDesi) { toast.error('Desi otomatik hesaplanamadı'); return false; }
        }
        const shippingCost = parseFloat(formData.shippingCost);
        if (!Number.isFinite(shippingCost) || shippingCost <= 0) { toast.error('Geçerli kargo ücreti bulunamadı'); return false; }
      } else if (formData.deliveryType === 'pickup') {
        if (parseFloat(formData.shippingCost) !== 0) { toast.error('Elden teslimde kargo ücreti 0 olmalı'); return false; }
      }
      if (formData.validUntil) {
        const chosen = new Date(formData.validUntil).getTime();
        const min = new Date(minValidStr).getTime();
        const listingExpiry = listing.expiresAt ? new Date(listing.expiresAt).getTime() : undefined;
        if (chosen < min) { toast.error('Geçerlilik tarihi en az +1 gün'); return false; }
        if (listingExpiry && chosen > listingExpiry) { toast.error('Geçerlilik tarihi ilan bitişini aşamaz'); return false; }
      }
    }
    return true;
  };

  const goNext = () => { if (validateStep(step)) setStep(p => Math.min(p + 1, 3)); };
  const goBack = () => setStep(p => Math.max(p - 1, 1));

  const handleFinalSubmit = async () => {
    if (!currentUser) { toast.error('Teklif vermek için giriş yapmalısınız'); return; }
    if (!validateStep(1) || !validateStep(2)) return;
    const existing = DataManager.getOffersForListing(listing.id).some(o => o.sellerId === currentUser.id);
    if (existing) { toast.error('Bu ilana zaten bir teklif verdiniz'); return; }
  const price = parseFloat(formData.price);
  const quantity = Math.max(1, parseInt(formData.quantity));
    const shippingCost = parseFloat(formData.shippingCost);
    const etaDays = parseInt(formData.etaDays);
    // validUntil ISO hesapla
    const listingExpiry = listing.expiresAt ? new Date(listing.expiresAt) : null;
    let validUntilISO: string | undefined;
    if (formData.validUntil) {
      validUntilISO = new Date(formData.validUntil).toISOString();
    } else {
      const def = new Date(); def.setDate(def.getDate() + 7);
      if (listingExpiry && def.getTime() > listingExpiry.getTime()) validUntilISO = listingExpiry.toISOString(); else validUntilISO = def.toISOString();
    }
    setIsSubmitting(true);
    try {
  DataManager.addOffer({
        listingId: listing.id,
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        sellerRating: currentUser.rating,
    price,
    quantity,
        condition: formData.condition as 'new' | 'used',
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        description: formData.description,
        deliveryType: formData.deliveryType as 'shipping' | 'pickup',
        shippingDesi: formData.deliveryType === 'shipping' ? (formData.shippingDesi as DesiBracket) : undefined,
        shippingCost,
        etaDays,
        status: 'active',
        validUntil: validUntilISO,
        images: images.length ? images : undefined
      });
      toast.success('Teklifiniz başarıyla gönderildi!');
      onOfferCreated();
      onClose();
  setFormData({ price: '', quantity: '1', condition: 'new', brand: '', model: '', description: '', deliveryType: 'shipping', shippingDesi: '', shippingPackage: '', largeWidth: '', largeHeight: '', largeLength: '', computedDesi: '', shippingCost: '0', etaDays: '3', validUntil: '' });
      setImages([]);
      setStep(1);
    } catch (e) {
      toast.error('Teklif gönderilirken bir hata oluştu');
      console.error(e);
    } finally { setIsSubmitting(false); }
  };

  // Görsel seçimi ve önizleme
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
          // ignore and try next type
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
      const raw = await readAsDataUrl(f);
      const compressed = await compressImageDataUrl(raw);
      toAdd.push(compressed);
    }
    if (toAdd.length) {
      setImages(prev => {
        const merged = [...prev, ...toAdd];
        if (merged.length > 5) {
          toast.error('En fazla 5 görsel yükleyebilirsiniz');
          return merged.slice(0, 5);
        }
        return merged;
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // İlan durumuna göre condition kısıtları
  const allowNew = listing.condition === 'any' || listing.condition === 'new';
  const allowUsed = listing.condition === 'any' || listing.condition === 'used';
  const isFixedCondition = listing.condition !== 'any';
  const allowShipping = listing.deliveryType === 'both' || listing.deliveryType === 'shipping';
  const allowPickup = listing.deliveryType === 'both' || listing.deliveryType === 'pickup';
  const isFixedDelivery = listing.deliveryType !== 'both';

  // Modal açıldığında/ilan değiştiğinde sabit durumu uygula
  useEffect(() => {
    if (!isOpen) return;
    if (listing.condition === 'used' && formData.condition !== 'used') {
      setFormData(prev => ({ ...prev, condition: 'used' }));
    } else if (listing.condition === 'new' && formData.condition !== 'new') {
      setFormData(prev => ({ ...prev, condition: 'new' }));
    }
    // Teslimat sabitse onu uygula
    if (listing.deliveryType === 'shipping' && formData.deliveryType !== 'shipping') {
      setFormData(prev => ({ ...prev, deliveryType: 'shipping' }));
    } else if (listing.deliveryType === 'pickup' && formData.deliveryType !== 'pickup') {
      setFormData(prev => ({ ...prev, deliveryType: 'pickup', shippingDesi: '', shippingPackage: '', shippingCost: '0', largeWidth: '', largeHeight: '', largeLength: '', computedDesi: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, listing.condition, listing.deliveryType]);

  const totalPrice = (parseFloat(formData.price) || 0) + (parseFloat(formData.shippingCost) || 0);
  const uiMinAllowed = DataManager.getMinAllowedOfferPriceForListing(listing);
  // Eski desi options kaldırıldı
  const selectedRange = formData.shippingDesi ? DataManager.getShippingCostRangeForDesi(formData.shippingDesi) : undefined;
  const isShipping = formData.deliveryType === 'shipping';
  const shippingCostDisabled = true; // Artık kullanıcı girmiyor, otomatik

  const handleSelectPackage = (pkg: 'small'|'medium'|'large') => {
    if (pkg === 'small' || pkg === 'medium') {
      const cost = PACKAGE_FIXED_COST[pkg];
      const desi = PACKAGE_DESI_MAP[pkg];
      setFormData(prev => ({ ...prev, shippingPackage: pkg, shippingDesi: desi, shippingCost: cost.toFixed(2), largeWidth: '', largeHeight: '', largeLength: '', computedDesi: '' }));
      setIsPackageDialogOpen(false);
    } else {
      setFormData(prev => ({ ...prev, shippingPackage: 'large', shippingDesi: PACKAGE_DESI_MAP.large, shippingCost: '129.99' }));
    }
  };

  const handleComputeLarge = () => {
    const w = parseFloat(formData.largeWidth); const h = parseFloat(formData.largeHeight); const l = parseFloat(formData.largeLength);
    if (!w || !h || !l) { toast.error('Tüm ölçüleri girin'); return; }
    const desiVal = (w * h * l) / 3000; // volumetrik
    const rounded = Math.max(1, Math.round(desiVal));
    let bracket: DesiBracket = '31-40';
    if (rounded > 40 && rounded <= 50) bracket = '41-50';
    else if (rounded > 50 && rounded <= 70) bracket = '51-70';
    else if (rounded > 70 && rounded <= 100) bracket = '71-100';
    else if (rounded > 100) bracket = '100+';
    const range = DataManager.getShippingCostRangeForDesi(bracket);
    let estimate = 129.99;
    if (range.min > estimate) estimate = range.min;
    if (range.max && estimate > range.max) estimate = range.max;
    setFormData(prev => ({ ...prev, computedDesi: String(rounded), shippingDesi: bracket, shippingCost: estimate.toFixed(2) }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Teklif Ver</DialogTitle>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">{listing.title}</p>
            <p>Bütçe: {DataManager.formatPrice(listing.budgetMin)} - {DataManager.formatPrice(listing.budgetMax)}</p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <Stepper
            current={step}
            steps={[
              { id: 1, title: 'Fiyat & Temel', description: 'Fiyat, durum, marka/model' },
              { id: 2, title: 'Detaylar', description: 'Açıklama, kargo & süre' },
              { id: 3, title: 'Önizleme', description: 'Kontrol & gönder' }
            ]}
            onStepClick={(id) => { if (id < step) setStep(id); }}
          />

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Fiyat (TL) *</Label>
                  <Input id="price" type="number" min="1" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                  <p className="text-xs text-muted-foreground mt-1">Min: {DataManager.formatPrice(uiMinAllowed)} / Max: {DataManager.formatPrice(listing.budgetMax)}</p>
                </div>
                <div>
                  <Label htmlFor="quantity">Adet *</Label>
                  <Input id="quantity" type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                  <p className="text-[11px] text-muted-foreground mt-1">! İlan sahibi daima 1 adet öncelik hakkına sahiptir. Diğer kullanıcılar yalnızca fazla adetleri satın alabilir.</p>
                </div>
                <div>
                  <Label>Ürün Durumu *</Label>
                  <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })} disabled={isFixedCondition}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allowNew && <SelectItem value="new">Sıfır</SelectItem>}
                      {allowUsed && <SelectItem value="used">2. El</SelectItem>}
                    </SelectContent>
                  </Select>
                  {isFixedCondition && <p className="text-xs text-muted-foreground mt-1">Sabit durum: {listing.condition === 'new' ? 'Sıfır' : '2. El'}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Marka</Label>
                  <Input value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="Apple" />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="iPhone 15 Pro" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Ürün Görselleri (opsiyonel, max 5)</Label>
                <div className="flex flex-col gap-3">
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {images.map((src, idx) => (
                        <div key={idx} className="relative group border rounded-md overflow-hidden bg-muted/20">
                          <img src={src} alt={`Teklif görseli ${idx+1}`} className="h-28 w-full object-cover" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                          <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition">Kaldır</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleFilesSelected(e.target.files)} />
                  <p className="text-xs text-muted-foreground">Max 5 görsel, önerilen ≤2MB.</p>
                </div>
              </div>
              <div>
                <Label>Ürün Açıklaması *</Label>
                <Textarea rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Ürün detayları, garanti, kullanım durumu..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                {/* Teslimat Şekli */}
                <div>
                  <Label>Teslimat Şekli *</Label>
                  <Select value={formData.deliveryType} onValueChange={(value) => {
                    if (value === 'pickup') {
                      setFormData(prev => ({ ...prev, deliveryType: 'pickup', shippingDesi: '', shippingCost: '0' }));
                    } else {
                      setFormData(prev => ({ ...prev, deliveryType: 'shipping' }));
                    }
                  }} disabled={isFixedDelivery}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allowShipping && <SelectItem value="shipping">Kargo</SelectItem>}
                      {allowPickup && <SelectItem value="pickup">Elden Teslim</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {/* Paket Seçimi */}
                {formData.deliveryType === 'shipping' && (
                  <div>
                    <Label className="block mb-1">Paket *</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsPackageDialogOpen(true)} className="shrink-0">
                        {formData.shippingPackage ? PACKAGE_LABELS[formData.shippingPackage] : 'Paket Seç'}
                      </Button>
                      {formData.shippingPackage && (
                        <span className="text-xs text-muted-foreground">
                          {PACKAGE_LABELS[formData.shippingPackage]} {formData.computedDesi && formData.shippingPackage==='large' ? `(≈ ${formData.computedDesi} desi)` : ''} — Kargo: {parseFloat(formData.shippingCost).toFixed(2)} TL
                        </span>
                      )}
                    </div>
                    {!formData.shippingPackage && (
                      <p className="text-xs text-muted-foreground mt-1">Önce paket seçin</p>
                    )}
                  </div>
                )}

                {/* Kargo Ücreti */}
                <div>
                  <Label>Kargo Ücreti (TL)</Label>
                  <Input type="number" value={formData.shippingCost} disabled={true} />
                </div>

                {/* ETA */}
                <div>
                  <Label>Kargoya Teslim Süresi (gün)</Label>
                  <Input type="number" min="1" max="30" value={formData.etaDays} onChange={(e) => setFormData({ ...formData, etaDays: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Geçerlilik Tarihi</Label>
                  <Input type="date" value={formData.validUntil} onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })} min={minValidStr} max={maxValidStr} />
                  <p className="text-xs text-muted-foreground mt-1">En az +1 gün, ilan bitişini aşamaz.</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Önizleme</h3>
                <p className="text-sm text-muted-foreground">Göndermeden önce bilgileri kontrol edin.</p>
              </div>
              <Card>
                <CardContent className="p-4 space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-medium">Fiyat:</span> {formData.price} TL</div>
                    <div><span className="font-medium">Durum:</span> {formData.condition === 'new' ? 'Sıfır' : '2. El'}</div>
                    <div><span className="font-medium">Marka:</span> {formData.brand || '-'}</div>
                    <div><span className="font-medium">Model:</span> {formData.model || '-'}</div>
                    <div><span className="font-medium">Teslimat:</span> {formData.deliveryType === 'shipping' ? 'Kargo' : 'Elden Teslim'}</div>
                    {formData.deliveryType === 'shipping' && <div><span className="font-medium">Paket:</span> {formData.shippingPackage ? PACKAGE_LABELS[formData.shippingPackage] : '-'}</div>}
                    {formData.deliveryType === 'shipping' && formData.shippingPackage === 'large' && <div><span className="font-medium">Hesaplanan Desi:</span> {formData.computedDesi || '-'}</div>}
                    {formData.deliveryType === 'shipping' && <div><span className="font-medium">Kargo:</span> {parseFloat(formData.shippingCost) > 0 ? formData.shippingCost + ' TL' : '-'}</div>}
                    <div><span className="font-medium">Kargoya Teslim Süresi:</span> {formData.etaDays} gün</div>
                    <div><span className="font-medium">Geçerlilik:</span> {formData.validUntil || 'Varsayılan (≈7 gün)'}</div>
                    <div className="col-span-2">
                      <span className="font-medium">Açıklama:</span>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{formData.description}</p>
                    </div>
                  </div>
                  {images.length > 0 && (
                    <div>
                      <p className="font-medium mb-1">Görseller</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {images.map((src, i) => <img key={i} src={src} className="h-24 w-full object-cover rounded border" />)}
                      </div>
                    </div>
                  )}
                  <div className="pt-2 border-t flex justify-end gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground">Toplam</p>
                      <p className="text-lg font-semibold text-green-600">{DataManager.formatPrice(totalPrice)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="outline" onClick={() => (step === 1 ? onClose() : goBack())} className="flex-1">{step === 1 ? 'İptal' : 'Geri'}</Button>
            {step < 3 && <Button onClick={goNext} className="flex-1">Devam</Button>}
            {step === 3 && <Button onClick={handleFinalSubmit} disabled={isSubmitting} className="flex-1">{isSubmitting ? 'Gönderiliyor...' : 'Teklifi Gönder'}</Button>}
          </div>
        </div>
      </DialogContent>
      {/* Paket Seçim Dialog */}
      <SubDialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
        <SubDialogContent className="max-w-lg">
          <SubDialogHeader>
            <SubDialogTitle>Paket Tipi Seç</SubDialogTitle>
          </SubDialogHeader>
          <div className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className={`cursor-pointer border-2 ${formData.shippingPackage==='small' ? 'border-blue-500' : 'border-transparent hover:border-blue-300'} transition`} onClick={() => handleSelectPackage('small')}>
                <CardContent className="p-4 space-y-1 text-sm">
                  <p className="font-semibold">Küçük Paket</p>
                  <p className="text-blue-600 font-medium">44.99 TL</p>
                  <p className="text-muted-foreground text-xs leading-snug">Tişört, kolye, telefon, saat...</p>
                </CardContent>
              </Card>
              <Card className={`cursor-pointer border-2 ${formData.shippingPackage==='medium' ? 'border-blue-500' : 'border-transparent hover:border-blue-300'} transition`} onClick={() => handleSelectPackage('medium')}>
                <CardContent className="p-4 space-y-1 text-sm">
                  <p className="font-semibold">Orta Paket</p>
                  <p className="text-blue-600 font-medium">99.99 TL</p>
                  <p className="text-muted-foreground text-xs leading-snug">Mont, çanta, bot, puzzle...</p>
                </CardContent>
              </Card>
            </div>
            <div className={`border rounded-md p-4 space-y-3 ${formData.shippingPackage==='large' ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Büyük Paket</p>
                  <p className="text-xs text-muted-foreground">Ölçü gir, desi & tahmini kargo hesapla</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleSelectPackage('large')}>Seç</Button>
              </div>
              {formData.shippingPackage === 'large' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">En (cm)</Label>
                      <Input value={formData.largeWidth} onChange={(e)=> setFormData(p=>({...p, largeWidth: e.target.value}))} type="number" min="1" />
                    </div>
                    <div>
                      <Label className="text-xs">Boy (cm)</Label>
                      <Input value={formData.largeHeight} onChange={(e)=> setFormData(p=>({...p, largeHeight: e.target.value}))} type="number" min="1" />
                    </div>
                    <div>
                      <Label className="text-xs">Yükseklik (cm)</Label>
                      <Input value={formData.largeLength} onChange={(e)=> setFormData(p=>({...p, largeLength: e.target.value}))} type="number" min="1" />
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button size="sm" onClick={handleComputeLarge}>Hesapla</Button>
                    {formData.computedDesi && (
                      <p className="text-xs text-muted-foreground">≈ {formData.computedDesi} desi • {parseFloat(formData.shippingCost).toFixed(2)} TL</p>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">Formül: (En x Boy x Yükseklik) / 3000. Tahmini kargo fiyatıdır; kargo firması ölçüme göre güncelleyebilir.</p>
                </div>
              )}
            </div>
            <DesiInfo className="mt-2" />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setIsPackageDialogOpen(false)}>Kapat</Button>
              {formData.shippingPackage && <Button size="sm" onClick={() => setIsPackageDialogOpen(false)}>Onayla</Button>}
            </div>
          </div>
        </SubDialogContent>
      </SubDialog>
    </Dialog>
  );
}

// Güncelleme: Eski desi select sistemi kaldırıldı. Üç paket tipi + büyük paket için dinamik hesaplama eklendi.