import React, { useEffect, useMemo, useRef, useState } from 'react';

type ImageMagnifierProps = {
  src: string;
  alt?: string;
  className?: string;
  /** Zoom katsayısı (2 = 200%) */
  zoom?: number;
  /** Zoom panel boyutu (px) */
  zoomPaneSize?: number;
  /** Küçük lensi göster (opsiyonel) */
  showLens?: boolean;
};

export default function ImageMagnifier({
  src,
  alt,
  className,
  zoom = 2,
  zoomPaneSize = 360,
  showLens = false,
}: ImageMagnifierProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [hovering, setHovering] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [disp, setDisp] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.decode?.().catch(() => void 0).finally(() => {
      setNatural({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
      setLoaded(true);
    });
  }, [src]);

  useEffect(() => {
    const updateDisp = () => {
      const el = imgRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDisp({ w: rect.width, h: rect.height });
    };
    updateDisp();
    window.addEventListener('resize', updateDisp);
    return () => window.removeEventListener('resize', updateDisp);
  }, []);

  const onMove = (e: React.MouseEvent) => {
    const host = containerRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPos({ x, y });
  };

  const bg = useMemo(() => {
    if (!natural || !disp.w || !disp.h) return null;
    const ratioX = natural.w / disp.w;
    const ratioY = natural.h / disp.h;
    const scaledW = natural.w * zoom;
    const scaledH = natural.h * zoom;

    // İmleç konumuna göre arkaplan konumu (imleci zoom panelinde ortalamaya çalış)
    let bx = -(pos.x * ratioX * zoom) + zoomPaneSize / 2;
    let by = -(pos.y * ratioY * zoom) + zoomPaneSize / 2;
    // Sınırları kısıtla
    bx = Math.max(Math.min(bx, 0), zoomPaneSize - scaledW);
    by = Math.max(Math.min(by, 0), zoomPaneSize - scaledH);
    return { size: `${scaledW}px ${scaledH}px`, position: `${bx}px ${by}px` };
  }, [natural, disp, pos, zoom, zoomPaneSize]);

  return (
    <div
      className={`relative select-none ${className ?? ''}`}
      ref={containerRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={onMove}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-contain bg-muted rounded-md"
        onContextMenu={(e) => e.preventDefault()}
        draggable={false}
      />

      {/* Lens (opsiyonel) */}
      {showLens && hovering && (
        <div
          className="pointer-events-none absolute hidden lg:block rounded-full border border-border/70 shadow-sm"
          style={{
            width: 120,
            height: 120,
            left: pos.x - 60,
            top: pos.y - 60,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(1px)',
          }}
        />
      )}

      {/* Zoom Panel (desktop) */}
      {loaded && natural && hovering && bg && (
        <div
          className="hidden lg:block absolute top-0 right-0 translate-x-[calc(100%+16px)] z-10 rounded-md border bg-background shadow-md"
          style={{
            width: zoomPaneSize,
            height: zoomPaneSize,
            backgroundImage: `url(${src})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: bg.size as string,
            backgroundPosition: bg.position as string,
          }}
        />
      )}
    </div>
  );
}
