import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Listing, DataManager, type DesiBracket } from '@/lib/mockData';
import { toast } from 'sonner';

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
  const [formData, setFormData] = useState({
    price: '',
    condition: 'new',
    brand: '',
    model: '',
    description: '',
    deliveryType: 'shipping',
    shippingDesi: '' as '' | DesiBracket,
    shippingCost: '0',
    etaDays: '3',
    validUntil: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = DataManager.getCurrentUser();

  // Tarih sınırları
  const minValidStr = (() => { const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; })();
  const maxValidStr = (() => {
    if (!listing.expiresAt) return undefined as string | undefined;
    const d = new Date(listing.expiresAt);
    return d.toISOString().split('T')[0];
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('Teklif vermek için giriş yapmalısınız');
      return;
    }

    // Aynı ilana en fazla 1 teklif: UI ön kontrol
    const existing = DataManager.getOffersForListing(listing.id).some(o => o.sellerId === currentUser.id);
    if (existing) {
      toast.error('Bu ilana zaten bir teklif verdiniz');
      return;
    }

    const price = parseFloat(formData.price);
    const shippingCost = parseFloat(formData.shippingCost);
    const etaDays = parseInt(formData.etaDays);

    if (!price || price <= 0) {
      toast.error('Geçerli bir fiyat giriniz');
      return;
    }

    // Kategori tabanlı minimum fiyat (DataManager tarafında da doğrulanıyor)
    const minAllowed = DataManager.getMinAllowedOfferPriceForListing(listing);

    if (price < minAllowed || price > listing.budgetMax) {
      const minText = DataManager.formatPrice(minAllowed);
      const maxText = DataManager.formatPrice(listing.budgetMax);
      toast.error(`Fiyat ${minText} - ${maxText} aralığında olmalıdır`);
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Ürün açıklaması gereklidir');
      return;
    }

    // Kargo/desi UI ön doğrulamaları
    if (formData.deliveryType === 'shipping') {
      if (!formData.shippingDesi) {
        toast.error('Kargo için desi seçimi zorunludur');
        return;
      }
      const range = DataManager.getShippingCostRangeForDesi(formData.shippingDesi);
      if (!Number.isFinite(shippingCost) || shippingCost <= 0) {
        toast.error('Geçerli bir kargo ücreti giriniz');
        return;
      }
      if (typeof range.max === 'number') {
        if (shippingCost < range.min || shippingCost > range.max) {
          toast.error(`Seçilen desi için kargo ücreti ${DataManager.formatPrice(range.min)} - ${DataManager.formatPrice(range.max)} aralığında olmalıdır`);
          return;
        }
      } else {
        if (shippingCost < range.min) {
          toast.error(`100+ desi için kargo ücreti en az ${DataManager.formatPrice(range.min)} olmalıdır`);
          return;
        }
      }
    } else if (formData.deliveryType === 'pickup') {
      if (shippingCost !== 0) {
        toast.error('Elden teslimde kargo ücreti 0 olmalıdır');
        return;
      }
    }

    // Teklif geçerlilik tarihi kuralları
    const today = new Date();
    const minValid = new Date(today);
    minValid.setDate(minValid.getDate() + 1); // min 1 gün
    const listingExpiry = listing.expiresAt ? new Date(listing.expiresAt) : null;

    let validUntilISO: string | undefined;
    if (formData.validUntil) {
      const chosen = new Date(formData.validUntil);
      if (chosen.getTime() < minValid.getTime()) {
        toast.error('Teklif en az 1 gün geçerli olmalıdır');
        return;
      }
      if (listingExpiry && chosen.getTime() > listingExpiry.getTime()) {
        toast.error('Teklif süresi ilanın bitiş tarihini aşamaz');
        return;
      }
      validUntilISO = chosen.toISOString();
    } else {
      // Varsayılan: min(7 gün, ilan bitiş tarihi)
      const def = new Date();
      def.setDate(def.getDate() + 7);
      if (listingExpiry && def.getTime() > listingExpiry.getTime()) {
        validUntilISO = listingExpiry.toISOString();
      } else {
        validUntilISO = def.toISOString();
      }
    }

    setIsSubmitting(true);

    try {
      const newOffer = DataManager.addOffer({
        listingId: listing.id,
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        sellerRating: currentUser.rating,
        price,
        condition: formData.condition as 'new' | 'used',
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        description: formData.description,
        deliveryType: formData.deliveryType as 'shipping' | 'pickup',
        shippingDesi: formData.deliveryType === 'shipping' ? (formData.shippingDesi as DesiBracket) : undefined,
        shippingCost,
        etaDays,
        status: 'active',
        validUntil: validUntilISO
      });

      toast.success('Teklifiniz başarıyla gönderildi!');
      onOfferCreated();
      onClose();
      
      // Reset form
      setFormData({
        price: '',
        condition: 'new',
        brand: '',
        model: '',
        description: '',
        deliveryType: 'shipping',
        shippingDesi: '',
        shippingCost: '0',
        etaDays: '3',
        validUntil: ''
      });
    } catch (error) {
      const err = error as unknown as { message?: string };
      const msg = err?.message || 'Teklif gönderilirken bir hata oluştu';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
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
      setFormData(prev => ({ ...prev, deliveryType: 'shipping', shippingDesi: prev.shippingDesi }));
    } else if (listing.deliveryType === 'pickup' && formData.deliveryType !== 'pickup') {
      setFormData(prev => ({ ...prev, deliveryType: 'pickup', shippingDesi: '', shippingCost: '0' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, listing.condition, listing.deliveryType]);

  const totalPrice = (parseFloat(formData.price) || 0) + (parseFloat(formData.shippingCost) || 0);
  const uiMinAllowed = DataManager.getMinAllowedOfferPriceForListing(listing);
  const desiOptions = DataManager.getAllDesiOptions();
  const selectedRange = formData.shippingDesi ? DataManager.getShippingCostRangeForDesi(formData.shippingDesi) : undefined;
  const isShipping = formData.deliveryType === 'shipping';
  const needsDesi = isShipping && !formData.shippingDesi;
  const shippingCostDisabled = formData.deliveryType === 'pickup' || needsDesi;

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Fiyat (TL) *</Label>
              <Input
                id="price"
                type="number"
                placeholder="0"
                min="1"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Bu ilanda minimum teklif: {DataManager.formatPrice(uiMinAllowed)}</p>
            </div>
            <div>
              <Label htmlFor="condition">Ürün Durumu *</Label>
              <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })} disabled={isFixedCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowNew && <SelectItem value="new">Sıfır</SelectItem>}
                  {allowUsed && <SelectItem value="used">2. El</SelectItem>}
                </SelectContent>
              </Select>
              {isFixedCondition && (
                <p className="text-xs text-muted-foreground mt-1">
                  Bu ilan için ürün durumu sabit: {listing.condition === 'new' ? 'Sıfır' : '2. El'}
                </p>
              )}
            </div>
          </div>

          {/* Brand & Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand">Marka</Label>
              <Input
                id="brand"
                placeholder="Örn: Apple, Samsung"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                placeholder="Örn: iPhone 15 Pro Max"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Ürün Açıklaması *</Label>
            <Textarea
              id="description"
              placeholder="Ürününüzün detaylarını, durumunu, garanti bilgilerini yazın..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          {/* Delivery */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="deliveryType">Teslimat Şekli *</Label>
              <Select 
                value={formData.deliveryType} 
                onValueChange={(value) => {
                  if (value === 'pickup') {
                    setFormData(prev => ({ ...prev, deliveryType: 'pickup', shippingDesi: '', shippingCost: '0' }));
                  } else {
                    setFormData(prev => ({ ...prev, deliveryType: 'shipping' }));
                  }
                }} 
                disabled={isFixedDelivery}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowShipping && <SelectItem value="shipping">Kargo</SelectItem>}
                  {allowPickup && <SelectItem value="pickup">Elden Teslim</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {formData.deliveryType === 'shipping' && (
              <div>
                <Label htmlFor="shippingDesi">Desi (Kargo Paket Tipi) *</Label>
                <Select 
                  value={formData.shippingDesi || ''} 
                  onValueChange={(value) => {
                    const val = value as DesiBracket;
                    const range = DataManager.getShippingCostRangeForDesi(val);
                    setFormData(prev => ({ 
                      ...prev, 
                      shippingDesi: val, 
                      shippingCost: prev.shippingCost && prev.shippingCost !== '0' ? prev.shippingCost : String(range.min) 
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {desiOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label} — {opt.group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.shippingDesi && selectedRange && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Bu desi için izinli kargo ücreti: {DataManager.formatPrice(selectedRange.min)}
                    {typeof selectedRange.max === 'number' ? ` - ${DataManager.formatPrice(selectedRange.max)}` : ' ve üzeri'}
                  </p>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="shippingCost">Kargo Ücreti (TL)</Label>
              <Input
                id="shippingCost"
                type="number"
                placeholder={shippingCostDisabled ? 'Önce desi seçin' : '0'}
                min={formData.deliveryType === 'shipping' && selectedRange ? String(selectedRange.min) : '0'}
                max={formData.deliveryType === 'shipping' && selectedRange && typeof selectedRange.max === 'number' ? String(selectedRange.max) : undefined}
                step="0.01"
                value={formData.shippingCost}
                onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                onBlur={() => {
                  if (!selectedRange) return;
                  const val = parseFloat(formData.shippingCost);
                  if (!Number.isFinite(val)) return;
                  if (typeof selectedRange.max === 'number') {
                    const clamped = Math.min(Math.max(val, selectedRange.min), selectedRange.max);
                    if (clamped !== val) setFormData(prev => ({ ...prev, shippingCost: String(clamped) }));
                  } else {
                    // 100+ desi: sadece alt sınır
                    if (val < selectedRange.min) setFormData(prev => ({ ...prev, shippingCost: String(selectedRange.min) }));
                  }
                }}
                disabled={shippingCostDisabled}
              />
              {isShipping && !formData.shippingDesi && (
                <p className="text-xs text-muted-foreground mt-1">Önce desi aralığını seçiniz.</p>
              )}
              {isShipping && formData.shippingDesi && selectedRange && (
                <p className="text-xs text-muted-foreground mt-1">
                  İzinli aralık: {DataManager.formatPrice(selectedRange.min)}
                  {typeof selectedRange.max === 'number' ? ` - ${DataManager.formatPrice(selectedRange.max)}` : ' ve üzeri'}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="etaDays">Teslimat Süresi (Gün)</Label>
              <Input
                id="etaDays"
                type="number"
                placeholder="3"
                min="1"
                max="30"
                value={formData.etaDays}
                onChange={(e) => setFormData({ ...formData, etaDays: e.target.value })}
              />
            </div>
          </div>

          {/* Valid Until */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="validUntil">Teklif Geçerlilik Tarihi</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                min={minValidStr}
                max={maxValidStr}
              />
              <p className="text-xs text-muted-foreground mt-1">En az +1 gün, en fazla ilan bitiş tarihi</p>
            </div>
          </div>

          {/* Price Summary */}
          {formData.price && (
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Ürün Fiyatı</p>
                    <p className="font-semibold">{DataManager.formatPrice(parseFloat(formData.price) || 0)}</p>
                  </div>
                  {parseFloat(formData.shippingCost) > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Kargo Ücreti</p>
                      <p className="font-semibold">{DataManager.formatPrice(parseFloat(formData.shippingCost))}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam</p>
                    <p className="text-xl font-bold text-green-600">{DataManager.formatPrice(totalPrice)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Gönderiliyor...' : 'Teklif Gönder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}