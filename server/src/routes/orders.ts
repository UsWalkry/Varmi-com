import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendOrderStatusChangeEmail, sendOrderCancelledEmail, sendReturnRequestEmail } from '../services/emailService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Multer configuration for return images
const returnImagesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/returns');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'return-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadReturnImages = multer({
  storage: returnImagesStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file (video için artırıldı)
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime' // MOV
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece JPEG, JPG, PNG, WEBP, MP4, WEBM ve MOV formatları desteklenmektedir'));
    }
  }
});

let reviewSchemaEnsured = false;

async function ensureReviewSchema() {
  if (reviewSchemaEnsured) {
    return;
  }

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_reviews (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        offer_id VARCHAR(64) NULL,
        listing_id VARCHAR(64) NULL,
        reviewer_id VARCHAR(64) NOT NULL,
        reviewee_id VARCHAR(64) NOT NULL,
        rating TINYINT NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_order_reviewer (order_id, reviewer_id),
        INDEX idx_reviewee (reviewee_id),
        INDEX idx_reviewer (reviewer_id),
        INDEX idx_order (order_id)
      )
    `);

    const sellerRatingColumn = await query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'order_sellers'
        AND column_name = 'seller_rating'
      LIMIT 1
    `) as any[];

    if (!Array.isArray(sellerRatingColumn) || sellerRatingColumn.length === 0) {
      try {
        await query(`
          ALTER TABLE order_sellers
          ADD COLUMN seller_rating DECIMAL(3,2) DEFAULT NULL
        `);
      } catch (alterError) {
        if ((alterError as any)?.code !== 'ER_DUP_FIELDNAME') {
          logger.warn('⚠️  Unable to add seller_rating column on order_sellers:', alterError);
        }
      }
    }

    reviewSchemaEnsured = true;
  } catch (error) {
    console.error('❌ Failed to ensure review schema:', error);
    throw error;
  }
}

// Check if review is required for this order
async function checkIfReviewRequired(isBuyer: boolean, order: any, existingReviewData: any, userId: string) {
  // Sadece alıcı için ve sipariş tamamlanmışsa
  if (!isBuyer || (!((order.status === 'completed' || order.status === 'delivered') || order.completed_at || order.delivered_at))) {
    logger.debug('🚫 Review not required - not buyer or not completed');
    return false;
  }
  
  // Bu sipariş için zaten değerlendirme varsa gerekli değil
  if (existingReviewData) {
    logger.debug('🚫 Review not required - already exists');
    return false;
  }
  
  // Bu siparişte hangi satıcılar var, kontrol et
  try {
    const orderSellers = await query(`
      SELECT DISTINCT seller_id 
      FROM order_sellers 
      WHERE order_id = ?
    `, [order.id]);
    
    if (!Array.isArray(orderSellers) || orderSellers.length === 0) {
      return false;
    }
    
    // Bu alıcı bu satıcılardan herhangi birini daha önce değerlendirmiş mi?
    const sellerIds = orderSellers.map((s: any) => s.seller_id);
    const placeholders = sellerIds.map(() => '?').join(',');
    
    const existingReviews = await query(`
      SELECT COUNT(*) as count 
      FROM user_reviews 
      WHERE reviewer_id = ? AND reviewee_id IN (${placeholders})
    `, [userId, ...sellerIds]);
    
    const reviewCount = Array.isArray(existingReviews) && existingReviews.length > 0 
      ? (existingReviews[0] as any).count 
      : 0;
    
    console.log('🔍 checkIfReviewRequired debug:', {
      orderId: order.id,
      userId,
      sellerIds,
      reviewCount,
      requiresReview: reviewCount === 0
    });
    
    // Eğer bu satıcıları hiç değerlendirmemişse, değerlendirme gerekli
    return reviewCount === 0;
    
  } catch (error) {
    console.error('❌ Error checking review requirement:', error);
    return false; // Hata durumunda değerlendirme isteme
  }
}

// Get user's orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }

    await ensureReviewSchema();

    logger.debug('🔍 Getting orders for user');

    const orders = await query(`
      SELECT 
        o.*,
        COUNT(oi.id) as item_count,
        SUM(oi.quantity) as total_quantity,
        GROUP_CONCAT(DISTINCT os.seller_name) as seller_names,
        SUM(COALESCE(off.shipping_cost, 0)) as total_shipping_cost,
        MAX(os.seller_id) as primary_seller_id,
        MAX(os.seller_name) as primary_seller_name,
        MAX(os.seller_email) as primary_seller_email,
        MAX(ur.id) as review_id,
        MAX(ur.rating) as review_rating,
        MAX(ur.comment) as review_comment
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN order_sellers os ON o.id = os.order_id
      LEFT JOIN offers off ON oi.offer_id = off.id
      LEFT JOIN user_reviews ur ON ur.order_id = o.id AND ur.reviewer_id = ?
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [userId, userId]);

    console.log('📦 Found orders:', (orders as any[]).length);
    console.log('📦 Orders data:', orders);

    // Get order items with images for each order
    const ordersWithItems = await Promise.all((orders as any[]).map(async (order) => {
      const orderItems = await query(`
        SELECT 
          oi.*,
          off.images as offer_images,
          l.images as listing_images,
          l.title as listing_title
        FROM order_items oi
        LEFT JOIN offers off ON oi.offer_id = off.id
        LEFT JOIN listings l ON oi.listing_id = l.id
        WHERE oi.order_id = ?
      `, [order.id]);

      // Process order items to extract image data
      const items = (orderItems as any[]).map(item => {
        let image = '/image-placeholder.png';
        
        // Try to get image from offer first, then from listing
        if (item.offer_images) {
          try {
            const offerImages = JSON.parse(item.offer_images);
            if (Array.isArray(offerImages) && offerImages.length > 0) {
              image = offerImages[0];
            }
          } catch (e) {
            console.warn('Error parsing offer images:', e);
          }
        }
        
        if (image === '/image-placeholder.png' && item.listing_images) {
          try {
            const listingImages = JSON.parse(item.listing_images);
            if (Array.isArray(listingImages) && listingImages.length > 0) {
              image = listingImages[0];
            }
          } catch (e) {
            console.warn('Error parsing listing images:', e);
          }
        }

        return {
          id: item.id,
          title: item.title || item.listing_title,
          image: image,
          price: parseFloat(item.price || 0),
          quantity: item.quantity
        };
      });

      return {
        ...order,
        items: items
      };
    }));

    const formattedOrders = ordersWithItems.map(order => ({
      id: order.id,
      orderNumber: order.id,
      total: parseFloat(order.total_amount),
      status: order.status,
      paymentStatus: order.payment_status || 'pending',
      createdAt: order.created_at,
      estimatedDelivery: order.estimated_delivery || order.estimated_delivery_date,
      itemCount: order.item_count || 0,
      totalQuantity: order.total_quantity || 0,
      sellerNames: order.seller_names ? order.seller_names.split(',') : [],
      sellerName: order.primary_seller_name || (order.seller_names ? order.seller_names.split(',')[0] : null),
      shippingAddress: order.shipping_address,
      trackingNumber: order.tracking_number,
      shippingCost: parseFloat(order.total_shipping_cost || 0),
      items: order.items || [],
      reviewId: order.review_id || null,
      reviewRating: order.review_rating ? Number(order.review_rating) : null,
      requiresReview: false, // Lista için her zaman false - kontrol sadece detay görüntüleme sırasında yapılacak
      primarySellerId: order.primary_seller_id || null,
      primarySellerName: order.primary_seller_name || null,
      primarySellerEmail: order.primary_seller_email || null,
      reviewComment: order.review_comment || null,
      // Tarih alanlarını ekle
      completedAt: order.completed_at,
      deliveredAt: order.delivered_at,
      shippedAt: order.shipped_at,
      startedProcessingAt: order.started_processing_at
    }));

    console.log('📦 Formatted orders:', formattedOrders);

    res.json({
      success: true,
      orders: formattedOrders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Siparişler alınırken hata oluştu' 
    });
  }
});

// Get user's sales (orders where user is the seller)
router.get('/sales', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    console.log('🛍️ Getting sales for user:', userId);

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User ID bulunamadı' 
      });
    }

    // Get orders where user is seller
    const salesRows = await query(`
      SELECT 
        o.*,
        COUNT(oi.id) as item_count,
        SUM(oi.quantity) as total_quantity,
        MAX(os.seller_name) as seller_name,
        MAX(off.eta_days) as eta_days,
        SUM(COALESCE(off.shipping_cost, 0)) as total_shipping_cost
      FROM orders o
      INNER JOIN order_sellers os ON o.id = os.order_id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN offers off ON oi.offer_id = off.id
      WHERE os.seller_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [userId]);

    console.log('🛍️ Found sales:', (salesRows as any[]).length);
    console.log('🛍️ Sales data:', salesRows);

    // Get sale items with images for each sale
    const salesWithItems = await Promise.all((salesRows as any[]).map(async (sale) => {
      const saleItems = await query(`
        SELECT 
          oi.*,
          off.images as offer_images,
          l.images as listing_images,
          l.title as listing_title
        FROM order_items oi
        LEFT JOIN offers off ON oi.offer_id = off.id
        LEFT JOIN listings l ON oi.listing_id = l.id
        WHERE oi.order_id = ?
      `, [sale.id]);

      // Process sale items to extract image data
      const items = (saleItems as any[]).map(item => {
        let image = '/image-placeholder.png';
        
        // Try to get image from offer first, then from listing
        if (item.offer_images) {
          try {
            const offerImages = JSON.parse(item.offer_images);
            if (Array.isArray(offerImages) && offerImages.length > 0) {
              image = offerImages[0];
            }
          } catch (e) {
            console.warn('Error parsing offer images:', e);
          }
        }
        
        if (image === '/image-placeholder.png' && item.listing_images) {
          try {
            const listingImages = JSON.parse(item.listing_images);
            if (Array.isArray(listingImages) && listingImages.length > 0) {
              image = listingImages[0];
            }
          } catch (e) {
            console.warn('Error parsing listing images:', e);
          }
        }

        return {
          id: item.id,
          title: item.title || item.listing_title,
          image: image,
          price: parseFloat(item.price || 0),
          quantity: item.quantity
        };
      });

      return {
        ...sale,
        items: items
      };
    }));

    const formattedSales = salesWithItems.map(sale => ({
      id: sale.id,
      orderNumber: sale.id,
      total: parseFloat(sale.total_amount),
      status: sale.status,
      paymentStatus: sale.payment_status || 'paid',
      createdAt: sale.created_at,
      itemCount: sale.item_count || 0,
      totalQuantity: sale.total_quantity || 0,
      buyerAddress: sale.shipping_address,
      trackingNumber: sale.tracking_number,
      estimatedDelivery: sale.estimated_delivery,
      sellerName: sale.seller_name,
      shippingCost: parseFloat(sale.total_shipping_cost || 0),
      etaDays: sale.eta_days || 3,
      items: sale.items || []
    }));

    console.log('🛍️ Formatted sales:', formattedSales);

    res.json({
      success: true,
      sales: formattedSales
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Satışlar alınırken hata oluştu' 
    });
  }
});

// Get specific order details
router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = (req as any).user?.userId || (req as any).userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }

    await ensureReviewSchema();

    console.log('🔍 Getting order details:', { orderId, userId });

    // Get order details with permission check (user must be buyer or seller)
    const orderQuery = `
      SELECT 
        o.*,
        COUNT(oi.id) as item_count,
        SUM(oi.quantity) as total_quantity,
        GROUP_CONCAT(DISTINCT os.seller_name) as seller_names
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN order_sellers os ON o.id = os.order_id
      WHERE o.id = ? AND (o.user_id = ? OR os.seller_id = ?)
      GROUP BY o.id
    `;

    const orderResults = await query(orderQuery, [orderId, userId, userId]);

    if (!orderResults || (orderResults as any[]).length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Sipariş bulunamadı veya erişim yetkiniz yok' 
      });
    }

    const order = (orderResults as any[])[0];

    // Get order tracking history
    const trackingQuery = `
      SELECT * FROM order_tracking 
      WHERE order_id = ? 
      ORDER BY created_at ASC
    `;
    
    const trackingResults = await query(trackingQuery, [orderId]);

    // Get order status audit log
    const auditQuery = `
      SELECT * FROM order_status_audit 
      WHERE order_id = ? 
      ORDER BY created_at ASC
    `;
    
    const auditResults = await query(auditQuery, [orderId]);

    // Get order items
    const itemsQuery = `
      SELECT oi.*, off.shipping_cost as offer_shipping_cost 
      FROM order_items oi
      LEFT JOIN offers off ON oi.offer_id = off.id
      WHERE oi.order_id = ?
    `;
    
    const itemsResults = await query(itemsQuery, [orderId]);

    // Get order sellers with their review statistics
    const sellersQuery = `
      SELECT 
        os.id,
        os.order_id,
        os.seller_id,
        os.seller_name,
        os.seller_email,
        os.seller_rating,
        COALESCE(AVG(ur.rating), 0) as average_rating,
        COUNT(ur.id) as review_count
      FROM order_sellers os
      LEFT JOIN user_reviews ur ON os.seller_id = ur.reviewee_id
      WHERE os.order_id = ?
      GROUP BY os.id, os.order_id, os.seller_id, os.seller_name, os.seller_email, os.seller_rating
    `;
    
    const sellersResults = await query(sellersQuery, [orderId]);

    // Get buyer information
    const buyerQuery = `
      SELECT u.id, u.firstName, u.lastName, u.email, u.phone, u.profile_picture_url as avatar_url
      FROM users u
      INNER JOIN orders o ON u.id = o.user_id
      WHERE o.id = ?
    `;
    
    const buyerResults = await query(buyerQuery, [orderId]);

  // Determine if current user is buyer or seller for privacy masking
    const isBuyer = order.user_id === userId;
    const isSeller = !isBuyer;
    const reviewResults = await query(`
      SELECT id, rating, comment, created_at 
      FROM user_reviews
      WHERE order_id = ? AND reviewer_id = ?
      LIMIT 1
    `, [orderId, userId]) as any[];

    const reviewData = Array.isArray(reviewResults) && reviewResults.length > 0
      ? reviewResults[0]
      : null;


    console.log('🔐 Privacy control:', { userId, orderUserId: order.user_id, isBuyer, isSeller });

    // Helper function to mask sensitive data for sellers
    const maskSensitiveData = (data: string | null | undefined): string => {
      if (!data) return '';
      if (data.length <= 3) return '***';
      return data.substring(0, 2) + '*'.repeat(Math.min(data.length - 2, 8));
    };

    // Prepare buyer data with privacy masking for sellers
    let buyerData = (buyerResults as any[])[0] || null;
    if (buyerData && isSeller) {
      // Mask buyer information for sellers to protect privacy
      buyerData = {
        ...buyerData,
        firstName: maskSensitiveData(buyerData.firstName),
        lastName: maskSensitiveData(buyerData.lastName), 
        email: maskSensitiveData(buyerData.email),
        phone: maskSensitiveData(buyerData.phone)
      };
    }

    // Mask shipping address for sellers
    let shippingAddress = order.shipping_address;
    if (isSeller && shippingAddress) {
      shippingAddress = maskSensitiveData(shippingAddress);
    }

    // Calculate total shipping cost from offers
    const totalShippingCost = (itemsResults as any[]).reduce((total, item) => {
      return total + (parseFloat(item.offer_shipping_cost) || 0);
    }, 0);

    const formattedOrder = {
      id: order.id,
      orderNumber: order.id,
      total: parseFloat(order.total_amount),
      status: order.status,
      paymentStatus: order.payment_status || 'pending',
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      estimatedDelivery: order.estimated_delivery || order.estimated_delivery_date,
      itemCount: order.item_count || 0,
      totalQuantity: order.total_quantity || 0,
      sellerNames: order.seller_names ? order.seller_names.split(',') : [],
      shippingAddress: shippingAddress, // Masked for sellers
      trackingNumber: order.tracking_number,
      carrierCompany: order.carrier_company,
      shippingCost: totalShippingCost || parseFloat(order.shipping_cost || 0),
      startedProcessingAt: order.started_processing_at,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at,
      completedAt: order.completed_at,
      tracking: trackingResults || [],
      statusHistory: auditResults || [],
      items: itemsResults || [],
      sellers: sellersResults || [],
      buyer: buyerData, // Masked for sellers
      isBuyer: isBuyer, // Frontend için user role bilgisi
      isSeller: isSeller,
      review: reviewData,
      requiresReview: await checkIfReviewRequired(isBuyer, order, reviewData, userId)
    };

    console.log('📦 Order details found:', formattedOrder);

    res.json({
      success: true,
      order: formattedOrder
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sipariş detayları alınırken hata oluştu' 
    });
  }
});

// Update order status and tracking (for sellers)
router.patch('/:orderId/update-status', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber, carrierCompany, estimatedDelivery, notes } = req.body;
    const userId = (req as any).user?.userId || (req as any).userId;

    console.log('📦 Updating order status:', { orderId, status, trackingNumber, carrierCompany, userId });

    // Verify seller permission
    const orderCheck = await query(`
      SELECT o.id, o.status as current_status
      FROM orders o
      INNER JOIN order_sellers os ON o.id = os.order_id
      WHERE o.id = ? AND os.seller_id = ?
    `, [orderId, userId]);

    if (!orderCheck || (orderCheck as any[]).length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu siparişi güncelleme yetkiniz yok' 
      });
    }

    const currentOrder = (orderCheck as any[])[0];
    const previousStatus = currentOrder.current_status;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
      
      // Add timestamp fields for status changes
      if (status === 'preparing') {
        updateFields.push('started_processing_at = CURRENT_TIMESTAMP');
      } else if (status === 'shipped') {
        updateFields.push('shipped_at = CURRENT_TIMESTAMP');
      } else if (status === 'delivered') {
        updateFields.push('delivered_at = CURRENT_TIMESTAMP');
      } else if (status === 'completed') {
        updateFields.push('completed_at = CURRENT_TIMESTAMP');
      }
    }

    if (trackingNumber) {
      updateFields.push('tracking_number = ?');
      updateValues.push(trackingNumber);
    }

    if (carrierCompany) {
      updateFields.push('carrier_company = ?');
      updateValues.push(carrierCompany);
    }

    if (estimatedDelivery) {
      updateFields.push('estimated_delivery = ?');
      updateValues.push(estimatedDelivery);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Güncellenecek alan bulunamadı' 
      });
    }

    updateValues.push(orderId);

    await query(`
      UPDATE orders 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, updateValues);

    // Add tracking entry
    if (status) {
      const statusDescriptions = {
        confirmed: 'Sipariş onaylandı ve hazırlanmaya başlandı',
        preparing: 'Sipariş hazırlanıyor',
        shipped: trackingNumber ? 
          `Sipariş kargoya verildi. Kargo takip no: ${trackingNumber}${carrierCompany ? ` (${carrierCompany})` : ''}` : 
          'Sipariş kargoya verildi',
        delivered: 'Sipariş teslim edildi',
        completed: 'Sipariş tamamlandı',
        cancelled: 'Sipariş iptal edildi'
      };

      await query(`
        INSERT INTO order_tracking (order_id, status, description)
        VALUES (?, ?, ?)
      `, [
        orderId,
        statusDescriptions[status as keyof typeof statusDescriptions] || status,
        notes || statusDescriptions[status as keyof typeof statusDescriptions] || ''
      ]);
    }

    // Add audit log
    if (status && status !== previousStatus) {
      await query(`
        INSERT INTO order_status_audit 
        (order_id, previous_status, new_status, changed_by, change_reason, tracking_number, carrier_company, estimated_delivery)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId, 
        previousStatus, 
        status, 
        userId, 
        notes || `Status changed from ${previousStatus} to ${status}`,
        trackingNumber || null,
        carrierCompany || null,
        estimatedDelivery || null
      ]);
    }

    console.log('✅ Order status updated successfully');

    res.json({
      success: true,
      message: 'Sipariş durumu başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sipariş durumu güncellenirken hata oluştu' 
    });
  }
});

// Start processing order (İşlemi Başlat)
router.patch('/:orderId/start-processing', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = (req as any).user?.userId || (req as any).userId;

    console.log('🚀 Starting order processing:', { orderId, userId });

    // Verify seller permission and current status
    const orderCheck = await query(`
      SELECT o.id, o.status as current_status, o.user_id as buyer_id
      FROM orders o
      INNER JOIN order_sellers os ON o.id = os.order_id
      WHERE o.id = ? AND os.seller_id = ?
    `, [orderId, userId]);

    if (!orderCheck || (orderCheck as any[]).length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu siparişi işleme alma yetkiniz yok' 
      });
    }

    const currentOrder = (orderCheck as any[])[0];
    const previousStatus = currentOrder.current_status;

    // Only allow starting processing from 'confirmed' status
    if (previousStatus !== 'confirmed') {
      return res.status(400).json({ 
        success: false, 
        error: 'Sadece onaylanmış siparişler işleme alınabilir' 
      });
    }

    // Update status to preparing
    await query(`
      UPDATE orders 
      SET status = 'preparing', 
          started_processing_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [orderId]);

    // Add tracking entry
    await query(`
      INSERT INTO order_tracking (order_id, status, description)
      VALUES (?, 'Hazırlanıyor', 'Satıcı siparişi işleme aldı ve hazırlamaya başladı')
    `, [orderId]);

    // Add audit log
    await query(`
      INSERT INTO order_status_audit 
      (order_id, previous_status, new_status, changed_by, change_reason)
      VALUES (?, ?, 'preparing', ?, 'Satıcı işlemi başlattı')
    `, [orderId, previousStatus, userId]);

    // Create notification for buyer
    await query(`
      INSERT INTO order_notifications 
      (order_id, user_id, notification_type, title, message)
      VALUES (?, ?, 'status_change', 'Sipariş Hazırlanıyor', 'Satıcı siparişinizi işleme aldı ve hazırlamaya başladı.')
    `, [orderId, currentOrder.buyer_id]);

    // Send email notification
    try {
      const buyerInfo = await query(`SELECT email, firstName, lastName FROM users WHERE id = ?`, [currentOrder.buyer_id]);
      if (buyerInfo && (buyerInfo as any[]).length > 0) {
        const buyer = (buyerInfo as any[])[0];
        const buyerName = `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || 'Değerli Müşterimiz';
        
        await sendOrderStatusChangeEmail(
          buyer.email,
          buyerName,
          orderId,
          'preparing',
          previousStatus,
          currentOrder.buyer_id // Add userId parameter
        );
      }
    } catch (emailError) {
      console.error('❌ Email notification failed:', emailError);
      // Don't fail the main operation for email errors
    }

    console.log('✅ Order processing started successfully');

    res.json({
      success: true,
      message: 'Sipariş işleme alındı ve hazırlanmaya başlandı'
    });
  } catch (error) {
    console.error('Start processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sipariş işleme alınırken hata oluştu' 
    });
  }
});

// Add shipping information
router.patch('/:orderId/add-shipping', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber, carrierCompany, estimatedDelivery, notes } = req.body;
    const userId = (req as any).user?.userId || (req as any).userId;

    console.log('🚚 Adding shipping info:', { orderId, trackingNumber, carrierCompany, userId });

    // Validation
    if (!trackingNumber || !carrierCompany) {
      return res.status(400).json({ 
        success: false, 
        error: 'Kargo takip numarası ve kargo firması bilgisi gereklidir' 
      });
    }

    // Verify seller permission and current status
    const orderCheck = await query(`
      SELECT o.id, o.status as current_status, o.user_id as buyer_id
      FROM orders o
      INNER JOIN order_sellers os ON o.id = os.order_id
      WHERE o.id = ? AND os.seller_id = ?
    `, [orderId, userId]);

    if (!orderCheck || (orderCheck as any[]).length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu siparişe kargo bilgisi ekleme yetkiniz yok' 
      });
    }

    const currentOrder = (orderCheck as any[])[0];
    const previousStatus = currentOrder.current_status;

    // Only allow adding shipping info from 'preparing' status
    if (previousStatus !== 'preparing') {
      return res.status(400).json({ 
        success: false, 
        error: 'Sadece hazırlanmakta olan siparişlere kargo bilgisi eklenebilir' 
      });
    }

    // Update order with shipping info and change status to shipped
    await query(`
      UPDATE orders 
      SET status = 'shipped',
          tracking_number = ?,
          carrier_company = ?,
          estimated_delivery = ?,
          shipped_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [trackingNumber, carrierCompany, estimatedDelivery, orderId]);

    // Add tracking entry
    await query(`
      INSERT INTO order_tracking (order_id, status, description)
      VALUES (?, 'Kargoya Verildi', ?)
    `, [
      orderId, 
      `Sipariş kargoya verildi. Kargo firması: ${carrierCompany}, Takip no: ${trackingNumber}${notes ? `. Not: ${notes}` : ''}`
    ]);

    // Add audit log
    await query(`
      INSERT INTO order_status_audit 
      (order_id, previous_status, new_status, changed_by, change_reason, tracking_number, carrier_company, estimated_delivery)
      VALUES (?, ?, 'shipped', ?, ?, ?, ?, ?)
    `, [
      orderId, 
      previousStatus, 
      userId, 
      notes || 'Kargo bilgileri eklendi ve sipariş kargoya verildi',
      trackingNumber,
      carrierCompany,
      estimatedDelivery
    ]);

    // Create notification for buyer
    await query(`
      INSERT INTO order_notifications 
      (order_id, user_id, notification_type, title, message)
      VALUES (?, ?, 'shipping_info', 'Sipariş Kargoya Verildi', ?)
    `, [
      orderId, 
      currentOrder.buyer_id,
      `Siparişiniz kargoya verildi. Kargo firması: ${carrierCompany}, Takip no: ${trackingNumber}${estimatedDelivery ? `, Tahmini teslim: ${estimatedDelivery}` : ''}`
    ]);

    // Send email notification
    try {
      const buyerInfo = await query(`SELECT email, firstName, lastName FROM users WHERE id = ?`, [currentOrder.buyer_id]);
      if (buyerInfo && (buyerInfo as any[]).length > 0) {
        const buyer = (buyerInfo as any[])[0];
        const buyerName = `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || 'Değerli Müşterimiz';
        
        console.log('📧 Sending shipped status email with userId:', currentOrder.buyer_id);
        await sendOrderStatusChangeEmail(
          buyer.email,
          buyerName,
          orderId,
          'shipped',
          previousStatus,
          currentOrder.buyer_id, // Add userId parameter
          trackingNumber,
          carrierCompany,
          estimatedDelivery
        );
        console.log('📧 Shipped status email sent successfully');
      }
    } catch (emailError) {
      console.error('❌ Email notification failed:', emailError);
      // Don't fail the main operation for email errors
    }

    console.log('✅ Shipping info added successfully');

    res.json({
      success: true,
      message: 'Kargo bilgileri başarıyla eklendi ve sipariş kargoya verildi'
    });
  } catch (error) {
    console.error('Add shipping info error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Kargo bilgileri eklenirken hata oluştu' 
    });
  }
});

// Mark order as delivered (Teslim Aldım - for buyers)
router.patch('/:orderId/mark-delivered', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;
    const userId = (req as any).user?.userId || (req as any).userId;

    await ensureReviewSchema();

    console.log('📦 Marking order as delivered:', { orderId, userId });

    // Verify buyer permission and current status
    const orderCheck = await query(`
      SELECT o.id, o.status as current_status, o.delivered_at
      FROM orders o
      WHERE o.id = ? AND o.user_id = ?
    `, [orderId, userId]);

    if (!orderCheck || (orderCheck as any[]).length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu siparişi teslim aldım olarak işaretleme yetkiniz yok' 
      });
    }

    const currentOrder = (orderCheck as any[])[0];
    const previousStatus = currentOrder.current_status;

    // Only allow marking as delivered from 'shipped' or 'delivered' status
    if (previousStatus !== 'shipped' && previousStatus !== 'delivered') {
      return res.status(400).json({ 
        success: false, 
        error: 'Sadece kargoya verilmiş veya teslim edilmiş siparişler tamamlanabilir' 
      });
    }

    // Update status to completed, ensure delivered timestamp exists
    await query(`
      UPDATE orders 
      SET status = 'completed',
          delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP),
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [orderId]);

    // Add tracking entry for completion
    await query(`
      INSERT INTO order_tracking (order_id, status, description)
      VALUES (?, 'Tamamlandı', ?)
    `, [
      orderId,
      notes || 'Alıcı siparişi teslim aldığını onayladı ve sipariş tamamlandı'
    ]);

    // Add audit log
    await query(`
      INSERT INTO order_status_audit 
      (order_id, previous_status, new_status, changed_by, change_reason)
      VALUES (?, ?, 'completed', ?, ?)
    `, [orderId, previousStatus, userId, notes || 'Alıcı siparişi teslim aldığını onayladı']);

    // Send email notification to seller
    let sellerRecord: any = null;

    try {
      const sellerInfo = await query(`
        SELECT 
          u.email, 
          u.firstName, 
          u.lastName,
          os.seller_id,
          os.seller_name
        FROM users u
        INNER JOIN order_sellers os ON u.id = os.seller_id
        WHERE os.order_id = ?
        LIMIT 1
      `, [orderId]);
      
      if (Array.isArray(sellerInfo) && sellerInfo.length > 0) {
        sellerRecord = sellerInfo[0];
        const sellerName = `${sellerRecord.firstName || ''} ${sellerRecord.lastName || ''}`.trim() || sellerRecord.seller_name || 'Değerli Satıcımız';
        
        await sendOrderStatusChangeEmail(
          sellerRecord.email,
          sellerName,
          orderId,
          'completed',
          previousStatus,
          sellerRecord.seller_id // Add userId parameter
        );
      }
    } catch (emailError) {
      console.error('❌ Email notification failed:', emailError);
      // Don't fail the main operation for email errors
    }

    console.log('✅ Order marked as delivered successfully');

    res.json({
      success: true,
      message: 'Sipariş tamamlandı',
      reviewRequired: true,
      seller: sellerRecord ? {
        id: sellerRecord.seller_id,
        name: `${sellerRecord.firstName || ''} ${sellerRecord.lastName || ''}`.trim() || sellerRecord.seller_name || undefined
      } : null
    });
  } catch (error) {
    console.error('Mark delivered error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sipariş tamamlanırken hata oluştu' 
    });
  }
});

// Submit review for completed order (buyer evaluating seller)
router.post('/:orderId/review', authenticateToken, async (req, res) => {
  try {
    await ensureReviewSchema();

    const { orderId } = req.params;
    const { rating, comment } = req.body;
    const userId = (req as any).user?.userId || (req as any).userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Kullanıcı doğrulanamadı' });
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, error: 'Geçerli bir puan (1-5) girin' });
    }

    const commentText = typeof comment === 'string' ? comment.trim() : '';
    if (!commentText) {
      return res.status(400).json({ success: false, error: 'Lütfen bir değerlendirme metni girin' });
    }

    const orderInfoResults = await query(`
      SELECT 
        o.status,
        o.completed_at,
        o.delivered_at,
        oi.offer_id,
        oi.listing_id,
        os.seller_id,
        os.seller_name
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN order_sellers os ON o.id = os.order_id
      WHERE o.id = ? AND o.user_id = ?
      ORDER BY oi.id ASC
      LIMIT 1
    `, [orderId, userId]) as any[];

    if (!Array.isArray(orderInfoResults) || orderInfoResults.length === 0) {
      return res.status(403).json({ success: false, error: 'Bu sipariş için değerlendirme yapma yetkiniz yok' });
    }

    const orderInfo = orderInfoResults[0];

    // Status kontrolü - completed durumu veya completed_at/delivered_at tarihi var mı kontrol et
    const isCompleted = orderInfo.status === 'completed' || 
                       orderInfo.completed_at || 
                       orderInfo.delivered_at;

    console.log('🔍 Review validation:', {
      orderId,
      status: orderInfo.status,
      completed_at: orderInfo.completed_at,
      delivered_at: orderInfo.delivered_at,
      isCompleted
    });

    if (!isCompleted) {
      return res.status(400).json({ success: false, error: 'Sadece tamamlanan siparişler değerlendirilebilir' });
    }

    if (!orderInfo.seller_id) {
      return res.status(400).json({ success: false, error: 'Siparişe ait satıcı bulunamadı' });
    }

    const existingReview = await query(`
      SELECT id FROM user_reviews WHERE order_id = ? AND reviewer_id = ?
    `, [orderId, userId]) as any[];

    if (Array.isArray(existingReview) && existingReview.length > 0) {
      return res.status(409).json({ success: false, error: 'Bu sipariş için daha önce değerlendirme yapıldı' });
    }

    // Bu satıcıyı daha önce değerlendirip değerlendirmediğini kontrol et
    const existingSellerReview = await query(`
      SELECT id FROM user_reviews WHERE reviewer_id = ? AND reviewee_id = ?
    `, [userId, orderInfo.seller_id]) as any[];

    if (Array.isArray(existingSellerReview) && existingSellerReview.length > 0) {
      return res.status(409).json({ success: false, error: 'Bu teklif vereni daha önce değerlendirdiniz' });
    }

    const reviewId = uuidv4();

    await query(`
      INSERT INTO user_reviews (
        id,
        order_id,
        offer_id,
        listing_id,
        reviewer_id,
        reviewee_id,
        rating,
        comment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reviewId,
      orderId,
      orderInfo.offer_id || null,
      orderInfo.listing_id || null,
      userId,
      orderInfo.seller_id,
      numericRating,
      commentText
    ]);

    await query(`
      UPDATE order_sellers SET seller_rating = ? WHERE order_id = ? AND seller_id = ?
    `, [numericRating, orderId, orderInfo.seller_id]);

    res.json({
      success: true,
      reviewId
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, error: 'Değerlendirme kaydedilirken bir hata oluştu' });
  }
});

// Get order tracking history
router.get('/:orderId/tracking', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = (req as any).user?.userId || (req as any).userId;

    // Verify user has access to this order (buyer or seller)
    const accessCheck = await query(`
      SELECT o.id 
      FROM orders o
      LEFT JOIN order_sellers os ON o.id = os.order_id
      WHERE o.id = ? AND (o.user_id = ? OR os.seller_id = ?)
    `, [orderId, userId, userId]);

    if (!accessCheck || (accessCheck as any[]).length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu siparişin takip bilgilerine erişim yetkiniz yok' 
      });
    }

    // Get tracking information
    const tracking = await query(`
      SELECT 
        status,
        description,
        location,
        carrier_company,
        tracking_url,
        created_at
      FROM order_tracking 
      WHERE order_id = ?
      ORDER BY created_at ASC
    `, [orderId]);

    res.json({
      success: true,
      tracking: tracking || []
    });
  } catch (error) {
    console.error('Get tracking error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Takip bilgileri alınırken hata oluştu' 
    });
  }
});

// Return request endpoint - İade talebi oluşturma
router.post('/:orderId/return', authenticateToken, uploadReturnImages.array('images', 5), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user?.userId || (req as any).userId;
    const files = req.files as Express.Multer.File[];

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Kullanıcı doğrulanamadı' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'İade sebebi belirtilmelidir' });
    }

    // Siparişin kullanıcıya ait olup olmadığını ve durumunu kontrol et
    const orderResults = await query(`
      SELECT 
        o.id,
        o.user_id,
        o.status,
        o.delivered_at,
        o.completed_at,
        oi.listing_id,
        l.title as listing_title,
        os.seller_id,
        u.email as seller_email,
        u.firstName as seller_first_name,
        u.lastName as seller_last_name
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN listings l ON oi.listing_id = l.id
      LEFT JOIN order_sellers os ON o.id = os.order_id
      LEFT JOIN users u ON os.seller_id = u.id
      WHERE o.id = ?
      LIMIT 1
    `, [orderId]) as any[];

    if (!Array.isArray(orderResults) || orderResults.length === 0) {
      return res.status(404).json({ success: false, error: 'Sipariş bulunamadı' });
    }

    const order = orderResults[0];

    // Kullanıcının siparişi olup olmadığını kontrol et
    if (order.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Bu işlem için yetkiniz yok' });
    }

    // Sadece delivered veya completed durumundaki siparişler iade edilebilir
    if (order.status !== 'delivered' && order.status !== 'completed' && order.status !== 'shipped') {
      return res.status(400).json({ 
        success: false, 
        error: 'Sadece teslim edilmiş veya tamamlanmış siparişler iade edilebilir' 
      });
    }

    // order_returns tablosunu kontrol et, yoksa oluştur
    await query(`
      CREATE TABLE IF NOT EXISTS order_returns (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        seller_id VARCHAR(36),
        reason TEXT NOT NULL,
        images TEXT,
        status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Yüklenen görsellerin yollarını topla
    const imagePaths = files ? files.map(f => f.filename).join(',') : '';

    // İade kaydı oluştur
    const returnId = require('uuid').v4();
    await query(`
      INSERT INTO order_returns (id, order_id, user_id, seller_id, reason, images, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [returnId, orderId, userId, order.seller_id, reason.trim(), imagePaths]);

    // Satıcıya bildirim gönder
    if (order.seller_id) {
      await query(`
        INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
        VALUES (UUID(), ?, 'return_request', 'İade Talebi', ?, ?, NOW())
      `, [
        order.seller_id,
        `${order.listing_title} için iade talebi geldi`,
        JSON.stringify({ orderId, returnId, listingId: order.listing_id, hasImages: imagePaths.length > 0 })
      ]);
    }

    // Email gönder - Satıcıya
    try {
      // Alıcı bilgilerini al
      const buyerResults = await query(`
        SELECT email, firstName, lastName 
        FROM users 
        WHERE id = ?
      `, [userId]) as any[];
      
      const buyer = buyerResults[0];
      const buyerName = `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || 'Bir Müşteri';

      // Satıcıya email gönder
      if (order.seller_id && order.seller_email) {
        const sellerName = `${order.seller_first_name || ''} ${order.seller_last_name || ''}`.trim() || 'Değerli Satıcımız';
        
        await sendReturnRequestEmail(
          order.seller_email,
          sellerName,
          buyerName,
          orderId,
          reason.trim(),
          order.listing_title || 'Ürün',
          imagePaths.length > 0,
          order.seller_id
        );
        console.log('📧 Return request email sent to seller');
      }
    } catch (emailError) {
      console.error('❌ Email notification failed:', emailError);
      // Don't fail the main operation for email errors
    }

    console.log('📦 Return request created:', {
      returnId,
      orderId,
      userId,
      sellerId: order.seller_id,
      reason: reason.trim(),
      imageCount: files?.length || 0
    });

    res.json({
      success: true,
      message: 'İade talebiniz başarıyla oluşturuldu',
      returnId
    });
  } catch (error) {
    console.error('❌ Return request error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'İade talebi oluşturulurken hata oluştu' 
    });
  }
});

// Cancel order endpoint - Sipariş iptal etme
router.post('/:orderId/cancel', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user?.userId || (req as any).userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Kullanıcı doğrulanamadı' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'İptal sebebi belirtilmelidir' });
    }

    // Siparişin kullanıcıya ait olup olmadığını ve durumunu kontrol et
    const orderResults = await query(`
      SELECT 
        o.id,
        o.user_id,
        o.status,
        oi.listing_id,
        oi.seller_id,
        l.title as listing_title,
        u.email as seller_email,
        u.firstName as seller_first_name,
        u.lastName as seller_last_name
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN listings l ON oi.listing_id = l.id
      LEFT JOIN users u ON oi.seller_id = u.id
      WHERE o.id = ?
      LIMIT 1
    `, [orderId]) as any[];

    if (!Array.isArray(orderResults) || orderResults.length === 0) {
      return res.status(404).json({ success: false, error: 'Sipariş bulunamadı' });
    }

    const order = orderResults[0];

    // Kullanıcının siparişi olup olmadığını kontrol et
    if (order.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Bu işlem için yetkiniz yok' });
    }

    // Sadece confirmed ve preparing durumundaki siparişler iptal edilebilir
    if (order.status !== 'confirmed' && order.status !== 'preparing') {
      return res.status(400).json({ 
        success: false, 
        error: 'Sadece onaylanmış veya hazırlanıyor durumundaki siparişler iptal edilebilir' 
      });
    }

    // order_cancellations tablosunu kontrol et, yoksa oluştur
    await query(`
      CREATE TABLE IF NOT EXISTS order_cancellations (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        seller_id VARCHAR(36),
        reason TEXT NOT NULL,
        cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Sipariş durumunu cancelled olarak güncelle
    await query(`
      UPDATE orders 
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ?
    `, [orderId]);

    // İptal kaydı oluştur
    const cancellationId = require('uuid').v4();
    await query(`
      INSERT INTO order_cancellations (id, order_id, user_id, seller_id, reason)
      VALUES (?, ?, ?, ?, ?)
    `, [cancellationId, orderId, userId, order.seller_id, reason.trim()]);

    // Order status audit kaydı ekle
    await query(`
      INSERT INTO order_status_audit (id, order_id, previous_status, new_status, changed_by, change_reason, changed_at)
      VALUES (UUID(), ?, ?, 'cancelled', ?, ?, NOW())
    `, [orderId, order.status, userId, reason.trim()]);

    // Satıcıya bildirim gönder
    console.log('🔔 Attempting to send notification to seller:', { 
      sellerId: order.seller_id, 
      sellerEmail: order.seller_email,
      listingTitle: order.listing_title 
    });
    
    if (order.seller_id) {
      await query(`
        INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
        VALUES (UUID(), ?, 'order_cancelled', 'Sipariş İptal Edildi', ?, ?, NOW())
      `, [
        order.seller_id,
        `${order.listing_title} için sipariş iptal edildi`,
        JSON.stringify({ orderId, cancellationId, listingId: order.listing_id })
      ]);
      console.log('✅ Notification created for seller');
    } else {
      console.log('⚠️ No seller_id found, skipping notification');
    }

    // Email gönder - Satıcıya ve Alıcıya
    console.log('📧 Starting email process...');
    try {
      // Alıcı bilgilerini al
      console.log('🔍 Fetching buyer info for userId:', userId);
      const buyerResults = await query(`
        SELECT email, firstName, lastName 
        FROM users 
        WHERE id = ?
      `, [userId]) as any[];
      
      console.log('👤 Buyer results:', buyerResults);
      
      if (!buyerResults || buyerResults.length === 0) {
        console.error('❌ Buyer not found!');
        throw new Error('Buyer information not found');
      }
      
      const buyer = buyerResults[0];
      const buyerName = `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || 'Değerli Müşterimiz';
      
      console.log('📧 Sending email to buyer:', buyer.email);
      // Alıcıya email gönder
      await sendOrderCancelledEmail(
        buyer.email,
        buyerName,
        orderId,
        reason.trim(),
        true, // isBuyer = true
        userId
      );
      console.log('✅ Buyer cancellation email sent');

      // Satıcıya email gönder
      console.log('🔍 Checking seller info:', { 
        sellerId: order.seller_id, 
        sellerEmail: order.seller_email 
      });
      
      if (order.seller_id && order.seller_email) {
        const sellerName = `${order.seller_first_name || ''} ${order.seller_last_name || ''}`.trim() || 'Değerli Satıcımız';
        
        console.log('📧 Sending email to seller:', order.seller_email);
        await sendOrderCancelledEmail(
          order.seller_email,
          sellerName,
          orderId,
          reason.trim(),
          false, // isBuyer = false
          order.seller_id
        );
        console.log('✅ Seller cancellation email sent');
      } else {
        console.log('⚠️ Seller email not available, skipping seller email');
      }
    } catch (emailError) {
      console.error('❌ Email notification failed:', emailError);
      console.error('Error stack:', (emailError as Error).stack);
      // Don't fail the main operation for email errors
    }

    console.log('🚫 Order cancelled:', {
      cancellationId,
      orderId,
      userId,
      sellerId: order.seller_id,
      previousStatus: order.status,
      reason: reason.trim()
    });

    res.json({
      success: true,
      message: 'Siparişiniz başarıyla iptal edildi'
    });
  } catch (error) {
    console.error('❌ Cancel order error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sipariş iptal edilirken hata oluştu' 
    });
  }
});

// TEMPORARY: Create sample order for testing
router.post('/create-sample-order', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }

    console.log('🏗️ Creating sample order for user:', userId);

    // Create sample order
    const orderId = 'sample-' + Date.now();
    const orderNumber = 'ORD' + Date.now().toString().slice(-6);

    // Insert order
    await query(`
      INSERT INTO orders (id, order_number, user_id, total_amount, status, payment_status, 
                         shipping_address, created_at, updated_at)
      VALUES (?, ?, ?, 1299.99, 'confirmed', 'paid', 
              'Sample Test Address, Istanbul 34000', NOW(), NOW())
    `, [orderId, orderNumber, userId]);

    // Insert order item
    await query(`
      INSERT INTO order_items (order_id, listing_id, title, description, price, quantity, image)
      VALUES (?, 'sample-listing', 'Sample Test Product', 'Sample product for testing purposes', 1299.99, 1, '/placeholder-image.jpg')
    `, [orderId]);

    // Insert seller (make current user both buyer and seller for testing)
    await query(`
      INSERT INTO order_sellers (order_id, seller_id, seller_name, seller_email)
      VALUES (?, ?, 'Test Seller', 'seller@test.com')
    `, [orderId, userId]);

    // Insert tracking
    await query(`
      INSERT INTO order_tracking (order_id, status, description)
      VALUES (?, 'Sipariş Alındı', 'Sample order created for testing purposes')
    `, [orderId]);

    console.log('✅ Sample order created:', orderId);

    res.json({
      success: true,
      message: 'Sample order created successfully',
      orderId,
      orderNumber
    });
  } catch (error) {
    console.error('Create sample order error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sample order oluşturulurken hata oluştu' 
    });
  }
});

export default router;