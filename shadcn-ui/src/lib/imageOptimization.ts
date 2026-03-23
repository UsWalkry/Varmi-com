/**
 * Image Optimization Utility
 * WebP support with fallback for high-traffic e-commerce
 */

/**
 * Get optimized image URL with WebP support
 * - Checks WebP browser support
 * - Returns WebP URL if supported, original otherwise
 * - Works with backend API image URLs
 */
export function getOptimizedImageUrl(originalUrl: string): string {
  if (!originalUrl) return '';
  
  // Check if browser supports WebP (client-side only)
  if (typeof window === 'undefined') return originalUrl;
  
  // Check WebP support (cached in sessionStorage)
  const webpSupported = checkWebPSupport();
  
  // If WebP supported and image is from our API, request WebP version
  if (webpSupported && (originalUrl.includes('/api/') || originalUrl.includes('/uploads/'))) {
    // Add webp query parameter to trigger backend conversion
    const url = new URL(originalUrl, window.location.origin);
    url.searchParams.set('format', 'webp');
    return url.toString();
  }
  
  return originalUrl;
}

/**
 * Check WebP support (one-time check, cached in sessionStorage)
 */
function checkWebPSupport(): boolean {
  // Check cache first
  const cached = sessionStorage.getItem('webp-support');
  if (cached !== null) {
    return cached === 'true';
  }
  
  // Test WebP support
  const elem = document.createElement('canvas');
  if (elem.getContext && elem.getContext('2d')) {
    const supported = elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    sessionStorage.setItem('webp-support', String(supported));
    return supported;
  }
  
  return false;
}

/**
 * Generate srcset for responsive images
 * Creates multiple image sizes for different screen resolutions
 */
export function getResponsiveSrcSet(baseUrl: string, sizes: number[] = [320, 640, 960, 1280]): string {
  if (!baseUrl) return '';
  
  return sizes
    .map(size => {
      const url = new URL(baseUrl, window.location.origin);
      url.searchParams.set('width', String(size));
      return `${url.toString()} ${size}w`;
    })
    .join(', ');
}

/**
 * Preload critical images for better performance
 * Use for above-the-fold images
 */
export function preloadImage(url: string): void {
  if (typeof window === 'undefined' || !url) return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = getOptimizedImageUrl(url);
  document.head.appendChild(link);
}

/**
 * Lazy load image with Intersection Observer
 * Returns a ref callback to attach to img element
 */
export function useLazyImage() {
  if (typeof window === 'undefined') return () => {};
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            img.src = getOptimizedImageUrl(src);
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    },
    {
      rootMargin: '50px', // Load 50px before entering viewport
    }
  );
  
  return (element: HTMLImageElement | null) => {
    if (element) observer.observe(element);
  };
}

/**
 * Calculate image aspect ratio for placeholder
 */
export function getImageAspectRatio(width: number, height: number): string {
  return `${(height / width) * 100}%`;
}

/**
 * Generate blur placeholder data URL
 * Tiny base64 image for instant loading
 */
export function getBlurPlaceholder(color: string = '#f0f0f0'): string {
  // 1x1 pixel PNG in specified color
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='${encodeURIComponent(color)}' width='1' height='1'/%3E%3C/svg%3E`;
}

export default {
  getOptimizedImageUrl,
  getResponsiveSrcSet,
  preloadImage,
  useLazyImage,
  getImageAspectRatio,
  getBlurPlaceholder,
};
