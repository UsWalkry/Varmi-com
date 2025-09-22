/**
 * applyWatermarkToDataUrl: Bir görsel dataURL'ine tekrar eden diyagonal metin filigranı uygular.
 * - Büyük boy görseller için performanslı çalışması adına doğrudan ana canvas üzerinde metin döşer.
 */
export type WatermarkOptions = {
  text?: string; // Filigran metni
  opacity?: number; // 0..1 arası saydamlık
  fontSize?: number; // px cinsinden temel font boyutu
  fontFamily?: string; // CSS font ailesi
  color?: string; // Metin rengi
  angle?: number; // Derece cinsinden dönüş açısı (negatif değer sola eğim)
  tileSize?: number; // Döşeme aralığı (px)
  margin?: number; // Kenar boşluğu
  outType?: string; // Çıkış MIME türü: image/webp | image/jpeg | image/png
  quality?: number; // 0..1 arası kalite (webp/jpeg için)
};

export async function applyWatermarkToDataUrl(
  dataUrl: string,
  opts: WatermarkOptions = {}
): Promise<string> {
  const {
  text = 'var mıı?',
    opacity = 0.2,
    fontSize = 24,
    fontFamily = 'sans-serif',
    color = '#000000',
    angle = -30,
    tileSize = 200,
    margin = 0,
    outType,
    quality = 0.9,
  } = opts;

  const img = await loadImage(dataUrl);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  // Orijinal görseli çiz
  ctx.drawImage(img, 0, 0, width, height);

  // Filigran metnini döşeyelim
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px ${fontFamily}`;

  // Dönüş açısını radyana çevirip merkezden döndür
  const rad = (angle * Math.PI) / 180;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(rad);

  // Döşemeyi, döndürülmüş koordinat sisteminde yapalım
  const cols = Math.ceil((width + 2 * margin) / tileSize) + 2;
  const rows = Math.ceil((height + 2 * margin) / tileSize) + 2;
  const startX = -((cols * tileSize) / 2);
  const startY = -((rows * tileSize) / 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * tileSize;
      const y = startY + r * tileSize;
      ctx.fillText(text, x, y);
    }
  }

  ctx.restore();

  // Çıkış MIME türünü dataURL'den tahmin et veya parametreyi kullan
  const inferredType = outType || inferMimeFromDataUrl(dataUrl) || 'image/webp';
  try {
    return canvas.toDataURL(inferredType, quality);
  } catch {
    // Tarayıcı desteklemiyorsa PNG'ye düş
    return canvas.toDataURL('image/png');
  }
}

function inferMimeFromDataUrl(url: string): string | null {
  const m = /^data:(image\/(?:png|jpeg|jpg|webp));base64,/.exec(url);
  if (m) return m[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : m[1];
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}
