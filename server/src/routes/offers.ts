import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';
import { authenticateToken } from './auth.js';
import { sendOfferNotification, sendPurchaseNotification } from '../services/emailService.js';
import { localFileService } from '../services/localFileService.js';
import { query, dbConfig } from '../database.js';
import * as commissionService from '../services/commissionService.js';
import { logger } from '../utils/logger.js';
import { redisCache, CacheKeys } from '../utils/redisCache.js';

const router = express.Router();

let paymentStatusColumnEnsured = false;

// Normalize delivery_type from frontend values to DB ENUM values
function normalizeDeliveryType(deliveryType: string | null | undefined): string {
  if (!deliveryType) return 'both';
  const normalized = deliveryType.toLowerCase().trim();
  if (normalized === 'shipping') return 'cargo';
  if (normalized === 'pickup') return 'hand';
  if (normalized === 'both') return 'both';
  if (['cargo', 'hand', 'both'].includes(normalized)) return normalized;
  return 'both';
}

async function ensureOrderSchema(connection: mysql.Connection) {
  if (paymentStatusColumnEnsured) {
    return;
  }

  try {
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = 'orders' AND column_name = 'payment_status'`,
      [dbConfig.database]
    );

    if ((columns as any[]).length === 0) {
      logger.info('ℹ️  Adding missing payment_status column to orders table');
      await connection.execute(
        `ALTER TABLE orders ADD COLUMN payment_status ENUM('pending','paid','refunded') DEFAULT 'pending' AFTER status`
      );
      logger.info('✅ payment_status column added to orders table');
    }

    paymentStatusColumnEnsured = true;
  } catch (error) {
    console.error('❌ Failed to ensure orders schema:', error);
    throw error;
  }
}

// Kullanıcının kendi tekliflerini getir (specifik route önce)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    logger.debug('🔍 Offers - User ID from token');
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }
    
    // Check Redis cache
    const cacheKey = `${CacheKeys.USER_OFFERS}:${userId}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) {
      logger.debug(`✅ Redis cache hit: offers for user ${userId}`);
      return res.json({ success: true, offers: cached });
    }
    
    const offers = await query(`
      SELECT 
        o.id,
        o.listing_id,
        o.price,
        o.quantity,
        o.offer_condition as \`condition\`,
        o.product_name,
        o.description,
        o.delivery_type,
        o.shipping_desi,
        o.shipping_cost,
        o.eta_days,
        o.status,
        o.approval_status,
        o.approved_by,
        o.approved_at,
        o.rejection_reason,
        o.created_at,
        o.valid_until,
        o.images,
        l.title as listing_title,
        l.category as listing_category,
        CONCAT(u.firstName, ' ', u.lastName) as buyer_name
      FROM offers o
      JOIN listings l ON o.listing_id = l.id
      JOIN users u ON l.buyer_id = u.id
      WHERE o.seller_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);

    // Process offers to convert price fields to numbers
    const processedOffers = (offers as any[]).map((offer: any) => ({
      ...offer,
      price: parseFloat(offer.price) || 0,
      shipping_cost: parseFloat(offer.shipping_cost) || 0
    }));

    // Cache in Redis for 3 minutes
    await redisCache.set(cacheKey, processedOffers, 180);
    logger.debug(`💾 Redis cache set: offers for user ${userId}`);

    res.json({
      success: true,
      data: processedOffers
    });

  } catch (error) {
    console.error('❌ Get my offers error:', error);
    res.status(500).json({
      success: false,
      error: 'Teklifler yüklenirken hata oluştu'
    });
  }
});

// Create a new offer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }

    // Satıcı profili kontrolü - SADECE SIFIR ÜRÜN İSTEYEN İLANLARDA ZORUNLU
    console.log('🔍 Checking seller profile requirement for user:', userId);

    const { listing_id: listingIdForCheck } = req.body;

    // Fetch listing condition to decide if seller profile is required
    let sellerProfileRequired = false;
    if (listingIdForCheck) {
      const listingCondCheck = await query(
        'SELECT listing_condition FROM listings WHERE id = ?',
        [listingIdForCheck]
      );
      if ((listingCondCheck as any[]).length > 0) {
        const cond = (listingCondCheck as any[])[0].listing_condition;
        // Only require seller profile for new-product listings
        sellerProfileRequired = (cond === 'new');
        console.log(`🔍 Listing condition: ${cond} → seller profile required: ${sellerProfileRequired}`);
      }
    }

    if (sellerProfileRequired) {
      const userCheck = await query(
        'SELECT is_verified_seller FROM users WHERE id = ?',
        [userId]
      );

      if ((userCheck as any[]).length === 0) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }

      const isVerifiedSeller = (userCheck as any[])[0].is_verified_seller;
      console.log('🔍 Is verified seller:', isVerifiedSeller);

      if (!isVerifiedSeller) {
        console.log('❌ User is not a verified seller, cannot make offer for new-product listing');
        return res.status(403).json({
          error: 'Teklif verebilmek için satıcı profilinizi oluşturup onay almanız gerekmektedir',
          code: 'SELLER_PROFILE_REQUIRED',
          requiresSellerProfile: true
        });
      }
    }

    const {
      listing_id,
      price,
      quantity,
      condition,
      product_name,
      description,
      delivery_type,
      shipping_desi,
      shipping_cost,
      eta_days,
      valid_until,
      images
    } = req.body;

    console.log('Create offer request body:', req.body);
    console.log('Parameters:', {
      listing_id, userId, seller_name: 'will be set', price, quantity, condition, 
      product_name, description, delivery_type, shipping_desi, shipping_cost, 
      eta_days, valid_until, images
    });

    // Validation
    if (!listing_id || !price || !quantity || !condition || !delivery_type) {
      return res.status(400).json({ error: 'Gerekli alanlar eksik' });
    }

    // Check if user already has an active offer for this listing
    // Note: Users can replace pending/rejected offers, but not approved/active ones
    const existingOffers = await query(
      `SELECT id, status, approval_status, created_at 
       FROM offers 
       WHERE listing_id = ? 
         AND seller_id = ? 
         AND status != 'withdrawn'
         AND (approval_status = 'approved' OR status = 'active')`,
      [listing_id, userId]
    );
    
    console.log('🔍 Duplicate check - Found active/approved offers:', existingOffers);
    
    if ((existingOffers as any[]).length > 0) {
      console.log('❌ Duplicate offer detected:', (existingOffers as any[])[0]);
      return res.status(400).json({ error: 'Bu ilana zaten bir teklif verdiniz' });
    }
    
    // Delete any pending or rejected offers from this user for this listing
    // (They can submit a new one to replace it)
    const deletedOffers = await query(
      `DELETE FROM offers 
       WHERE listing_id = ? 
         AND seller_id = ? 
         AND status != 'withdrawn'
         AND approval_status IN ('pending', 'rejected')`,
      [listing_id, userId]
    );
    
    if ((deletedOffers as any).affectedRows > 0) {
      console.log(`🗑️ Deleted ${(deletedOffers as any).affectedRows} pending/rejected offer(s) for replacement`);
    }

    // Get user info for seller details
    const userRows = await query(
      `SELECT firstName, lastName FROM users WHERE id = ?`,
      [userId]
    );
    
    const user = (userRows as any[])[0];
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const seller_name = (user.firstName && user.lastName) ? `${user.firstName} ${user.lastName}` : 'Anonim Kullanıcı';
    const offerId = uuidv4();
    
    // Images'ı local file system'a upload et
    let imageUrls: string[] = [];
    if (images && Array.isArray(images) && images.length > 0) {
      try {
        console.log(`📸 Uploading ${images.length} images locally for offer ${offerId}`);
        imageUrls = await localFileService.uploadImages(images, offerId);
        console.log(`✅ Successfully uploaded ${imageUrls.length} images locally`);
      } catch (error) {
        console.error('❌ Local file upload failed:', error);
        // Images upload başarısız olsa bile offer'ı oluşturmaya devam et
        imageUrls = [];
      }
    }
    
    // Convert ISO date to MySQL DATETIME format
    let validUntilMySQL = null;
    if (valid_until) {
      const date = new Date(valid_until);
      validUntilMySQL = date.toISOString().slice(0, 19).replace('T', ' ');
    }
    
    // Normalize delivery_type for DB
    const normalizedDeliveryType = normalizeDeliveryType(delivery_type);

    // Normalize condition: Flutter sends 'used' but DB ENUM only has 'new','like_new','good','fair','poor'
    const conditionMap: Record<string, string> = { 'used': 'good' };
    const normalizedCondition = conditionMap[condition] ?? condition;
    
    // Insert new offer (pending approval olarak başlar)
    const result = await query(
      `INSERT INTO offers (
        id, listing_id, seller_id, seller_name, seller_rating,
        price, quantity, offer_condition, product_name, description,
        delivery_type, shipping_desi, shipping_cost, eta_days,
        status, approval_status, valid_until, images, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'inactive', 'pending', ?, ?, NOW(), NOW())`,
      [
        offerId, listing_id, userId, seller_name, 5.0, // Default rating
        price, quantity, normalizedCondition, product_name || null, description || null,
        normalizedDeliveryType, shipping_desi || null, shipping_cost || 0, eta_days || 3,
        validUntilMySQL, imageUrls.length > 0 ? JSON.stringify(imageUrls) : null
      ]
    );

    // Admin notification oluştur (yeni teklif için)
    try {
      const notificationId = uuidv4();
      await query(
        `INSERT INTO admin_notifications (id, type, title, message, offer_id, is_read, created_at)
         VALUES (?, 'new_offer', ?, ?, ?, FALSE, NOW())`,
        [
          notificationId,
          'Yeni Teklif Onay Bekliyor',
          `${seller_name} bir teklif verdi. İncelemeniz gerekiyor.`,
          offerId
        ]
      );
      console.log('✅ Admin bildirimi oluşturuldu');
    } catch (notifError) {
      console.error('❌ Admin bildirimi oluşturulamadı:', notifError);
    }

    // NOT: Email bildirimi admin onayından sonra gönderilecek

    // Return the created offer
    const newOffer = await query(
      `SELECT * FROM offers WHERE id = ?`,
      [offerId]
    );
    
    res.status(201).json((newOffer as any[])[0]);
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ error: 'Teklif oluşturulurken hata oluştu' });
  }
});

// Get offers by user (seller)
router.get('/my-offers', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }
    
    console.log('🔍 /my-offers - User ID:', userId);
    
    const rows = await query(
      `SELECT 
        o.id,
        o.listing_id,
        o.seller_id,
        o.seller_name,
        o.seller_rating,
        o.price,
        o.quantity,
        o.sold_quantity,
        o.images,
        o.offer_condition,
        o.product_name,
        o.brand,
        o.model,
        o.description,
        o.delivery_type as offer_delivery_type,
        o.shipping_desi,
        o.shipping_cost,
        o.eta_days,
        o.status,
        o.accepted_at,
        o.valid_until,
        o.message,
        o.sold_to_others,
        o.created_at,
        o.updated_at,
        l.title as listing_title, 
        l.category,
        l.description as listing_description,
        l.budget_max as listing_budget,
        l.listing_condition,
        l.city as listing_location,
        l.images as listing_images,
        l.created_at as listing_created_at,
        l.delivery_type,
        l.offers_public,
        l.status as listing_status,
        CONCAT(u.firstName, ' ', u.lastName) as listing_owner_name,
        u.email as listing_owner_email
       FROM offers o 
       JOIN listings l ON o.listing_id = l.id 
       LEFT JOIN users u ON l.buyer_id = u.id
       WHERE o.seller_id = ? 
       ORDER BY o.created_at DESC`,
      [userId]
    );
    
    const mappedOffers = (rows as any[]).map(row => {
      // Parse listing images
      let listingImages = [];
      try {
        listingImages = row.listing_images ? JSON.parse(row.listing_images) : [];
      } catch (e) {
        console.warn('Failed to parse listing images:', row.listing_images);
        listingImages = [];
      }

      return {
        // Offer fields
        id: row.id,
        listing_id: row.listing_id,
        seller_id: row.seller_id,
        seller_name: row.seller_name,
        seller_rating: row.seller_rating,
        price: row.price,
        quantity: row.quantity,
        sold_quantity: row.sold_quantity,
        message: row.message,
        product_name: row.product_name,
        brand: row.brand,
        model: row.model,
        description: row.description,
        condition: row.offer_condition,
        images: row.images,
        delivery_type: row.offer_delivery_type,
        shipping_desi: row.shipping_desi,
        shipping_cost: row.shipping_cost,
        eta_days: row.eta_days,
        valid_until: row.valid_until,
        status: row.status,
        accepted_at: row.accepted_at,
        sold_to_others: row.sold_to_others,
        created_at: row.created_at,
        updated_at: row.updated_at,
        
        // Listing details
        listing: {
          title: row.listing_title,
          description: row.listing_description,
          category: row.category,
          budget_max: row.listing_budget,
          condition: row.listing_condition,
          location: row.listing_location,
          images: listingImages,
          created_at: row.listing_created_at,
          delivery_type: row.delivery_type,
          offers_public: row.offers_public,
          status: row.listing_status,
          owner: {
            name: row.listing_owner_name,
            email: row.listing_owner_email
          }
        }
      };
    });
    
    console.log('🔍 Raw database rows count:', (rows as any[]).length);
    if ((rows as any[]).length > 0) {
      console.log('🔍 First row images field:', (rows as any[])[0].images);
      console.log('🔍 First row listing_images field:', (rows as any[])[0].listing_images);
    }
    
    console.log('🔍 Mapped offers count:', mappedOffers.length);
    if (mappedOffers.length > 0) {
      console.log('🔍 First mapped offer images:', mappedOffers[0].images);
      console.log('🔍 First mapped offer listing images:', mappedOffers[0].listing?.images);
    }
    
    res.json({
      success: true,
      offers: mappedOffers
    });
  } catch (error) {
    console.error('Get my offers error:', error);
    res.status(500).json({ error: 'Teklifleriniz alınırken hata oluştu' });
  }
});

// Get incoming offers for user's listings
router.get('/incoming', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }
    
    console.log('🔍 Incoming offers debug - User ID:', userId);
    
    // Get offers for user's listings (user is the buyer/listing owner)
    const rows = await query(
      `SELECT 
        o.id,
        o.listing_id,
        o.seller_id,
        o.seller_name,
        o.seller_rating,
        o.price,
        o.quantity,
        o.sold_quantity,
        o.images,
        o.offer_condition,
        o.product_name,
        o.brand,
        o.model,
        o.description,
        o.delivery_type as offer_delivery_type,
        o.shipping_desi,
        o.shipping_cost,
        o.eta_days,
        o.status,
        o.accepted_at,
        o.valid_until,
        o.message,
        o.sold_to_others,
        o.created_at,
        o.updated_at,
        l.title as listing_title, 
        l.category,
        l.description as listing_description,
        l.budget_max as listing_budget,
        l.listing_condition,
        l.city as listing_location,
        l.images as listing_images,
        l.created_at as listing_created_at,
        l.delivery_type,
        l.offers_public,
        l.status as listing_status,
        l.buyer_id as listing_buyer_id
       FROM offers o 
       JOIN listings l ON o.listing_id = l.id 
       WHERE l.buyer_id = ? 
       ORDER BY o.created_at DESC`,
      [userId]
    );
    
    console.log('🔍 SQL query result - Rows found:', (rows as any[]).length);
    console.log('🔍 First row (if exists):', (rows as any[])[0] || 'No rows found');
    
    // Debug: Let's also check what listings this user owns
    const userListings = await query(
      `SELECT id, title, buyer_id FROM listings WHERE buyer_id = ?`,
      [userId]
    );
    console.log('🔍 User listings:', userListings);
    
    // Debug: Let's check all offers regardless of buyer
    const allOffers = await query(
      `SELECT o.id, o.listing_id, l.buyer_id, l.title FROM offers o JOIN listings l ON o.listing_id = l.id LIMIT 5`
    );
    console.log('🔍 Sample offers with buyer IDs:', allOffers);
    
    const mappedOffers = (rows as any[]).map(row => {
      // Parse listing images
      let listingImages = [];
      try {
        listingImages = row.listing_images ? JSON.parse(row.listing_images) : [];
      } catch (e) {
        console.warn('Failed to parse listing images:', row.listing_images);
        listingImages = [];
      }

      return {
        // Offer fields
        id: row.id,
        listing_id: row.listing_id,
        seller_id: row.seller_id,
        seller_name: row.seller_name,
        seller_rating: row.seller_rating,
        price: row.price,
        quantity: row.quantity,
        sold_quantity: row.sold_quantity,
        message: row.message,
        product_name: row.product_name,
        brand: row.brand,
        model: row.model,
        description: row.description,
        condition: row.offer_condition,
        images: row.images,
        delivery_type: row.offer_delivery_type,
        shipping_desi: row.shipping_desi,
        shipping_cost: row.shipping_cost,
        eta_days: row.eta_days,
        valid_until: row.valid_until,
        status: row.status,
        accepted_at: row.accepted_at,
        sold_to_others: row.sold_to_others,
        created_at: row.created_at,
        updated_at: row.updated_at,
        
        // Listing details
        listing: {
          title: row.listing_title,
          description: row.listing_description,
          category: row.category,
          budget_max: row.listing_budget,
          condition: row.listing_condition,
          location: row.listing_location,
          images: listingImages,
          created_at: row.listing_created_at,
          delivery_type: row.delivery_type,
          offers_public: row.offers_public,
          status: row.listing_status
        }
      };
    });
    
    console.log('🔍 Incoming offers raw count:', (rows as any[]).length);
    if ((rows as any[]).length > 0) {
      console.log('🔍 First incoming offer images:', (rows as any[])[0].images);
      console.log('🔍 First incoming listing images:', (rows as any[])[0].listing_images);
    }
    
    console.log('🔍 Mapped incoming offers count:', mappedOffers.length);
    if (mappedOffers.length > 0) {
      console.log('🔍 First mapped incoming offer images:', mappedOffers[0].images);
      console.log('🔍 First mapped incoming listing images:', mappedOffers[0].listing?.images);
    }
    
    res.json({
      success: true,
      offers: mappedOffers
    });
  } catch (error) {
    console.error('Get incoming offers error:', error);
    res.status(500).json({ error: 'Gelen teklifler alınırken hata oluştu' });
  }
});

// Get single offer by ID
router.get('/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;
    
    const rows = await query(`
      SELECT 
        o.*,
        CONCAT(u.firstName, ' ', u.lastName) as seller_name,
        u.email as seller_email
      FROM offers o
      JOIN users u ON o.seller_id = u.id
      WHERE o.id = ?
    `, [offerId]);
    
    const offer = (rows as any[])[0];
    if (!offer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Teklif bulunamadı' 
      });
    }
    
    res.json({
      success: true,
      offer
    });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Teklif alınırken hata oluştu' 
    });
  }
});

// Update offer status
router.patch('/:offerId/status', authenticateToken, async (req, res) => {
  try {
    const { offerId } = req.params;
    const { status } = req.body;
    const userId = (req as any).user?.userId || (req as any).userId;
    
    if (!['active', 'withdrawn', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Geçersiz durum' });
    }
    
    // Check if user owns this offer or the listing
    const offerRows = await query(
      `SELECT o.*, l.buyer_id 
       FROM offers o 
       JOIN listings l ON o.listing_id = l.id 
       WHERE o.id = ?`,
      [offerId]
    );
    
    const offer = (offerRows as any[])[0];
    if (!offer) {
      return res.status(404).json({ error: 'Teklif bulunamadı' });
    }
    
    // User can withdraw their own offer or listing owner can accept/reject offers
    const canUpdate = offer.seller_id === userId || offer.buyer_id === userId;
    if (!canUpdate) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }
    
    await query(
      `UPDATE offers SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, offerId]
    );
    
    res.json({ message: 'Teklif durumu güncellendi' });
  } catch (error) {
    console.error('Update offer status error:', error);
    res.status(500).json({ error: 'Teklif durumu güncellenirken hata oluştu' });
  }
});

// Update offer details (price, quantity, description, etc.)
router.put('/:offerId', authenticateToken, async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = (req as any).user?.userId || (req as any).userId;
    
    // Check if user owns this offer
    const offerRows = await query(
      `SELECT * FROM offers WHERE id = ?`,
      [offerId]
    );
    
    const offer = (offerRows as any[])[0];
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Teklif bulunamadı' });
    }
    
    // Only the seller (offer owner) can edit their offer
    if (offer.seller_id !== userId) {
      return res.status(403).json({ success: false, error: 'Bu teklifi düzenleme yetkiniz yok' });
    }
    
    // Kabul edilmiş, geri çekilmiş veya reddedilmiş teklifler düzenlenemez
    if (['accepted', 'withdrawn', 'rejected'].includes(offer.status)) {
      return res.status(400).json({ success: false, error: 'Bu teklif artık düzenlenemez' });
    }
    
    const {
      price,
      quantity,
      condition,
      productName,
      description,
      deliveryType,
      shippingDesi,
      shippingCost,
      etaDays,
      validUntil,
      images
    } = req.body;
    
    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    
    if (price !== undefined) {
      updates.push('price = ?');
      values.push(price);
    }
    if (quantity !== undefined) {
      updates.push('quantity = ?');
      values.push(quantity);
    }
    if (condition !== undefined) {
      updates.push('offer_condition = ?');
      values.push(condition);
    }
    if (productName !== undefined) {
      updates.push('product_name = ?');
      values.push(productName);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (deliveryType !== undefined) {
      updates.push('delivery_type = ?');
      values.push(normalizeDeliveryType(deliveryType));
    }
    if (shippingDesi !== undefined) {
      updates.push('shipping_desi = ?');
      values.push(shippingDesi);
    }
    if (shippingCost !== undefined) {
      updates.push('shipping_cost = ?');
      values.push(shippingCost);
    }
    if (etaDays !== undefined) {
      updates.push('eta_days = ?');
      values.push(etaDays);
    }
    if (validUntil !== undefined) {
      updates.push('valid_until = ?');
      // Convert ISO date to MySQL DATETIME format
      let validUntilMySQL = null;
      if (validUntil) {
        const date = new Date(validUntil);
        validUntilMySQL = date.toISOString().slice(0, 19).replace('T', ' ');
      }
      values.push(validUntilMySQL);
    }
    if (images !== undefined && Array.isArray(images)) {
      updates.push('images = ?');
      values.push(JSON.stringify(images));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Güncellenecek alan belirtilmedi' });
    }
    
    // Teklif güncellendikten sonra tekrar onaya düşsün
    updates.push('approval_status = ?');
    values.push('pending');
    updates.push('status = ?');
    values.push('inactive');
    updates.push('updated_at = NOW()');
    values.push(offerId);
    
    const sql = `UPDATE offers SET ${updates.join(', ')} WHERE id = ?`;
    
    await query(sql, values);

    // Admin notification oluştur (tekrar onay için)
    try {
      const notificationId = uuidv4();
      await query(
        `INSERT INTO admin_notifications (id, type, title, message, offer_id, is_read, created_at)
         VALUES (?, 'offer_resubmitted', ?, ?, ?, FALSE, NOW())`,
        [
          notificationId,
          'Teklif Güncellendi - Onay Bekliyor',
          `Bir teklif güncellendi ve yeniden onay bekliyor.`,
          offerId
        ]
      );
      console.log('✅ Admin bildirimi oluşturuldu (teklif güncelleme)');
    } catch (notifError) {
      console.error('❌ Admin bildirimi oluşturulamadı:', notifError);
    }
    
    console.log('✅ Teklif güncellendi:', { offerId, userId, updates: updates.length });
    
    res.json({ 
      success: true, 
      message: 'Teklif başarıyla güncellendi' 
    });
  } catch (error) {
    console.error('❌ Update offer error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Teklif güncellenirken hata oluştu' 
    });
  }
});

// Get offers for a specific listing
router.get('/listing/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    console.log('🔍 API: Getting offers for listing:', listingId);

    // Süresi dolmuş teklifleri otomatik olarak 'expired' statüsüne geçir
    try {
      await query(
        `UPDATE offers SET status = 'expired'
         WHERE listing_id = ? AND status = 'active'
         AND valid_until IS NOT NULL AND valid_until < NOW()`,
        [listingId]
      );
    } catch (expireErr) {
      console.warn('⚠️ Auto-expire update failed:', expireErr);
    }

    let rows: any[] = [];
    try {
      // Prefer real ratings from user_reviews if table exists
      // Only return approved AND active AND not-expired offers
      // For verified sellers, show store name instead of personal name
      rows = await query(`
        SELECT 
          o.*,
          CONCAT(u.firstName, ' ', u.lastName) as seller_name,
          u.email as seller_email,
          u.email_verified as seller_email_verified,
          u.is_verified_seller,
          sp.store_name,
          COALESCE(r.avg_rating, 0) as seller_rating,
          COALESCE(r.rating_count, 0) as seller_rating_count
        FROM offers o
        JOIN users u ON o.seller_id = u.id
        LEFT JOIN seller_profiles sp ON u.seller_profile_id = sp.id
        LEFT JOIN (
          SELECT reviewee_id as seller_id, AVG(rating) as avg_rating, COUNT(*) as rating_count
          FROM user_reviews
          GROUP BY reviewee_id
        ) r ON r.seller_id = o.seller_id
        WHERE o.listing_id = ? AND o.approval_status = 'approved'
          AND o.status = 'active'
          AND (o.valid_until IS NULL OR o.valid_until > NOW())
        ORDER BY o.created_at DESC
      `, [listingId]) as any[];
    } catch (ratingJoinError) {
      // Fallback: user_reviews tablosu yoksa veya başka bir hata olursa, placeholder değerlerle dön
      console.warn('⚠️ user_reviews join failed, falling back to placeholder ratings:', ratingJoinError);
      rows = await query(`
        SELECT 
          o.*,
          CONCAT(u.firstName, ' ', u.lastName) as seller_name,
          u.email as seller_email,
          u.email_verified as seller_email_verified,
          u.is_verified_seller,
          sp.store_name,
          0.0 as seller_rating,
          0 as seller_rating_count
        FROM offers o
        JOIN users u ON o.seller_id = u.id
        LEFT JOIN seller_profiles sp ON u.seller_profile_id = sp.id
        WHERE o.listing_id = ? AND o.approval_status = 'approved'
          AND o.status = 'active'
          AND (o.valid_until IS NULL OR o.valid_until > NOW())
        ORDER BY o.created_at DESC
      `, [listingId]) as any[];
    }

    console.log(`📊 API: Found ${rows.length} offers for listing ${listingId}`);
    if (rows.length > 0) {
      console.log('📋 API: First offer rating snapshot:', {
        id: rows[0].id,
        seller_rating: rows[0].seller_rating,
        seller_rating_count: rows[0].seller_rating_count
      });
    }

    res.json({
      success: true,
      offers: rows
    });
  } catch (error) {
    console.error('Get listing offers error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Teklifler alınırken hata oluştu' 
    });
  }
});

// Purchase offer endpoint
router.post('/:offerId/purchase', authenticateToken, async (req, res) => {
  let connection: any;
  try {
    const { offerId } = req.params;
    const userId = (req as any).user?.userId || (req as any).userId;
    const {
      quantity,
      totalAmount,
      userInfo,
      paymentInfo,
      useCommissionBalance = false,
      commissionAmount = 0
    } = req.body;

    console.log('🛒 Satın alma işlemi başladı:', {
      offerId,
      userId,
      quantity,
      totalAmount,
      useCommissionBalance,
      commissionAmount,
      userInfo: userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'undefined',
      hasUserInfo: !!userInfo,
      hasPaymentInfo: !!paymentInfo
    });

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }

    // Detailed validation with logging
    console.log('🔍 Validation check:', {
      quantity: !!quantity,
      totalAmount: !!totalAmount,
      userInfo: !!userInfo,
      paymentInfo: !!paymentInfo,
      useCommissionBalance,
      commissionAmount,
      actualValues: { quantity, totalAmount, userInfo, paymentInfo }
    });

    if (!quantity || !totalAmount || !userInfo || !paymentInfo) {
      console.log('❌ Validation failed - missing fields');
      return res.status(400).json({ error: 'Gerekli alanlar eksik' });
    }

  // Create MySQL connection
  connection = await mysql.createConnection(dbConfig);

  // Ensure orders table has required columns before proceeding
  await ensureOrderSchema(connection);

  await connection.beginTransaction();

    // Get offer details
    const [offerRows] = await connection.execute(
      'SELECT * FROM offers WHERE id = ?',
      [offerId]
    );

    if (offerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Teklif bulunamadı' });
    }

    const offer = offerRows[0];

    // Check stock availability
    const availableStock = offer.quantity - (offer.sold_quantity || 0);
    if (quantity > availableStock) {
      await connection.rollback();
      return res.status(400).json({ 
        error: `Yeterli stok yok. Mevcut stok: ${availableStock}` 
      });
    }

    // Create order record
    const orderId = uuidv4();
    const shippingAddress = `${userInfo.address}, ${userInfo.city} ${userInfo.postalCode || ''}`;
    
    // Insert into orders table
    const effectiveShippingCost = offer.delivery_type === 'shipping'
      ? parseFloat(offer.shipping_cost ?? 0)
      : 0;

    // Get listing owner ID for commission calculation
    const [listingRows]: any = await connection.execute(
      'SELECT buyer_id FROM listings WHERE id = ?',
      [offer.listing_id]
    );
    const listingOwnerId = listingRows[0]?.buyer_id;

    // Calculate commissions
    const commissions = await commissionService.calculateCommissions(
      totalAmount,
      userId, // buyer (current user)
      offer.seller_id, // seller (offer owner)
      listingOwnerId // listing owner
    );

    // Komisyon bakiyesi ile ödeme kontrolü
    let actualCommissionUsed = 0;
    if (useCommissionBalance && commissionAmount > 0) {
      // Kullanıcının bakiyesini kontrol et
      const [userRows]: any = await connection.execute(
        'SELECT commission_balance FROM users WHERE id = ?',
        [userId]
      );
      
      if (userRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }

      const currentBalance = parseFloat(userRows[0].commission_balance || 0);
      
      // Kullanıcının istediği kadar komisyon kullanmasına izin ver, ama bakiyesinden fazla kullanmasın
      actualCommissionUsed = Math.min(commissionAmount, currentBalance, totalAmount);

      if (actualCommissionUsed > 0) {
        // Komisyon bakiyesinden düş
        await connection.execute(
          'UPDATE users SET commission_balance = commission_balance - ? WHERE id = ?',
          [actualCommissionUsed, userId]
        );

        // İşlemi kaydet
        const transactionId = uuidv4();
        await connection.execute(`
          INSERT INTO commission_transactions (
            id, user_id, order_id, transaction_type, amount, description, created_at
          ) VALUES (?, ?, ?, 'withdrawn', ?, ?, NOW())
        `, [
          transactionId,
          userId,
          orderId,
          actualCommissionUsed,
          `Sipariş ödemesinde kullanıldı (Sipariş: ${orderId.substring(0, 8)})`
        ]);

        console.log('💰 Komisyon bakiyesi kullanıldı:', {
          userId,
          requestedAmount: commissionAmount,
          actualUsed: actualCommissionUsed,
          remainingBalance: currentBalance - actualCommissionUsed
        });
      }
    }

    await connection.execute(`
      INSERT INTO orders (
        id, user_id, buyer_id, seller_id, listing_id, source_offer_id,
        status, total_amount, shipping_cost, shipping_address, 
        commission_to_listing_owner, commission_to_seller,
        commission_rate_listing, commission_rate_seller,
        commission_used,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      orderId,
      userId, // user_id (foreign key constraint için)
      userId, // buyer_id
      offer.seller_id,
      offer.listing_id,
      offerId,
      'confirmed',
      totalAmount,
      effectiveShippingCost,
      shippingAddress,
      commissions.commissionToListingOwner,
      commissions.commissionToSeller,
      commissions.listingOwnerRate,
      commissions.sellerRate,
      actualCommissionUsed
    ]);

    // Transfer commissions to users
    if (commissions.commissionToListingOwner > 0) {
      await connection.execute(`
        UPDATE users 
        SET commission_balance = commission_balance + ?,
            total_commission_earned = total_commission_earned + ?
        WHERE id = ?
      `, [
        commissions.commissionToListingOwner,
        commissions.commissionToListingOwner,
        listingOwnerId
      ]);

      // Record transaction
      const txId = uuidv4();
      await connection.execute(`
        INSERT INTO commission_transactions (
          id, user_id, order_id, transaction_type, amount, description, created_at
        ) VALUES (?, ?, ?, 'earned', ?, ?, NOW())
      `, [
        txId,
        listingOwnerId,
        orderId,
        commissions.commissionToListingOwner,
        `İlan üzerinden satış komisyonu (Sipariş: ${orderId.substring(0, 8)})`
      ]);

      console.log('💰 İlan sahibine komisyon eklendi:', {
        userId: listingOwnerId,
        amount: commissions.commissionToListingOwner
      });
    }

    if (commissions.commissionToSeller > 0) {
      await connection.execute(`
        UPDATE users 
        SET commission_balance = commission_balance + ?,
            total_commission_earned = total_commission_earned + ?
        WHERE id = ?
      `, [
        commissions.commissionToSeller,
        commissions.commissionToSeller,
        offer.seller_id
      ]);

      // Record transaction
      const txId = uuidv4();
      await connection.execute(`
        INSERT INTO commission_transactions (
          id, user_id, order_id, transaction_type, amount, description, created_at
        ) VALUES (?, ?, ?, 'earned', ?, ?, NOW())
      `, [
        txId,
        offer.seller_id,
        orderId,
        commissions.commissionToSeller,
        `Teklif satış komisyonu (Sipariş: ${orderId.substring(0, 8)})`
      ]);

      console.log('💰 Satıcıya komisyon eklendi:', {
        userId: offer.seller_id,
        amount: commissions.commissionToSeller
      });
    }

    // Mark commissions as paid in order
    if (commissions.commissionToListingOwner > 0 || commissions.commissionToSeller > 0) {
      await connection.execute(`
        UPDATE orders SET commission_paid = 1, commission_paid_at = NOW() WHERE id = ?
      `, [orderId]);
    }

    // Insert into order_items table
    await connection.execute(`
      INSERT INTO order_items (
        order_id, listing_id, offer_id, title, description, price, quantity, image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId,
      offer.listing_id,
      offerId,
      offer.product_name || 'Ürün',
      offer.description || '',
      offer.price,
      quantity,
      offer.images ? JSON.parse(offer.images)[0] : null
    ]);

    // Insert into order_tracking table
    await connection.execute(`
      INSERT INTO order_tracking (
        order_id, status, description
      ) VALUES (?, ?, ?)
    `, [
      orderId,
      'Sipariş Alındı',
      'Siparişiniz başarıyla alındı ve işleme konuldu'
    ]);

    // Insert into order_sellers table
    const [orderSellerRows] = await connection.execute(
      'SELECT firstName, lastName, email FROM users WHERE id = ?',
      [offer.seller_id]
    );
    
    const orderSeller = orderSellerRows[0];
    if (orderSeller) {
      await connection.execute(`
        INSERT INTO order_sellers (
          order_id, seller_id, seller_name, seller_email
        ) VALUES (?, ?, ?, ?)
      `, [
        orderId,
        offer.seller_id,
        (orderSeller.firstName && orderSeller.lastName) ? `${orderSeller.firstName} ${orderSeller.lastName}` : 'Anonim Satıcı',
        orderSeller.email
      ]);
    }

    // Update offer sold quantity and sold_to_others
    console.log('📦 Stok güncelleniyor...', {
      offerId,
      eskiSoldQuantity: offer.sold_quantity || 0,
      eskiSoldToOthers: offer.sold_to_others || 0,
      eklenenMiktar: quantity,
      yeniSoldQuantity: (offer.sold_quantity || 0) + quantity,
      yeniSoldToOthers: (offer.sold_to_others || 0) + quantity
    });
    
    await connection.execute(
      'UPDATE offers SET sold_quantity = sold_quantity + ?, sold_to_others = sold_to_others + ? WHERE id = ?',
      [quantity, quantity, offerId]
    );

    console.log('✅ Stok başarıyla güncellendi! (sold_quantity ve sold_to_others)');

    // Mark offer as accepted when order is created
    await connection.execute(
      'UPDATE offers SET status = ?, accepted_at = NOW() WHERE id = ? AND status != ?',
      ['accepted', offerId, 'sold']
    );
    
    console.log('✅ Teklif kabul edildi olarak işaretlendi');

    // Check if offer is fully sold and update status
    const newSoldQuantity = (offer.sold_quantity || 0) + quantity;
    if (newSoldQuantity >= offer.quantity) {
      await connection.execute(
        'UPDATE offers SET status = ? WHERE id = ?',
        ['sold', offerId]
      );
      console.log('✅ Teklif tamamen satıldı olarak işaretlendi');
    }

    // Get seller details for email notification
    const [emailSellerRows] = await connection.execute(
      'SELECT firstName, lastName, email FROM users WHERE id = ?',
      [offer.seller_id]
    );

    const emailSeller = (emailSellerRows as any[])[0];

    // Commit transaction
    await connection.commit();

    // Send email notification to seller
    if (emailSeller?.email) {
      console.log('📧 Email bildirimi gönderiliyor...', {
        sellerEmail: emailSeller.email,
        sellerName: emailSeller.name,
        productName: offer.product_name
      });
      
      try {
        await sendPurchaseNotification(
          userId, // buyer id
          offer.seller_id, // seller id  
          offer.product_name,
          totalAmount,
          parseInt(offer.listing_id)
        );
        console.log('✅ Email bildirimi başarıyla gönderildi!');
      } catch (emailError) {
        console.error('❌ Email notification error:', emailError);
        // Don't fail the purchase if email fails
      }
    } else {
      console.log('⚠️ Satıcı email adresi bulunamadı:', emailSeller);
    }

    res.json({
      success: true,
      orderId: orderId,
      message: 'Satın alma işlemi başarılı',
      commissionUsed: actualCommissionUsed,
      remainingPayment: totalAmount - actualCommissionUsed
    });

  } catch (error: any) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('❌ Rollback error:', rollbackError);
      }
    }
    console.error('❌ Purchase error details:', {
      message: error?.message,
      code: error?.code,
      sqlMessage: error?.sqlMessage,
      sql: error?.sql,
      stack: error?.stack
    });
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Satın alma işlemi sırasında hata oluştu',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (endError) {
        console.error('❌ Connection end error:', endError);
      }
    }
  }
});

// Withdraw offer endpoint
router.patch('/:offerId/withdraw', authenticateToken, async (req, res) => {
  let connection;
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    const { offerId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }

    if (!offerId) {
      return res.status(400).json({ success: false, error: 'Offer ID gerekli' });
    }

    connection = await mysql.createConnection(dbConfig);
    
    // Check if offer exists and belongs to user
    const [offerRows] = await connection.execute(
      `SELECT id, status, seller_id FROM offers WHERE id = ?`,
      [offerId]
    );
    
    const offer = (offerRows as any[])[0];
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Teklif bulunamadı' });
    }

    if (offer.seller_id !== userId) {
      return res.status(403).json({ success: false, error: 'Bu teklifi geri çekme yetkiniz yok' });
    }

    if (offer.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Sadece aktif teklifler geri çekilebilir' });
    }

    // Update offer status to withdrawn
    await connection.execute(
      `UPDATE offers SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [offerId]
    );

    res.json({
      success: true,
      message: 'Teklif başarıyla geri çekildi'
    });

  } catch (error) {
    console.error('Withdraw offer error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Teklif geri çekilirken hata oluştu' 
    });
  } finally {
    if (connection) await connection.end();
  }
});

export default router;