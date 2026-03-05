import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  createThumbnail?: boolean;
  thumbnailSize?: number;
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 85,
  format: 'webp',
  createThumbnail: true,
  thumbnailSize: 300
};

/**
 * Resmi optimize et ve thumbnail oluştur
 */
export async function optimizeImage(
  inputPath: string,
  outputPath: string,
  options: ImageOptimizationOptions = {}
): Promise<{ optimized: string; thumbnail?: string; size: number; originalSize: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Orijinal dosya boyutu
    const stats = await fs.stat(inputPath);
    const originalSize = stats.size;

    // Resim işleme
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Boyutlandırma (aspect ratio korunur)
    if (metadata.width && metadata.width > opts.maxWidth! || 
        metadata.height && metadata.height > opts.maxHeight!) {
      image.resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Format dönüşümü ve kalite optimizasyonu
    const outputDir = path.dirname(outputPath);
    const outputName = path.basename(outputPath, path.extname(outputPath));
    const optimizedPath = path.join(outputDir, `${outputName}.${opts.format}`);

    if (opts.format === 'webp') {
      await image.webp({ quality: opts.quality }).toFile(optimizedPath);
    } else if (opts.format === 'jpeg') {
      await image.jpeg({ quality: opts.quality, progressive: true }).toFile(optimizedPath);
    } else {
      await image.png({ quality: opts.quality, compressionLevel: 9 }).toFile(optimizedPath);
    }

    // Dosya boyutu
    const optimizedStats = await fs.stat(optimizedPath);
    const optimizedSize = optimizedStats.size;

    // Thumbnail oluştur
    let thumbnailPath: string | undefined;
    if (opts.createThumbnail) {
      thumbnailPath = path.join(outputDir, `${outputName}_thumb.${opts.format}`);
      await sharp(inputPath)
        .resize(opts.thumbnailSize, opts.thumbnailSize, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);
    }

    logger.info(`Image optimized: ${path.basename(inputPath)} (${(originalSize/1024).toFixed(1)}KB → ${(optimizedSize/1024).toFixed(1)}KB)`);

    return {
      optimized: optimizedPath,
      thumbnail: thumbnailPath,
      size: optimizedSize,
      originalSize
    };

  } catch (error) {
    logger.error('Image optimization error:', error);
    throw error;
  }
}

/**
 * Batch image optimization
 */
export async function optimizeImages(
  inputPaths: string[],
  outputDir: string,
  options: ImageOptimizationOptions = {}
): Promise<Array<{ input: string; output: string; thumbnail?: string }>> {
  const results = [];

  for (const inputPath of inputPaths) {
    try {
      const filename = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(outputDir, filename);
      const result = await optimizeImage(inputPath, outputPath, options);
      results.push({
        input: inputPath,
        output: result.optimized,
        thumbnail: result.thumbnail
      });
    } catch (error) {
      logger.error(`Failed to optimize ${inputPath}:`, error);
    }
  }

  return results;
}

/**
 * Express middleware: Upload edilen resimleri otomatik optimize et
 */
export function imageOptimizationMiddleware(options: ImageOptimizationOptions = {}) {
  return async (req: any, res: any, next: any) => {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    try {
      const optimizedFiles = [];

      for (const file of req.files) {
        const result = await optimizeImage(file.path, file.path, options);
        optimizedFiles.push({
          ...file,
          path: result.optimized,
          thumbnailPath: result.thumbnail,
          originalSize: result.originalSize,
          optimizedSize: result.size
        });
      }

      req.files = optimizedFiles;
      next();
    } catch (error) {
      logger.error('Image optimization middleware error:', error);
      next(error);
    }
  };
}
