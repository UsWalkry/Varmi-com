import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { mysqlAPI } from '@/lib/mysql-api';
import { toast } from 'sonner';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  sellerName?: string;
  onSubmitted?: () => void;
}

export default function ReviewModal({ isOpen, onClose, orderId, sellerName, onSubmitted }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRating(5);
      setComment('');
    }
  }, [isOpen]);

  const ratingButtons = useMemo(() => Array.from({ length: 5 }), []);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error('Lütfen kısa bir yorum ekleyin');
      return;
    }

    setSubmitting(true);
    try {
      console.log('🔄 Submitting review:', { orderId, rating, comment: comment.trim() });
      
      const response = await mysqlAPI.submitOrderReview(orderId, {
        rating,
        comment: comment.trim()
      });

      console.log('📡 Review submission response:', response);

      if (response?.success) {
        toast.success('Değerlendirme kaydedildi');
        onSubmitted?.();
        onClose();
      } else {
        console.error('❌ Review submission failed:', response);
        toast.error(response?.error || 'Değerlendirme kaydedilemedi');
      }
    } catch (error) {
      console.error('💥 Review submit error:', error);
      toast.error('Değerlendirme kaydedilirken hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Sipariş Detayları
          </DialogTitle>
          <div className="text-sm text-muted-foreground mt-2">
            Sipariş detayını görüntüleyebilmek için satış sonrası teklif vereni değerlendirmen gerekli.
          </div>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Puan</Label>
            <div className="flex items-center gap-2">
              {ratingButtons.map((_, idx) => {
                const starValue = idx + 1;
                const active = starValue <= rating;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setRating(starValue)}
                    className={`p-1 rounded transition-colors ${active ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-400'}`}
                    aria-label={`${starValue} yıldız seç`}
                    disabled={submitting}
                  >
                    <Star className="h-6 w-6 fill-current" strokeWidth={active ? 0 : 1.5} />
                  </button>
                );
              })}
              <span className="text-sm text-muted-foreground">{rating} / 5</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-review-comment">Yorum</Label>
            <Textarea
              id="order-review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              placeholder="Satıcı deneyimini kısaca anlat"
              disabled={submitting}
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting || rating < 1 || rating > 5 || !comment.trim()} className="w-full">
            {submitting ? 'Gönderiliyor...' : 'Değerlendir'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
