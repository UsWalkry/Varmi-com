import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type ImageLightboxProps = {
  images: string[];
  startIndex?: number;
  open: boolean;
  onClose: () => void;
};

export default function ImageLightbox({ images, startIndex = 0, open, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  const prev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, prev, next]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (dx > 50) prev();
    else if (dx < -50) next();
    touchStart.current = null;
  };

  const canNav = images.length > 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 overflow-hidden">
        {/* Top bar */}
        <div className="absolute top-2 right-2 z-20 flex gap-2">
          <Button size="icon" variant="secondary" onClick={onClose} aria-label="Kapat">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Image area */}
        <div className="w-full h-full bg-black/90 flex items-center justify-center relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {canNav && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20"
              onClick={prev}
              aria-label="Önceki"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          <div ref={trackRef} className="max-w-full max-h-full p-4">
            <img
              src={images[index]}
              alt={`Görsel ${index + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-md shadow-lg"
            />
          </div>

          {canNav && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20"
              onClick={next}
              aria-label="Sonraki"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
