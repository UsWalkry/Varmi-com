import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DataManager, Review } from '@/lib/mockData';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromUserId: string;
  toUserId: string;
  listingId: string;
  offerId: string;
}

export default function ReviewModal({ isOpen, onClose, fromUserId, toUserId, listingId, offerId }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    DataManager.addReview({
      fromUserId,
      toUserId,
      listingId,
      offerId,
      rating,
      comment
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kullanıcıyı Değerlendir</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Puan (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={e => setRating(Number(e.target.value))}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Yorum</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full border rounded px-2 py-1"
              rows={3}
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting || rating < 1 || rating > 5 || !comment} className="w-full">
            Gönder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
