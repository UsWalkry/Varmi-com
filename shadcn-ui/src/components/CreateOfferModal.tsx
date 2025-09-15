import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Listing, DataManager } from '@/lib/mockData';
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
    shippingCost: '0',
    etaDays: '3'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = DataManager.getCurrentUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('Teklif vermek için giriş yapmalısınız');
      return;
    }

    const price = parseFloat(formData.price);
    const shippingCost = parseFloat(formData.shippingCost);
    const etaDays = parseInt(formData.etaDays);

    if (!price || price <= 0) {
      toast.error('Geçerli bir fiyat giriniz');
      return;
    }

    if (price < listing.budgetMin || price > listing.budgetMax) {
      toast.error(`Fiyat ${DataManager.formatPrice(listing.budgetMin)} - ${DataManager.formatPrice(listing.budgetMax)} aralığında olmalıdır`);
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Ürün açıklaması gereklidir');
      return;
    }

    setIsSubmitting(true);

    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7); // 7 gün geçerli

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
        shippingCost,
        etaDays,
        status: 'active',
        validUntil: validUntil.toISOString()
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
        shippingCost: '0',
        etaDays: '3'
      });
    } catch (error) {
      toast.error('Teklif gönderilirken bir hata oluştu');
      console.error('Error creating offer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPrice = (parseFloat(formData.price) || 0) + (parseFloat(formData.shippingCost) || 0);

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
            </div>
            <div>
              <Label htmlFor="condition">Ürün Durumu *</Label>
              <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Sıfır</SelectItem>
                  <SelectItem value="used">2. El</SelectItem>
                </SelectContent>
              </Select>
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="deliveryType">Teslimat Şekli *</Label>
              <Select value={formData.deliveryType} onValueChange={(value) => setFormData({ ...formData, deliveryType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shipping">Kargo</SelectItem>
                  <SelectItem value="pickup">Elden Teslim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="shippingCost">Kargo Ücreti (TL)</Label>
              <Input
                id="shippingCost"
                type="number"
                placeholder="0"
                min="0"
                step="0.01"
                value={formData.shippingCost}
                onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                disabled={formData.deliveryType === 'pickup'}
              />
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