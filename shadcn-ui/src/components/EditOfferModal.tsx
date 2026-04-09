import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { mysqlAPI } from '@/lib/mysql-api';
import { toast } from 'sonner';
import { type DesiBracket, DataManager } from '@/lib/mockData';
import Stepper from '@/components/ui/stepper';
import DesiInfo from '@/components/DesiInfo';
import { Dialog as SubDialog, DialogContent as SubDialogContent, DialogHeader as SubDialogHeader, DialogTitle as SubDialogTitle } from '@/components/ui/dialog';

interface Offer {
  id: number;
  listingId?: number;
  listing_id?: number;
  price: number;
  quantity?: number;
  condition?: string;
  offer_condition?: string;
  productName?: string;
  product_name?: string;
  description?: string;
  deliveryType?: string;
  delivery_type?: string;
  shippingDesi?: DesiBracket;
  shipping_desi?: DesiBracket;
  shippingCost?: number;
  shipping_cost?: number;
  etaDays?: number;
  eta_days?: number;
  validUntil?: string;
  valid_until?: string;
  status?: string;
}

interface EditOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer;
  onOfferUpdated: () => void;
}

const PACKAGE_LABELS: Record<'small' | 'medium' | 'large', string> = {
  small: 'Küçük Paket',
  medium: 'Orta Paket',
  large: 'Büyük Paket'
};

const PACKAGE_FIXED_COST: Record<'small' | 'medium', number> = {
  small: 44.99,
  medium: 99.99
};

const PACKAGE_DESI_MAP: Record<'small' | 'medium' | 'large', DesiBracket> = {
  small: '0-1',
  medium: '6-10',
  large: '31-40'
};

export default function EditOfferModal({
  isOpen,
  onClose,
  offer,
  onOfferUpdated
}: EditOfferModalProps) {
  const [formData, setFormData] = useState({
    price: '',
    quantity: '1',
    condition: 'new',
    productName: '',
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);

  // Initialize form with offer data
  useEffect(() => {
    if (offer && isOpen) {
      const desi = (offer.shippingDesi || offer.shipping_desi || '') as '' | DesiBracket;
      let pkg: '' | 'small' | 'medium' | 'large' = '';
      
      // Determine package type from desi
      if (desi === '0-1') pkg = 'small';
      else if (desi === '6-10') pkg = 'medium';
      else if (desi) pkg = 'large';

      setFormData({
        price: String(offer.price || ''),
        quantity: String(offer.quantity || 1),
        condition: offer.condition || offer.offer_condition || 'new',
        productName: offer.productName || offer.product_name || '',
        description: offer.description || '',
        deliveryType: offer.deliveryType || offer.delivery_type || 'shipping',
        shippingDesi: desi,
        shippingPackage: pkg,
        largeWidth: '',
        largeHeight: '',
        largeLength: '',
        computedDesi: '',
        shippingCost: String(offer.shippingCost || offer.shipping_cost || 0),
        etaDays: String(offer.etaDays || offer.eta_days || 3),
        validUntil: offer.validUntil || offer.valid_until || ''
      });
    }
  }, [offer, isOpen]);

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
    }
    if (s === 2) {
      if (!formData.productName.trim()) {
        toast.error('Ürün adı zorunlu');
        return false;
      }
      if (!formData.description.trim()) {
        toast.error('Ürün açıklaması zorunlu');
        return false;
      }
      if (formData.deliveryType === 'shipping') {
        if (!formData.shippingPackage) {
          toast.error('Paket tipi seçin');
          return false;
        }
        if (formData.shippingPackage === 'large') {
          const w = parseFloat(formData.largeWidth);
          const h = parseFloat(formData.largeHeight);
          const l = parseFloat(formData.largeLength);
          if (!w || !h || !l) {
            toast.error('Büyük paket için tüm ölçüleri girin');
            return false;
          }
        }
        const shippingCost = parseFloat(formData.shippingCost);
        if (!Number.isFinite(shippingCost) || shippingCost <= 0) {
          toast.error('Geçerli kargo ücreti bulunamadı');
          return false;
        }
      } else if (formData.deliveryType === 'pickup') {
        if (parseFloat(formData.shippingCost) !== 0) {
          toast.error('Elden teslimde kargo ücreti 0 olmalı');
          return false;
        }
      }
    }
    return true;
  };

  const goNext = () => {
    if (validateStep(step)) setStep(p => Math.min(p + 1, 3));
  };

  const goBack = () => setStep(p => Math.max(p - 1, 1));

  const handleFinalSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) return;

    setIsSubmitting(true);

    try {
      const updateData = {
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        condition: formData.condition,
        productName: formData.productName.trim(),
        description: formData.description.trim(),
        deliveryType: formData.deliveryType,
        shippingDesi: formData.deliveryType === 'shipping' ? formData.shippingDesi : null,
        shippingCost: parseFloat(formData.shippingCost),
        etaDays: parseInt(formData.etaDays),
        validUntil: formData.validUntil || null
      };

      const response = await mysqlAPI.updateOffer(String(offer.id), updateData);

      if (response.success) {
        toast.success('✅ Teklifiniz başarıyla güncellendi. Admin onayından sonra yayınlanacaktır.');
        onOfferUpdated();
        onClose();
        setStep(1);
      } else {
        toast.error(response.error || 'Teklif güncellenirken hata oluştu');
      }
    } catch (error: any) {
      console.error('Error updating offer:', error);
      toast.error(error.message || 'Teklif güncellenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPackage = (pkg: 'small' | 'medium' | 'large') => {
    if (pkg === 'small' || pkg === 'medium') {
      const cost = PACKAGE_FIXED_COST[pkg];
      const desi = PACKAGE_DESI_MAP[pkg];
      setFormData(prev => ({
        ...prev,
        shippingPackage: pkg,
        shippingDesi: desi,
        shippingCost: cost.toFixed(2),
        largeWidth: '',
        largeHeight: '',
        largeLength: '',
        computedDesi: ''
      }));
      setIsPackageDialogOpen(false);
    } else {
      setFormData(prev => ({
        ...prev,
        shippingPackage: 'large',
        shippingDesi: PACKAGE_DESI_MAP.large,
        shippingCost: '129.99'
      }));
    }
  };

  const handleComputeLarge = () => {
    const w = parseFloat(formData.largeWidth);
    const h = parseFloat(formData.largeHeight);
    const l = parseFloat(formData.largeLength);
    
    if (!w || !h || !l) {
      toast.error('Tüm ölçüleri girin');
      return;
    }

    const desiVal = (w * h * l) / 3000;
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
    
    setFormData(prev => ({
      ...prev,
      computedDesi: String(rounded),
      shippingDesi: bracket,
      shippingCost: estimate.toFixed(2)
    }));
  };

  const totalPrice = (parseFloat(formData.price) || 0) + (parseFloat(formData.shippingCost) || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Teklifi Düzenle</DialogTitle>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">{formData.productName}</p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <Stepper
            current={step}
            steps={[
              { id: 1, title: 'Fiyat & Temel', description: 'Fiyat, durum, adet' },
              { id: 2, title: 'Detaylar', description: 'Ürün adı, açıklama, kargo & süre' },
              { id: 3, title: 'Önizleme', description: 'Kontrol & güncelle' }
            ]}
            onStepClick={(id) => { if (id < step) setStep(id); }}
          />

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Fiyat (₺) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Adet *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ürün Durumu *</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) => setFormData({ ...formData, condition: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Sıfır</SelectItem>
                      <SelectItem value="used">2. El</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label>Ürün Adı *</Label>
                <Input
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="Ürün adını girin"
                />
              </div>

              <div>
                <Label>Ürün Açıklaması *</Label>
                <Textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ürün detayları, garanti, kullanım durumu..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                <div>
                  <Label>Teslimat Şekli *</Label>
                  <Select
                    value={formData.deliveryType}
                    onValueChange={(value) => {
                      if (value === 'pickup') {
                        setFormData(prev => ({ ...prev, deliveryType: 'pickup', shippingDesi: '', shippingCost: '0' }));
                      } else {
                        setFormData(prev => ({ ...prev, deliveryType: 'shipping' }));
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shipping">Kargo</SelectItem>
                      <SelectItem value="pickup">Elden Teslim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.deliveryType === 'shipping' && (
                  <div>
                    <Label className="block mb-1">Paket *</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsPackageDialogOpen(true)} className="shrink-0">
                        {formData.shippingPackage ? PACKAGE_LABELS[formData.shippingPackage] : 'Paket Seç'}
                      </Button>
                      {formData.shippingPackage && (
                        <span className="text-xs text-muted-foreground">
                          {PACKAGE_LABELS[formData.shippingPackage]} — Kargo: {parseFloat(formData.shippingCost).toFixed(2)} ₺
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Kargo Ücreti (₺)</Label>
                  <Input type="number" value={formData.shippingCost} disabled={true} />
                </div>

                <div>
                  <Label>Kargoya Teslim Süresi (gün)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.etaDays}
                    onChange={(e) => setFormData({ ...formData, etaDays: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Geçerlilik Tarihi</Label>
                  <Input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Önizleme</h3>
                <p className="text-sm text-muted-foreground">Güncellemeden önce bilgileri kontrol edin.</p>
              </div>
              <Card>
                <CardContent className="p-4 space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-medium">Fiyat:</span> {formData.price} ₺</div>
                    <div><span className="font-medium">Adet:</span> {formData.quantity}</div>
                    <div><span className="font-medium">Durum:</span> {formData.condition === 'new' ? 'Sıfır' : '2. El'}</div>
                    <div className="col-span-2"><span className="font-medium">Ürün Adı:</span> {formData.productName || '-'}</div>
                    <div><span className="font-medium">Teslimat:</span> {formData.deliveryType === 'shipping' ? 'Kargo' : 'Elden Teslim'}</div>
                    {formData.deliveryType === 'shipping' && <div><span className="font-medium">Paket:</span> {formData.shippingPackage ? PACKAGE_LABELS[formData.shippingPackage] : '-'}</div>}
                    {formData.deliveryType === 'shipping' && <div><span className="font-medium">Kargo:</span> {parseFloat(formData.shippingCost) > 0 ? formData.shippingCost + ' ₺' : '-'}</div>}
                    <div><span className="font-medium">Kargoya Teslim Süresi:</span> {formData.etaDays} gün</div>
                    <div><span className="font-medium">Geçerlilik:</span> {formData.validUntil || '-'}</div>
                    <div className="col-span-2">
                      <span className="font-medium">Açıklama:</span>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{formData.description}</p>
                    </div>
                  </div>
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
            <Button variant="outline" onClick={() => (step === 1 ? onClose() : goBack())} className="flex-1">
              {step === 1 ? 'İptal' : 'Geri'}
            </Button>
            {step < 3 && <Button onClick={goNext} className="flex-1">Devam</Button>}
            {step === 3 && (
              <Button onClick={handleFinalSubmit} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Güncelleniyor...' : 'Güncelle'}
              </Button>
            )}
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
              <Card
                className={`cursor-pointer border-2 ${formData.shippingPackage === 'small' ? 'border-orange-500' : 'border-transparent hover:border-orange-300'} transition`}
                onClick={() => handleSelectPackage('small')}
              >
                <CardContent className="p-4 space-y-1 text-sm">
                  <p className="font-semibold">Küçük Paket</p>
                  <p className="text-orange-600 font-medium">44.99 ₺</p>
                  <p className="text-muted-foreground text-xs leading-snug">Tişört, kolye, telefon, saat...</p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer border-2 ${formData.shippingPackage === 'medium' ? 'border-orange-500' : 'border-transparent hover:border-orange-300'} transition`}
                onClick={() => handleSelectPackage('medium')}
              >
                <CardContent className="p-4 space-y-1 text-sm">
                  <p className="font-semibold">Orta Paket</p>
                  <p className="text-orange-600 font-medium">99.99 ₺</p>
                  <p className="text-muted-foreground text-xs leading-snug">Mont, çanta, bot, puzzle...</p>
                </CardContent>
              </Card>
            </div>
            <div className={`border rounded-md p-4 space-y-3 ${formData.shippingPackage === 'large' ? 'ring-2 ring-orange-500' : ''}`}>
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
                      <Input
                        value={formData.largeWidth}
                        onChange={(e) => setFormData(p => ({ ...p, largeWidth: e.target.value }))}
                        type="number"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Boy (cm)</Label>
                      <Input
                        value={formData.largeHeight}
                        onChange={(e) => setFormData(p => ({ ...p, largeHeight: e.target.value }))}
                        type="number"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Yükseklik (cm)</Label>
                      <Input
                        value={formData.largeLength}
                        onChange={(e) => setFormData(p => ({ ...p, largeLength: e.target.value }))}
                        type="number"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button size="sm" onClick={handleComputeLarge}>Hesapla</Button>
                    {formData.computedDesi && (
                      <p className="text-xs text-muted-foreground">
                        ≈ {formData.computedDesi} desi • {parseFloat(formData.shippingCost).toFixed(2)} ₺
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Formül: (En x Boy x Yükseklik) / 3000. Tahmini kargo fiyatıdır.
                  </p>
                </div>
              )}
            </div>
            <DesiInfo className="mt-2" />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setIsPackageDialogOpen(false)}>Kapat</Button>
              {formData.shippingPackage && (
                <Button size="sm" onClick={() => setIsPackageDialogOpen(false)}>Onayla</Button>
              )}
            </div>
          </div>
        </SubDialogContent>
      </SubDialog>
    </Dialog>
  );
}
