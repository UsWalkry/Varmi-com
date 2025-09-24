import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DesiInfoProps {
  className?: string;
}

/**
 * Kargo paket/desi bilgilendirme bileşeni.
 * Kullanıcının hangi desi aralığını seçmesi gerektiğini anlamasına yardım eder.
 */
export const DesiInfo: React.FC<DesiInfoProps> = ({ className }) => {
  return (
    <div className={cn('rounded-md border bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-4 text-xs sm:text-sm space-y-4', className)}>
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-700 dark:text-blue-300">Paket Boyutu (Desi) Kılavuzu</p>
          <p className="text-blue-700/80 dark:text-blue-200/80">Aşağıdaki örnekler doğru desi aralığını seçmenize yardımcı olur.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <p className="font-medium">Küçük Paket</p>
          <p className="text-blue-700/80 dark:text-blue-200/80 font-semibold">44.99 TL</p>
          <p className="text-muted-foreground leading-snug">≈ 20x20x14 cm</p>
          <p className="text-muted-foreground text-[11px] leading-snug">Tişört, kolye, jean, tayt, gözlük, tıraş makinesi, mayo, saat, telefon, parfüm...</p>
        </div>
        <div className="space-y-1">
          <p className="font-medium">Orta Paket</p>
          <p className="text-blue-700/80 dark:text-blue-200/80 font-semibold">99.99 TL</p>
          <p className="text-muted-foreground leading-snug">≈ 30x31x19 cm</p>
          <p className="text-muted-foreground text-[11px] leading-snug">Mont, çanta, bot, çizme, kamera, puzzle, nevresim takımı...</p>
        </div>
        <div className="space-y-1">
          <p className="font-medium">Büyük Paket</p>
          <p className="text-blue-700/80 dark:text-blue-200/80 font-semibold">Fiyat Al</p>
          <p className="text-blue-700/80 dark:text-blue-200/80 text-[11px]">Başlangıç {`129.99 TL`}</p>
          <p className="text-muted-foreground leading-snug">≈ 60x99x50 cm</p>
          <p className="text-muted-foreground text-[11px] leading-snug">Masa lambası, laptop, duvar saati, çaydanlık, drone, küçük ev aletleri, kırlent...</p>
        </div>
      </div>
      {/* Alt bilgilendirme kaldırıldı */}
    </div>
  );
};

export default DesiInfo;
