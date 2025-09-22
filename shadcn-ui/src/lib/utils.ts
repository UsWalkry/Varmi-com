import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Görsel amaçlı basit ad/soyad maskeleme: sadece ilk kelime (ad) görünür, diğerleri ** ile baskılanır
export function maskDisplayName(fullName: string | undefined | null): string {
  if (!fullName) return '';
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length <= 1) return parts[0];
  const first = parts[0];
  const restMasked = parts.slice(1).map(() => '**');
  return [first, ...restMasked].join(' ');
}
