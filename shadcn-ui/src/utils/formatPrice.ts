/**
 * Türk Lirası formatında fiyat formatlama fonksiyonu
 * Örnek: 34343 -> "34.343,00 TL"
 */
export const formatPrice = (price: number | string): string => {
  // Convert to number if it's a string
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (typeof numPrice !== 'number' || isNaN(numPrice)) {
    return '0,00 TL';
  }

  // Türkiye'deki sayı formatı: binlik ayırıcı nokta, ondalık ayırıcı virgül
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numPrice);
};

/**
 * Sadece sayı kısmını formatlar (TL eklemez)
 * Örnek: 34343 -> "34.343,00"
 */
export const formatPriceNumber = (price: number | string): string => {
  // Convert to number if it's a string
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (typeof numPrice !== 'number' || isNaN(numPrice)) {
    return '0,00';
  }

  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numPrice);
};

/**
 * Kısa format (ondalık kısmı göstermez)
 * Örnek: 34343 -> "34.343 TL"
 */
export const formatPriceShort = (price: number | string): string => {
  // Convert to number if it's a string
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (typeof numPrice !== 'number' || isNaN(numPrice)) {
    return '0 TL';
  }

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numPrice);
};