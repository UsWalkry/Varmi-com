import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Görsel amaçlı basit ad/soyad maskeleme: ilk 2 harf görünür, geri kalanı * ile baskılanır
export function maskDisplayName(fullName: string | undefined | null): string {
  if (!fullName) return '**';
  const trimmed = String(fullName).trim();
  if (trimmed.length === 0) return '**';
  if (trimmed.length === 1) return trimmed + '*';
  if (trimmed.length === 2) return trimmed;
  // İlk 2 harf + yıldızlar
  return trimmed.substring(0, 2) + '*'.repeat(Math.min(trimmed.length - 2, 5));
}

// Email maskeleme: user@domain.com -> u***@domain.com
export function maskEmail(email: string | undefined | null): string {
  if (!email) return '****@****.***';
  const parts = email.split('@');
  if (parts.length !== 2) return '****@****.***';
  const [username, domain] = parts;
  if (username.length <= 1) return `*@${domain}`;
  return `${username[0]}${'*'.repeat(Math.min(username.length - 1, 5))}@${domain}`;
}

// Ad maskeleme: ilk 2 harf + yıldızlar
export function maskName(name: string | undefined | null): string {
  if (!name) return '**';
  const trimmed = String(name).trim();
  if (trimmed.length === 0) return '**';
  if (trimmed.length === 1) return trimmed + '*';
  if (trimmed.length === 2) return trimmed;
  return trimmed.substring(0, 2) + '*'.repeat(Math.min(trimmed.length - 2, 3));
}

// UUID generator safe for environments without crypto.randomUUID
export function safeRandomUUID(): string {
  // Browser crypto.randomUUID is widely supported but may be missing in some WebViews
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID && typeof g.crypto.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }
  // Fallback to uuid v4 from dependency
  try {
    const { v4 } = require('uuid');
    return v4();
  } catch {
    // Minimal fallback (not RFC-compliant but unique enough for local/demo mode)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
