// Listings Routes - İlan CRUD İşlemleri
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import jwt from 'jsonwebtoken';
import { query } from '../database.js';
import { redisCache, CacheKeys } from '../utils/redisCache.js';
import { logger } from '../utils/logger.js';
import { generateProductSchema, generateBreadcrumbSchema } from '../utils/schemaGenerator.js';

import { authenticateToken } from './auth.js';
import { sendListingCreatedNotification } from '../services/emailService.js';

const router = Router();

// ES modules için __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Condition normalization helper - supports: new (Sıfır), used/good (2. El), any (Farketmez)
// DB ENUM: ('new', 'like_new', 'good', 'fair', 'poor', 'any')
function normalizeCondition(condition: string | null | undefined): string {
  if (!condition) return 'any'; // Default to 'any' (Farketmez)
  const normalized = condition.toLowerCase().trim();
  // Map frontend values to database ENUM values
  if (normalized === 'new') return 'new';
  if (normalized === 'like_new') return 'like_new';
  if (normalized === 'any') return 'any';
  if (normalized === 'used' || normalized === 'good') return 'good';
  if (normalized === 'fair') return 'fair';
  if (normalized === 'poor') return 'poor';
  return 'any'; // Unknown values default to 'any' (Farketmez)
}

// DeliveryType normalization helper (shipping/pickup -> cargo/hand)
function normalizeDeliveryType(deliveryType: string | null | undefined): string {
  if (!deliveryType) return 'both'; // Default
  const normalized = deliveryType.toLowerCase().trim();
  // Map frontend values to database ENUM values
  if (normalized === 'shipping') return 'cargo';
  if (normalized === 'pickup') return 'hand';
  if (normalized === 'both') return 'both';
  // If already database values
  if (['cargo', 'hand', 'both'].includes(normalized)) return normalized;
  return 'both'; // Invalid values default to 'both'
}

// DeliveryType reverse mapping (cargo/hand -> shipping/pickup for frontend)
function denormalizeDeliveryType(deliveryType: string | null | undefined): string {
  if (!deliveryType) return 'both';
  const normalized = deliveryType.toLowerCase().trim();
  if (normalized === 'cargo') return 'shipping';
  if (normalized === 'hand') return 'pickup';
  if (normalized === 'both') return 'both';
  // If already frontend values
  if (['shipping', 'pickup', 'both'].includes(normalized)) return normalized;
  return 'both';
}

// Kullanıcının kendi ilanlarını getir (specifik route önce)
router.get('/my', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    logger.debug('🔍 User ID from token');
    console.log('🔍 Full user object:', (req as any).user);
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }
    
    const listings = await query(`
      SELECT 
        l.id,
        l.title,
        l.category,
        l.listing_condition,
        l.budget_max,
        l.delivery_type,
        l.city,
        l.description,
        l.images,
        l.status,
        l.approval_status,
        l.rejection_reason,
        l.created_at,
        l.expires_at,
        COALESCE(o.offer_count, 0) as offer_count
      FROM listings l
      LEFT JOIN (
        SELECT listing_id, COUNT(*) as offer_count 
        FROM offers 
        WHERE status IN ('active', 'accepted')
          AND (valid_until IS NULL OR valid_until > NOW())
        GROUP BY listing_id
      ) o ON l.id = o.listing_id
      WHERE l.buyer_id = ?
      ORDER BY l.created_at DESC
    `, [userId]) as any[];

    // Convert numeric fields to proper numbers
    const processedListings = listings.map(listing => ({
      ...listing,
      budget_max: parseFloat(listing.budget_max) || 0,
      budgetMax: parseFloat(listing.budget_max) || 0,
      budgetMin: 0, // Database'de budget_min yok, default 0
      offer_count: parseInt(listing.offer_count) || 0
    }));

    res.json({
      success: true,
      data: processedListings
    });

  } catch (error) {
    console.error('❌ Get my listings error:', error);
    res.status(500).json({
      success: false,
      error: 'İlanlar yüklenirken hata oluştu'
    });
  }
});

// Aktif ilanları getir (Ana sayfa için)
router.get('/active', async (req: Request, res: Response) => {
  logger.info('🔄 GET /api/listings/active - Request received');
  
  try {
    // Süresi geçmiş ilanları otomatik olarak kapat (cache'den ÖNCE!)
    try {
      const expireResult: any = await query(
        `UPDATE listings SET status = 'closed'
         WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW()`
      );
      // Eğer ilan kapandıysa cache'i geçersiz kıl
      if (expireResult?.affectedRows > 0) {
        await redisCache.delete(CacheKeys.listingsActive());
        logger.info(`⏰ ${expireResult.affectedRows} ilan süresi doldu, cache temizlendi`);
      }
    } catch (expireErr) {
      console.warn('⚠️ Auto-expire listings update failed:', expireErr);
    }

    // Check Redis cache
    const cacheKey = CacheKeys.listingsActive();
    const cached = await redisCache.get(cacheKey);
    if (cached) {
      logger.debug('✅ Redis cache hit: listings:active');
      return res.json(cached);
    }
    logger.debug('📍 Executing database query...');

    const listings = await query(`
      SELECT 
        l.id,
        l.title,
        l.category,
        l.listing_condition,
        l.budget_max as price,
        'TRY' as currency,
        l.city as location,
        l.description,
        l.images,
        l.delivery_type,
        l.created_at,
        l.expires_at,
        l.buyer_id as user_id,
        l.view_count,
        l.favorite_count,
        l.is_featured,
        u.firstName as first_name,
        u.lastName as last_name,
        COALESCE(o.offer_count, 0) as offer_count
      FROM listings l
      JOIN users u ON l.buyer_id = u.id
      LEFT JOIN (
        SELECT listing_id, COUNT(*) as offer_count 
        FROM offers 
        WHERE status IN ('active', 'accepted')
          AND (valid_until IS NULL OR valid_until > NOW())
        GROUP BY listing_id
      ) o ON l.id = o.listing_id
      WHERE l.status = 'active' AND l.approval_status = 'approved'
        AND (l.expires_at IS NULL OR l.expires_at > NOW())
      ORDER BY l.created_at DESC
    `) as any[];

    logger.info(`✅ Query successful, found ${listings.length} listings`);
    
    const response = {
      success: true,
      listings: listings.map(listing => {
        // Parse images from JSON string
        let images = [];
        try {
          images = listing.images ? JSON.parse(listing.images) : [];
        } catch (e) {
          console.warn('Failed to parse images JSON:', listing.images);
          images = [];
        }

        return {
          id: listing.id,
          title: listing.title,
          condition: listing.listing_condition,
          price: parseFloat(listing.price) || 0,
          budgetMax: parseFloat(listing.price) || 0, // Frontend budgetMax bekliyor
          currency: listing.currency,
          location: listing.location,
          city: listing.location, // Frontend city alanı da bekliyor
          description: listing.description,
          images: images,
          createdAt: listing.created_at,
          category: listing.category || 'genel', // Backend'den gelen kategori
          deliveryType: denormalizeDeliveryType(listing.delivery_type), // Frontend değerlerine dönüştür
          offerCount: parseInt(listing.offer_count) || 0, // Gerçek teklif sayısı
          viewCount: parseInt(listing.view_count) || 0,
          favoriteCount: parseInt(listing.favorite_count) || 0,
          featured: listing.is_featured === 1,
          expiresAt: listing.expires_at || null,
          buyerId: listing.user_id,
          buyerName: `${listing.first_name} ${listing.last_name}`.trim() || 'Anonim',
          seller: {
            firstName: listing.first_name,
            lastName: listing.last_name
          }
        };
      })
    };
    
    // Cache in Redis for 5 minutes
    await redisCache.set(cacheKey, response, 300);
    logger.debug('💾 Cached to Redis: listings:active');
    
    res.json(response);

  } catch (error) {
    logger.error('❌ Get active listings error:', error);
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({ 
      success: false, 
      error: 'İlanlar getirilirken hata oluştu',
      ...(isProduction ? {} : { details: error instanceof Error ? error.message : String(error) })
    });
  }
});

// Vitrin ilanlarını getir
router.get('/featured', async (req: Request, res: Response) => {
  logger.info('🔄 GET /api/listings/featured - Request received');

  try {
    const listings = await query(`
      SELECT 
        l.id,
        l.title,
        l.category,
        l.listing_condition,
        l.budget_max as price,
        'TRY' as currency,
        l.city as location,
        l.description,
        l.images,
        l.delivery_type,
        l.created_at,
        l.expires_at,
        l.buyer_id as user_id,
        l.view_count,
        l.favorite_count,
        l.is_featured,
        u.firstName as first_name,
        u.lastName as last_name,
        COALESCE(o.offer_count, 0) as offer_count
      FROM listings l
      JOIN users u ON l.buyer_id = u.id
      LEFT JOIN (
        SELECT listing_id, COUNT(*) as offer_count 
        FROM offers 
        WHERE status IN ('active', 'accepted')
          AND (valid_until IS NULL OR valid_until > NOW())
        GROUP BY listing_id
      ) o ON l.id = o.listing_id
      WHERE l.status = 'active' AND l.approval_status = 'approved'
        AND l.is_featured = 1
        AND (l.expires_at IS NULL OR l.expires_at > NOW())
      ORDER BY l.created_at DESC
    `) as any[];

    const response = {
      success: true,
      listings: listings.map(listing => {
        let images = [];
        try {
          images = listing.images ? JSON.parse(listing.images) : [];
        } catch (e) {
          console.warn('Failed to parse images JSON:', listing.images);
          images = [];
        }

        return {
          id: listing.id,
          title: listing.title,
          condition: listing.listing_condition,
          price: parseFloat(listing.price) || 0,
          budgetMax: parseFloat(listing.price) || 0,
          currency: listing.currency,
          location: listing.location,
          city: listing.location,
          description: listing.description,
          images: images,
          createdAt: listing.created_at,
          category: listing.category || 'genel',
          deliveryType: denormalizeDeliveryType(listing.delivery_type),
          offerCount: parseInt(listing.offer_count) || 0,
          viewCount: parseInt(listing.view_count) || 0,
          favoriteCount: parseInt(listing.favorite_count) || 0,
          featured: listing.is_featured === 1,
          expiresAt: listing.expires_at || null,
          buyerId: listing.user_id,
          buyerName: `${listing.first_name} ${listing.last_name}`.trim() || 'Anonim',
          seller: {
            firstName: listing.first_name,
            lastName: listing.last_name
          }
        };
      })
    };

    res.json(response);
  } catch (error) {
    logger.error('❌ Get featured listings error:', error);
    res.status(500).json({ success: false, error: 'Vitrin ilanları yüklenirken hata oluştu' });
  }
});

// Kullanıcının ilanlarını getir
router.get('/my-listings', authenticateToken, async (req: any, res: Response) => {
  try {
    const listings = await query(`
      SELECT 
        l.id,
        l.title,
        l.listing_condition,
        l.budget_max as price,
        'TRY' as currency,
        l.city as location,
        l.description,
        l.images,
        l.status,
        l.delivery_type,
        l.created_at,
        l.updated_at,
        COALESCE(COUNT(o.id), 0) as offer_count,
        u.firstName as first_name,
        u.lastName as last_name
      FROM listings l
      LEFT JOIN offers o ON l.id = o.listing_id
        AND o.status NOT IN ('withdrawn', 'expired')
        AND (o.valid_until IS NULL OR o.valid_until > NOW())
      LEFT JOIN users u ON l.buyer_id = u.id
      WHERE l.buyer_id = ?
      GROUP BY l.id, l.title, l.listing_condition, l.budget_max, l.city, l.description, l.images, l.status, l.delivery_type, l.created_at, l.updated_at, u.firstName, u.lastName
      ORDER BY l.created_at DESC
    `, [req.userId]) as any[];

    console.log('📋 My listings raw data:', listings.map(l => ({ id: l.id, title: l.title })));

    res.json({
      success: true,
      listings: listings.map(listing => {
        // Parse images from JSON string
        let images = [];
        try {
          images = listing.images ? JSON.parse(listing.images) : [];
        } catch (e) {
          console.warn('Failed to parse images JSON:', listing.images);
          images = [];
        }

        return {
          id: listing.id,
          title: listing.title,
          condition: listing.listing_condition,
          price: parseFloat(listing.price) || 0,
          budgetMax: parseFloat(listing.price) || 0, // Frontend budgetMax bekliyor
          budgetMin: parseFloat(listing.price) || 0, // Frontend budgetMin bekliyor
          currency: listing.currency,
          location: listing.location,
          city: listing.location, // Frontend city alanı da bekliyor
          description: listing.description,
          images: images,
          status: listing.status,
          createdAt: listing.created_at,
          updatedAt: listing.updated_at,
          deliveryType: denormalizeDeliveryType(listing.delivery_type), // Frontend değerlerine dönüştür
          offerCount: parseInt(listing.offer_count) || 0, // Teklif sayısı eklendi
          buyerName: `${listing.first_name} ${listing.last_name}`.trim() || 'Anonim',
          seller: {
            firstName: listing.first_name,
            lastName: listing.last_name
          }
        };
      })
    });

  } catch (error) {
    console.error('Get my listings error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'İlanlarınız getirilirken hata oluştu' 
    });
  }
});

// İlan güncelle
router.put('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const listingId = req.params.id;
    const { 
      title, 
      category,
      condition, 
      price, 
      currency, 
      location, 
      description,
      deliveryType,
      expiresAt,
      maskOwnerName,
      status,
      images
    } = req.body;

    // İlanın sahibi kontrol et
    const existingListings = await query(
      'SELECT buyer_id FROM listings WHERE id = ?',
      [listingId]
    ) as any[];

    if (existingListings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'İlan bulunamadı' 
      });
    }

    if (existingListings[0].buyer_id !== req.userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu ilanı güncelleme yetkiniz yok' 
      });
    }

    // Normalize deliveryType
    const normalizedDeliveryType = normalizeDeliveryType(deliveryType);
    
    // Convert ISO date to MySQL DATETIME format
    let expiresAtMySQL = null;
    if (expiresAt) {
      const date = new Date(expiresAt);
      expiresAtMySQL = date.toISOString().slice(0, 19).replace('T', ' ');
    }

    // Prepare images JSON if provided
    const imagesJson = images && Array.isArray(images)
      ? JSON.stringify(images)
      : null;

    // İlanı güncelle - güncelleme sonrası tekrar onaya düşsün
    await query(`
      UPDATE listings 
      SET title = ?, category = ?, listing_condition = ?, budget_max = ?, 
          city = ?, description = ?, delivery_type = ?, expires_at = ?, mask_owner_name = ?, 
          ${imagesJson !== null ? 'images = ?,' : ''}
          status = 'inactive', approval_status = 'pending', updated_at = NOW()
      WHERE id = ?
    `, [
      title,
      category || 'genel', 
      normalizeCondition(condition), 
      parseFloat(price), 
      location, 
      description,
      normalizedDeliveryType,
      expiresAtMySQL,
      maskOwnerName === true,
      ...(imagesJson !== null ? [imagesJson] : []),
      listingId
    ]);
    
    // Admin notification oluştur (tekrar onay için)
    try {
      const { v4: uuidv4 } = await import('uuid');
      const notificationId = uuidv4();
      await query(
        `INSERT INTO admin_notifications (id, type, title, message, listing_id, is_read, created_at)
         VALUES (?, 'listing_resubmitted', ?, ?, ?, FALSE, NOW())`,
        [
          notificationId,
          'İlan Güncellendi - Onay Bekliyor',
          `Bir ilan güncellendi ve yeniden onay bekliyor.`,
          listingId
        ]
      );
      console.log('📧 Admin notification created for updated listing');
    } catch (notifError) {
      console.error('❌ Failed to create admin notification:', notifError);
      // Bildirim hatası olsa bile güncelleme başarılı sayılır
    }

    // Redis cache temizle - ilan pending'e düştü, aktif listeden kalkmalı
    await redisCache.delete(CacheKeys.listingsActive());
    await redisCache.delete(CacheKeys.listing(listingId));
    console.log('🗑️ Redis cache cleared after listing update (back to pending):', listingId);

    res.json({
      success: true,
      message: 'İlan başarıyla güncellendi ve onay için gönderildi'
    });

  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'İlan güncellenirken hata oluştu' 
    });
  }
});

// İlan sil (soft delete)
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const listingId = req.params.id;

    // İlanın sahibi kontrol et
    const existingListings = await query(
      'SELECT buyer_id FROM listings WHERE id = ?',
      [listingId]
    ) as any[];

    if (existingListings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'İlan bulunamadı' 
      });
    }

    if (existingListings[0].buyer_id !== req.userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu ilanı silme yetkiniz yok' 
      });
    }

    // İlanı pasif yap (soft delete)
    await query(
      'UPDATE listings SET status = ?, updated_at = NOW() WHERE id = ?',
      ['deleted', listingId]
    );

    // Redis cache temizle
    await redisCache.delete(CacheKeys.listingsActive());
    await redisCache.delete(CacheKeys.listing(listingId));
    console.log('🗑️ Redis cache cleared after listing delete:', listingId);

    res.json({
      success: true,
      message: 'İlan başarıyla silindi'
    });

  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'İlan silinirken hata oluştu' 
    });
  }
});

// Tek bir ilanı getir (view tracking ile)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const listingId = req.params.id;
    
    // Authentication token kontrol et (opsiyonel - giriş yapmamış kullanıcılar da görebilir)
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.userId;
        console.log('👁️ Logged in user viewing listing:', userId, 'listing:', listingId);
      } catch (tokenError: any) {
        // Token geçersiz ama devam et (giriş yapmamış kullanıcı gibi davran)
        logger.debug('👁️ Invalid token, treating as guest user');
      }
    } else {
      console.log('👁️ Guest user viewing listing:', listingId);
    }

    const listings = await query(`
      SELECT 
        l.id,
        l.title,
        l.category,
        l.listing_condition,
        l.budget_max as price,
        'TRY' as currency,
        l.city as location,
        l.description,
        l.images,
        l.status,
        l.delivery_type,
        l.expires_at,
        l.mask_owner_name,
        l.created_at,
        l.updated_at,
        l.view_count,
        l.favorite_count,
        u.id as seller_id,
        u.firstName as first_name,
        u.lastName as last_name,
        u.email,
        COALESCE(offer_stats.offer_count, 0) as offer_count
      FROM listings l
      JOIN users u ON l.buyer_id = u.id
      LEFT JOIN (
        SELECT 
          listing_id, 
          COUNT(*) as offer_count 
        FROM offers 
        WHERE status IN ('active', 'accepted')
        GROUP BY listing_id
      ) offer_stats ON l.id = offer_stats.listing_id
      WHERE l.id = ? AND (l.status != 'deleted')
    `, [listingId]) as any[];

    if (listings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'İlan bulunamadı' 
      });
    }

    // Aktif olmayan ilanı sadece sahibi görebilir
    const listing = listings[0];
    if (listing.status !== 'active' && userId !== listing.seller_id) {
      return res.status(404).json({ 
        success: false, 
        error: 'İlan bulunamadı' 
      });
    }


    // Sadece giriş yapmış kullanıcılar için view count'u artır
    // Ve kendi ilanını görüntülemiyorsa artır
    if (userId && userId !== listing.seller_id) {
      try {
        await query(
          'UPDATE listings SET view_count = view_count + 1 WHERE id = ?',
          [listingId]
        );
        console.log(`👁️ View count incremented for listing ${listingId} by user ${userId}`);
        
        // Response'ta güncellenmiş view_count'u göster
        listing.view_count = (listing.view_count || 0) + 1;
      } catch (viewError) {
        console.error('View count update error:', viewError);
        // Görüntülenme sayısı artırılamasa da ilan görüntülenmeye devam etsin
      }
    } else if (userId === listing.seller_id) {
      console.log(`👁️ Owner viewing own listing ${listingId}, not incrementing view count`);
    } else {
      console.log(`👁️ Guest user viewing listing ${listingId}, not incrementing view count`);
    }

    // Parse images from JSON string
    let images = [];
    try {
      images = listing.images ? JSON.parse(listing.images) : [];
    } catch (e) {
      console.warn('Failed to parse images JSON:', listing.images);
      images = [];
    }

    res.json({
      success: true,
      listing: {
        id: listing.id,
        title: listing.title,
        category: listing.category,
        condition: listing.listing_condition,
        price: parseFloat(listing.price) || 0,
        budgetMax: parseFloat(listing.price) || 0, // Frontend uyumluluğu için
        currency: listing.currency,
        location: listing.location,
        description: listing.description,
        images: images,
        deliveryType: denormalizeDeliveryType(listing.delivery_type), // Frontend değerlerine dönüştür
        maskOwnerName: listing.mask_owner_name,
        createdAt: listing.created_at,
        updatedAt: listing.updated_at,
        expiresAt: listing.expires_at,
        offerCount: parseInt(listing.offer_count) || 0, // Gerçek teklif sayısı
        viewCount: parseInt(listing.view_count) || 0, // Görüntülenme sayısı
        favoriteCount: parseInt(listing.favorite_count) || 0, // Favori sayısı
        buyerId: listing.seller_id, // buyerId olarak seller_id'yi dönder
        seller: {
          id: listing.seller_id,
          firstName: listing.first_name,
          lastName: listing.last_name,
          email: listing.email
        }
      },
      // Schema.org structured data for SEO
      schema: {
        product: generateProductSchema({
          id: listing.id,
          title: listing.title,
          description: listing.description,
          price: parseFloat(listing.price) || 0,
          currency: listing.currency,
          condition: listing.listing_condition,
          images: images,
          seller: {
            firstName: listing.first_name,
            lastName: listing.last_name
          },
          location: listing.location,
          createdAt: listing.created_at
        }),
        breadcrumb: generateBreadcrumbSchema([
          { name: 'Ana Sayfa', url: 'https://varmii.com' },
          { name: 'İlanlar', url: 'https://varmii.com/listings' },
          { name: listing.category, url: `https://varmii.com/listings?category=${listing.category}` },
          { name: listing.title, url: `https://varmii.com/listing/${listing.id}` }
        ])
      }
    });

  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'İlan getirilirken hata oluştu' 
    });
  }
});

// 🛡️ Multer configuration - GÜÇLÜ FILE VALIDATION
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 🛡️ Magic bytes kontrolü - gerçek dosya tipi doğrulaması
const validateFileType = (buffer: Buffer): boolean => {
  // JPEG magic bytes: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG magic bytes: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // WebP magic bytes: RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
  return false;
};

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Max 10 dosya
  },
  fileFilter: (req, file, cb) => {
    // Extension kontrolü
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    // MIME type kontrolü
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validMime = allowedMimeTypes.includes(file.mimetype);
    
    // Dosya adı sanitize
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    file.originalname = sanitizedName;
    
    if (validMime && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir (jpeg, jpg, png, webp)'));
    }
  }
});

// Create new listing
router.post('/create', authenticateToken, async (req: any, res: Response) => {
  try {
    console.log('🎯 New listing request:', req.body);
    const userId = req.userId;
    
    const {
      title,
      description,
      category,
      city,
      condition,
      deliveryType,
      budgetMax,
      offersPublic,
      offersPurchasable,
      maskOwnerName,
      images
    } = req.body;

    // Debug: Log deliveryType
    console.log('🔍 Listing creation - deliveryType:', deliveryType, 'type:', typeof deliveryType);

    // Validation - city sadece pickup veya both için gerekli
    const cityRequired = deliveryType === 'pickup' || deliveryType === 'both';
    if (!title || !category || !budgetMax || (cityRequired && !city)) {
      return res.status(400).json({
        success: false,
        error: 'Başlık, kategori ve bütçe alanları gereklidir' + (cityRequired ? ' (Şehir de gerekli)' : '')
      });
    }

    // Get user name
    const userResult = await query(
      'SELECT firstName, lastName FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    const userName = `${userResult[0].firstName} ${userResult[0].lastName}`;
    const listingId = uuidv4();

    // Normalize condition to match ENUM values (any -> good)
    const normalizedCondition = normalizeCondition(condition);
    
    // Normalize deliveryType to match ENUM values (shipping -> cargo, pickup -> hand)
    const normalizedDeliveryType = normalizeDeliveryType(deliveryType);
    
    console.log('🔍 Normalized condition:', normalizedCondition, '(from:', condition, ')');
    console.log('🔍 Normalized deliveryType:', normalizedDeliveryType, '(from:', deliveryType, ')');

    // Create listing - YENİ: approval_status = 'pending' olarak kaydet (admin onayı bekleyecek)
    // status = 'inactive' (henüz aktif değil, admin onayı bekliyor)
    await query(
      `INSERT INTO listings (
        id, title, description, category, city, listing_condition, 
        delivery_type, budget_max, buyer_id, buyer_name,
        offers_public, offers_purchasable, mask_owner_name, images,
        expires_at, status, approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), 'inactive', 'pending')`,
      [
        listingId,
        title,
        description || null,
        category,
        city || null,
        normalizedCondition,
        normalizedDeliveryType,
        parseFloat(budgetMax),
        userId,
        userName,
        offersPublic !== false,
        offersPurchasable !== false,
        maskOwnerName === true,
        JSON.stringify(images || [])
      ]
    );

    console.log('✅ Listing created successfully (pending admin approval):', listingId);

    // Admin bildirim kaydı oluştur
    const notificationId = uuidv4();
    await query(
      `INSERT INTO admin_notifications (id, type, title, message, listing_id)
       VALUES (?, 'new_listing', ?, ?, ?)`,
      [
        notificationId,
        'Yeni İlan Onayı Bekliyor',
        `"${title}" başlıklı yeni ilan onayınızı bekliyor.`,
        listingId
      ]
    );

    // İlan oluşturma başarılı yanıtı
    res.json({
      success: true,
      data: {
        listingId,
        message: 'İlan başarıyla oluşturuldu. Admin onayından sonra yayına alınacaktır.',
        requiresApproval: true
      }
    });

    // REMOVED: Email gönderme - Admin onayından sonra gönderilecek
    // İlan henüz pending_approval durumunda, yayında değil
    // Admin onayladığında sendListingApprovedNotification gönderilecek

  } catch (error) {
    console.error('❌ Create listing error:', error);
    res.status(500).json({
      success: false,
      error: 'İlan oluşturma sırasında hata oluştu'
    });
  }
});

// Upload images for listing
router.post('/upload-images', authenticateToken, upload.array('images', 5), async (req: any, res: Response) => {
  try {
    console.log('📸 Image upload request');
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Resim dosyası bulunamadı'
      });
    }

    const imageUrls = req.files.map((file: any) => {
      return `/uploads/${file.filename}`;
    });

    console.log('✅ Images uploaded:', imageUrls);

    res.json({
      success: true,
      data: {
        imageUrls
      }
    });

  } catch (error) {
    console.error('❌ Image upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Resim yükleme sırasında hata oluştu'
    });
  }
});

// Favori toggle endpoint
router.post('/:id/favorite', async (req: Request, res: Response) => {
  try {
    const listingId = req.params.id;
    
    // Authentication zorunlu - favori eklemek için giriş yapmış olmak gerekir
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Favori eklemek için giriş yapmalısınız' 
      });
    }

    let userId;
    try {
      const token = authHeader.substring(7);
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      userId = decoded.userId;
    } catch (tokenError: any) {
      return res.status(401).json({ 
        success: false, 
        error: 'Geçersiz token' 
      });
    }

    // İlan var mı kontrol et
    const listings = await query('SELECT id, buyer_id FROM listings WHERE id = ? AND status = "active"', [listingId]) as any[];
    if (listings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'İlan bulunamadı' 
      });
    }

    // Kendi ilanını favorilemeye çalışıyor mu kontrol et
    const listing = listings[0];
    if (userId === listing.buyer_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Kendi ilanınızı favorilere ekleyemezsiniz' 
      });
    }

    // Zaten favorilerde mi kontrol et
    const existingFavorites = await query(
      'SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?', 
      [userId, listingId]
    ) as any[];

    if (existingFavorites.length > 0) {
      // Favorilerden çıkar
      await query('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?', [userId, listingId]);
      
      // Listing tablosundaki favorite_count'u azalt
      await query('UPDATE listings SET favorite_count = favorite_count - 1 WHERE id = ?', [listingId]);
      
      console.log(`❤️ Favorite removed for listing ${listingId} by user ${userId}`);
      
      res.json({
        success: true,
        action: 'removed',
        message: 'İlan favorilerden çıkarıldı'
      });
    } else {
      // Favorilere ekle
      await query(
        'INSERT INTO favorites (user_id, listing_id) VALUES (?, ?)', 
        [userId, listingId]
      );
      
      // Listing tablosundaki favorite_count'u artır
      await query('UPDATE listings SET favorite_count = favorite_count + 1 WHERE id = ?', [listingId]);
      
      console.log(`❤️ Favorite added for listing ${listingId} by user ${userId}`);
      
      // İlan sahibine bildirim gönder
      try {
        const listingDetails = await query(
          'SELECT l.title, l.buyer_id, u.firstName, u.lastName FROM listings l LEFT JOIN users u ON l.buyer_id = u.id WHERE l.id = ?',
          [listingId]
        ) as any[];
        
        if (listingDetails.length > 0) {
          const listingOwner = listingDetails[0];
          const favUser = await query('SELECT firstName, lastName FROM users WHERE id = ?', [userId]) as any[];
          
          // Bildirim oluştur
          const notificationId = uuidv4();
          await query(
            `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
             VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())`,
            [
              notificationId,
              listingOwner.buyer_id,
              'listing_favorited',
              'İlanınız Favorilere Eklendi',
              `${favUser[0]?.firstName || 'Bir kullanıcı'} "${listingOwner.title}" başlıklı ilanınızı favorilerine ekledi`,
              JSON.stringify({ listingId, userId })
            ]
          );
          
          console.log(`🔔 Notification sent to listing owner ${listingOwner.buyer_id}`);
        }
      } catch (notifError) {
        console.error('❌ Error sending favorite notification:', notifError);
        // Bildirim hatası ana işlemi etkilemesin
      }
      
      res.json({
        success: true,
        action: 'added',
        message: 'İlan favorilere eklendi'
      });
    }

  } catch (error) {
    console.error('❤️ Favorite toggle error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Favori işlemi sırasında hata oluştu' 
    });
  }
});

export default router;