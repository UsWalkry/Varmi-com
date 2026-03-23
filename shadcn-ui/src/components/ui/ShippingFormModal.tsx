import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { mysqlAPI } from '@/lib/mysql-api';

interface ShippingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  etaDays?: number;
  onSuccess?: () => void;
}

const CARRIER_COMPANIES = [
  'MNG Kargo',
  'Aras Kargo',
  'Yurtiçi Kargo',
  'PTT Kargo',
  'Sürat Kargo',
  'UPS Kargo',
  'DHL',
  'Kargom',
  'Trendyol Express',
  'Getir',
  'Diğer'
];

export const ShippingFormModal: React.FC<ShippingFormModalProps> = ({
  isOpen,
  onClose,
  orderId,
  etaDays,
  onSuccess
}) => {
  // Otomatik tahmini teslimat tarihi hesaplama
  const calculateEstimatedDelivery = () => {
    if (etaDays && etaDays > 0) {
      const today = new Date();
      const deliveryDate = new Date(today);
      deliveryDate.setDate(today.getDate() + etaDays);
      return deliveryDate;
    }
    return null;
  };

  const [formData, setFormData] = useState({
    trackingNumber: '',
    carrierCompany: '',
    estimatedDelivery: calculateEstimatedDelivery()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      trackingNumber: '',
      carrierCompany: '',
      estimatedDelivery: calculateEstimatedDelivery()
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.trackingNumber.trim()) {
      toast.error('Kargo takip numarası gereklidir');
      return;
    }
    
    if (!formData.carrierCompany) {
      toast.error('Kargo firması seçimi gereklidir');
      return;
    }

    setIsSubmitting(true);

    try {
      const shippingData = {
        trackingNumber: formData.trackingNumber.trim(),
        carrierCompany: formData.carrierCompany,
        estimatedDelivery: formData.estimatedDelivery ? format(formData.estimatedDelivery, 'yyyy-MM-dd') : undefined
      };

      console.log('🚚 Submitting shipping info:', shippingData);

      const result = await mysqlAPI.addShippingInfo(orderId, shippingData);

      if (result.success) {
        toast.success('Kargo bilgileri başarıyla eklendi ve sipariş kargoya verildi');
        resetForm();
        onClose();
        onSuccess?.();
      } else {
        toast.error(result.error || 'Kargo bilgileri eklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Shipping info error:', error);
      toast.error('Kargo bilgileri eklenirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Kargo Bilgileri Ekle
          </DialogTitle>
          <DialogDescription>
            Siparişi kargoya vermek için kargo firması ve takip numarası bilgilerini girin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="carrierCompany">Kargo Firması *</Label>
            <Select
              value={formData.carrierCompany}
              onValueChange={(value) => setFormData(prev => ({ ...prev, carrierCompany: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Kargo firması seçin" />
              </SelectTrigger>
              <SelectContent>
                {CARRIER_COMPANIES.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackingNumber">Kargo Takip Numarası *</Label>
            <Input
              id="trackingNumber"
              placeholder="Örn: 123456789"
              value={formData.trackingNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
              className="w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tahmini Teslim Tarihi</Label>
            <Input
              value={formData.estimatedDelivery ? format(formData.estimatedDelivery, 'PPP', { locale: tr }) : 'Belirtilmemiş'}
              readOnly
              className="w-full bg-gray-50 cursor-default"
              placeholder="Otomatik hesaplanır"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Kaydediliyor...' : 'Kargoya Ver'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShippingFormModal;