import { Router, Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../database.js';
import { sendListingApprovedNotification, sendListingRejectedNotification, sendOfferNotification, sendOfferApprovedNotification, sendOfferRejectedNotification, sendSellerProfileApprovedEmail, sendSellerProfileRejectedEmail } from '../services/emailService.js';
import { v4 as uuidv4 } from 'uuid';
import { redisCache, CacheKeys } from '../utils/redisCache.js';

const router = Router();

// Admin middleware - sadece admin kullanıcıları erişebilir
const adminOnly = async (req: any, res: Response, next: any) => {
  try {
    // Token kontrolü zaten authenticateToken'da yapıldı
    const userId = req.userId; // authenticateToken'da req.userId set ediliyor
    
    console.log('🔍 Admin middleware - userId:', userId);
    
    if (!userId) {
      console.log('❌ Admin middleware - No userId found');
      return res.status(401).json({ success: false, message: 'Yetkisiz erişim' });
    }

    // Kullanıcının admin olup olmadığını kontrol et
    const users = await query(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    ) as any[];
    
    const user = (users as any[])[0];
    console.log('🔍 Admin middleware - User role:', user?.role);
    
    if (!user || user.role !== 'admin') {
      console.log('❌ Admin middleware - Access denied. Role:', user?.role);
      return res.status(403).json({ success: false, message: 'Admin yetkisi gerekli' });
    }

    console.log('✅ Admin middleware - Access granted');
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ success: false, message: 'Yetkilendirme hatası' });
  }
};

// Dashboard istatistikleri
router.get('/dashboard/stats', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    // Kullanıcı istatistikleri
    const userStats = await query(`
      SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as newUsersToday
      FROM users
    `);
    
    // İlan istatistikleri
    const listingStats = await query(`
      SELECT 
        COUNT(*) as totalListings,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as newListingsToday
      FROM listings
    `);

    // Görüntüleme istatistikleri (listings tablosundan)
    const viewStats = await query(`
      SELECT 
        SUM(view_count) as totalViews,
        SUM(CASE WHEN DATE(updated_at) = CURDATE() THEN view_count ELSE 0 END) as viewsToday
      FROM listings
    `);

    // Favori istatistikleri (listings tablosundan)
    const favoriteStats = await query(`
      SELECT 
        SUM(favorite_count) as totalFavorites,
        SUM(CASE WHEN DATE(updated_at) = CURDATE() THEN favorite_count ELSE 0 END) as favoritesToday
      FROM listings
    `);

    // Teklif istatistikleri - gerçek offers tablosundan
    console.log('🔍 Querying offers table...');
    const offerStats = await query(`
      SELECT 
        COUNT(*) as totalOffers,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as newOffersToday,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingOffers,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as acceptedOffers
      FROM offers
    `);
    console.log('📊 Offer stats result:', (offerStats as any[])[0]);

    // Sipariş istatistikleri
    console.log('🔍 Querying orders table...');
    const orderStats = await query(`
      SELECT 
        COUNT(*) as totalOrders,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as newOrdersToday,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingOrders,
        COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparingOrders,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shippedOrders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as deliveredOrders,
        SUM(total_amount) as totalRevenue,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END) as revenueToday
      FROM orders
    `);
    console.log('📊 Order stats result:', (orderStats as any[])[0]);
    
    const stats = {
      users: (userStats as any[])[0] || { totalUsers: 0, newUsersToday: 0 },
      listings: (listingStats as any[])[0] || { totalListings: 0, newListingsToday: 0 },
      views: (viewStats as any[])[0] || { totalViews: 0, viewsToday: 0 },
      favorites: (favoriteStats as any[])[0] || { totalFavorites: 0, favoritesToday: 0 },
      offers: (offerStats as any[])[0] || { totalOffers: 0, newOffersToday: 0, pendingOffers: 0, acceptedOffers: 0 },
      orders: (orderStats as any[])[0] || { totalOrders: 0, newOrdersToday: 0, pendingOrders: 0, preparingOrders: 0, shippedOrders: 0, deliveredOrders: 0, totalRevenue: 0, revenueToday: 0 }
    };

    console.log('📊 Dashboard stats calculated:', stats);

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'İstatistikler yüklenemedi' });
  }
});

// Son aktiviteler
router.get('/dashboard/activity', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    // Son kullanıcı kayıtları
    const recentUsers = await query(`
      SELECT id, firstName, lastName, email, created_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `) as any[];
    
    // Son oluşturulan ilanlar
    const recentListings = await query(`
      SELECT id, title, created_at
      FROM listings
      ORDER BY created_at DESC 
      LIMIT 5
    `) as any[];

    // Son siparişler
    const recentOrders = await query(`
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.total_amount,
        o.created_at,
        CONCAT(u.firstName, ' ', u.lastName) as buyer_name
      FROM orders o
      LEFT JOIN users u ON o.buyer_id = u.id
      ORDER BY o.created_at DESC 
      LIMIT 5
    `) as any[];

    res.json({ 
      success: true, 
      activity: {
        users: recentUsers,
        listings: recentListings,
        orders: recentOrders
      }
    });
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ success: false, message: 'Aktiviteler yüklenemedi' });
  }
});

// Kullanıcı listesi (admin)
router.get('/users', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    console.log('🔍 Admin users endpoint called');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    let whereClause = '';
    const queryParams: any[] = [];

    if (search) {
      whereClause = 'WHERE (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?)';
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Basit kullanıcı listesi - LIMIT/OFFSET cannot be placeholders in MySQL prepared statements
    const users = await query(`
      SELECT 
        id, firstName, lastName, email, phone, 
        role, created_at, city, gender, email_verified
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, queryParams) as any[];

    console.log('📊 Found users:', users.length);

    // Toplam kullanıcı sayısı için search parametrelerini tekrar oluştur
    const countParams: any[] = [];
    if (search) {
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    const totalResult = await query(`
      SELECT COUNT(*) as total FROM users ${whereClause}
    `, countParams) as any[];

    const total = totalResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({ 
      success: true, 
      users: users.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        role: user.role || 'user',
        status: 'active', // Varsayılan
        createdAt: user.created_at,
        lastActive: user.created_at,
        listingCount: 0, // Basit
        orderCount: 0, // Basit
        emailVerified: !!user.email_verified
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ success: false, message: 'Kullanıcılar yüklenemedi' });
  }
});

// Yeni kullanıcı oluşturma (admin)
router.post('/users', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, password, role = 'user' } = req.body;

    // Gerekli alanları kontrol et
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ad, soyad, email ve şifre gereklidir' 
      });
    }

    // Email'in benzersiz olduğunu kontrol et
    const existingUsers = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    ) as any[];

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu email adresi zaten kullanılıyor' 
      });
    }

    // Şifreyi hash'le
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcıyı oluştur
    const result = await query(
      `INSERT INTO users (firstName, lastName, email, phone, password_hash, role, email_verified, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())`,
      [firstName, lastName, email, phone || null, hashedPassword, role]
    ) as any;

    console.log(`✅ Admin created new user: ${email} (role: ${role})`);

    res.status(201).json({ 
      success: true, 
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: result.insertId,
        firstName,
        lastName,
        email,
        phone,
        role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Kullanıcı oluşturulamadı' });
  }
});

// Kullanıcı güncelleme (admin)
router.put('/users/:userId', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, phone, role, password } = req.body;

    // Gerekli alanları kontrol et
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ad, soyad ve email gereklidir' 
      });
    }

    // Kullanıcının var olduğunu kontrol et
    const existingUser = await query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (existingUser.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kullanıcı bulunamadı' 
      });
    }

    // Email'in benzersiz olduğunu kontrol et (kendi emaili hariç)
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    ) as any[];

    if (emailCheck.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu email adresi başka bir kullanıcı tarafından kullanılıyor' 
      });
    }

    // Güncelleme query'sini hazırla
    let updateQuery = `
      UPDATE users 
      SET firstName = ?, lastName = ?, email = ?, phone = ?, role = ?
    `;
    let queryParams = [firstName, lastName, email, phone || null, role || 'user'];

    // Eğer şifre güncellenecekse
    if (password && password.trim() !== '') {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password_hash = ?';
      queryParams.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(userId);

    // Kullanıcıyı güncelle
    await query(updateQuery, queryParams);

    // Güncellenmiş kullanıcı bilgilerini al
    const updatedUser = await query(
      'SELECT id, firstName, lastName, email, phone, role, created_at FROM users WHERE id = ?',
      [userId]
    ) as any[];

    console.log(`✅ Admin updated user: ${email} (role: ${role})`);

    res.json({ 
      success: true, 
      message: 'Kullanıcı başarıyla güncellendi',
      user: updatedUser[0]
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    console.error('Error details:', {
      userId: req.params.userId,
      requestBody: req.body
    });
    res.status(500).json({ 
      success: false, 
      message: 'Kullanıcı güncellenemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Kullanıcı askıya alma
router.post('/users/:userId/suspend', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { reason } = req.body;

    // Users tablosunda status field'i olmayabilir, o yüzden basit bir yaklaşım kullanalım
    // Önce kullanıcının var olup olmadığını kontrol edelim
    const users = await query(
      'SELECT id, email FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    console.log(`🔒 Admin suspending user: ${users[0].email}`);
    
    // Şimdilik sadece log tutuyoruz, actual suspend functionality eklenebilir
    res.json({ success: true, message: 'Kullanıcı askıya alındı (simulated)' });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ success: false, message: 'Kullanıcı askıya alınamadı' });
  }
});
// Kullanıcı aktif hale getirme
router.post('/users/:userId/activate', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Kullanıcının var olup olmadığını kontrol et
    const users = await query(
      'SELECT id, email FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    console.log(`✅ Admin activating user: ${users[0].email}`);
    
    res.json({ success: true, message: 'Kullanıcı aktif hale getirildi (simulated)' });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ success: false, message: 'Kullanıcı aktif hale getirilemedi' });
  }
});

// Kullanıcı silme (admin)
router.delete('/users/:userId', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const users = await query(
      'SELECT id, email, firstName, lastName, role FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    const user = users[0];
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin kullanıcı silinemez' });
    }

    // İlgili kayıtları temizle
    await query('DELETE FROM email_verification_tokens WHERE user_id = ?', [userId]);
    await query('DELETE FROM favorites WHERE user_id = ?', [userId]);
    await query('DELETE FROM notifications WHERE user_id = ?', [userId]).catch(() => {});
    await query("UPDATE listings SET status = 'deleted' WHERE buyer_id = ?", [userId]);
    await query('DELETE FROM users WHERE id = ?', [userId]);

    console.log(`🗑️ Admin deleted user: ${user.email}`);
    res.json({ success: true, message: `${user.firstName} ${user.lastName} başarıyla silindi` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Kullanıcı silinirken hata oluştu' });
  }
});

// Doğrulama emailini yeniden gönder (admin)
router.post('/users/:userId/resend-verification', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const users = await query(
      'SELECT id, email, firstName, lastName, email_verified FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    const user = users[0];

    // Eski token'ları sil
    await query('DELETE FROM email_verification_tokens WHERE user_id = ?', [userId]);

    // Yeni token oluştur
    const tokenId = uuidv4();
    const verificationToken = uuidv4();
    await query(
      `INSERT INTO email_verification_tokens (id, token, user_id, email, expires_at, created_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW())`,
      [tokenId, verificationToken, userId, user.email]
    );

    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'https://varmii.com';
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

    const { sendVerificationEmail } = await import('../services/emailService.js');
    await sendVerificationEmail(user.email, verificationUrl, `${user.firstName} ${user.lastName}`);

    console.log(`📧 Admin resent verification email to: ${user.email}`);
    res.json({ success: true, message: `${user.firstName} ${user.lastName} adresine doğrulama emaili gönderildi` });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Doğrulama emaili gönderilemedi' });
  }
});

// İlan listesi (admin)
router.get('/listings', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    console.log('📋 Admin listings request:', { page, limit, status });

    // Önce basit bir listings query'si yapalım
    let whereClause = '';
    const params: any[] = [];

    if (status && status !== 'all') {
      whereClause = 'WHERE status = ?';
      params.push(status);
    }

    try {
      // Gerçek teklif sayıları ile birlikte listings sorgusu
      const listings = await query(`
        SELECT 
          l.id,
          l.title,
          l.description,
          l.images,
          l.category,
          l.budget_max,
          l.listing_condition,
          l.city,
          l.delivery_type,
          l.buyer_id,
          l.buyer_name,
          l.offers_public,
          l.offers_purchasable,
          l.status,
          l.approval_status,
          l.approved_by,
          l.approved_at,
          l.rejection_reason,
          l.expires_at,
          l.view_count,
          l.favorite_count,
          l.created_at,
          l.updated_at,
          l.mask_owner_name,
          COALESCE(offer_stats.offer_count, 0) as offer_count
        FROM listings l
        LEFT JOIN (
          SELECT 
            listing_id, 
            COUNT(*) as offer_count 
          FROM offers 
          WHERE status IN ('active', 'accepted')
          GROUP BY listing_id
        ) offer_stats ON l.id = offer_stats.listing_id
        ${whereClause}
        ORDER BY l.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, params) as any[];

      console.log('📊 Found listings:', (listings as any[]).length);
      console.log('🔍 First listing offer count debug:', listings[0] ? {
        id: listings[0].id,
        title: listings[0].title,
        offer_count: listings[0].offer_count
      } : 'No listings found');

      // Debug: offers tablosunu kontrol et
      const debugOffers = await query(`
        SELECT listing_id, COUNT(*) as count, status 
        FROM offers 
        GROUP BY listing_id, status 
        LIMIT 10
      `) as any[];
      console.log('🔍 Debug all offers with statuses:', debugOffers);

      const debugActiveOffers = await query(`
        SELECT listing_id, COUNT(*) as count, status 
        FROM offers 
        WHERE status IN ('active', 'accepted') 
        GROUP BY listing_id, status 
        LIMIT 10
      `) as any[];
      console.log('🔍 Debug active+accepted offers:', debugActiveOffers);

      const countResult = await query(`
        SELECT COUNT(*) as total FROM listings ${whereClause}
      `, params) as any[];

      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      console.log('📈 Total listings:', total);

      res.json({ 
        success: true, 
        listings,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
    } catch (dbError: any) {
      console.error('📋 Database error for listings:', dbError);
      console.error('📋 Database error details:', {
        message: dbError?.message,
        code: dbError?.code,
        sql: dbError?.sql
      });
      
      // Database hatası durumunda boş sonuç döndür
      res.json({ 
        success: true, 
        listings: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0
        },
        debug: {
          error: dbError?.message || 'Unknown error',
          hasData: false
        }
      });
    }
  } catch (error: any) {
    console.error('Admin listings error:', error);
    console.error('Error details:', {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status
    });
    res.status(500).json({ 
      success: false, 
      message: 'İlanlar yüklenemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// İlan durumu değiştirme
router.post('/listings/:listingId/status', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const listingId = req.params.listingId;
    const { status, reason } = req.body;

    await query(
      'UPDATE listings SET status = ? WHERE id = ?',
      [status, listingId]
    );

    console.log(`✅ Admin updated listing ${listingId} status to: ${status}`);

    // Admin log kaydını şimdilik atlayalım, çünkü admin_logs tablosu olmayabilir
    // await query(
    //   'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
    //   [(req as any).userId, 'update_listing_status', 'listing', listingId, `Status: ${status}, Reason: ${reason || 'N/A'}`]
    // );

    res.json({ success: true, message: 'İlan durumu güncellendi' });
  } catch (error) {
    console.error('Update listing status error:', error);
    res.status(500).json({ success: false, message: 'İlan durumu güncellenemedi' });
  }
});

// Kullanıcıya email gönderme (admin)
router.post('/users/:userId/send-email', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { subject, message, emailType = 'custom' } = req.body;

    // Gerekli alanları kontrol et
    if (!subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Konu ve mesaj alanları gereklidir' 
      });
    }

    // Kullanıcı bilgilerini al
    const users = await query(
      'SELECT firstName, lastName, email FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kullanıcı bulunamadı' 
      });
    }

    const user = users[0];
    
    // Check if SMTP host is configured (allow sendmail with localhost)
    const smtpConfigured = process.env.SMTP_HOST && 
                          (process.env.SMTP_HOST === 'localhost' || 
                           process.env.SMTP_HOST === '127.0.0.1' ||
                           (process.env.SMTP_USER && process.env.SMTP_PASS));

    if (!smtpConfigured) {
      console.log('⚠️ SMTP not configured, skipping email send');
      return res.json({ 
        success: true, 
        message: `Email hazırlandı (SMTP yapılandırılmadığı için gönderilmedi)`,
        warning: 'SMTP ayarları yapılandırılmamış. Lütfen .env dosyasında SMTP_HOST değerini güncelleyin.'
      });
    }

    const { sendCustomEmail } = await import('../services/emailService.js');

    // Email gönder
    try {
      await sendCustomEmail(
        user.email,
        subject,
        message,
        `${user.firstName} ${user.lastName}`
      );

      console.log(`✅ Admin sent email to user: ${user.email} - Subject: ${subject}`);

      res.json({ 
        success: true, 
        message: `${user.firstName} ${user.lastName} adresine email başarıyla gönderildi` 
      });
    } catch (emailError: any) {
      console.error('Email send failed:', emailError);
      res.status(500).json({ 
        success: false, 
        message: 'Email gönderilemedi. SMTP ayarlarını kontrol edin.',
        error: process.env.NODE_ENV === 'development' ? emailError.message : 'SMTP bağlantı hatası'
      });
    }
  } catch (error: any) {
    console.error('Send email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Email gönderilemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// İlan görüntülenme sayısını artır
router.post('/listings/:listingId/increment-view', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;
    
    await query(
      'UPDATE listings SET view_count = view_count + 1 WHERE id = ?',
      [listingId]
    );
    
    console.log(`👁️ Incremented view count for listing: ${listingId}`);
    
    res.json({ success: true, message: 'Görüntülenme sayısı artırıldı' });
  } catch (error: any) {
    console.error('Increment view error:', error);
    res.status(500).json({ success: false, message: 'Görüntülenme sayısı artırılamadı' });
  }
});

// İlan favori sayısını artır/azalt
router.post('/listings/:listingId/toggle-favorite', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;
    const { increment } = req.body; // true = artır, false = azalt
    
    const operation = increment ? 'favorite_count + 1' : 'favorite_count - 1';
    
    await query(
      `UPDATE listings SET favorite_count = GREATEST(0, ${operation}) WHERE id = ?`,
      [listingId]
    );
    
    console.log(`❤️ ${increment ? 'Incremented' : 'Decremented'} favorite count for listing: ${listingId}`);
    
    res.json({ success: true, message: `Favori sayısı ${increment ? 'artırıldı' : 'azaltıldı'}` });
  } catch (error: any) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, message: 'Favori sayısı güncellenemedi' });
  }
});

// Admin orders endpoint
router.get('/orders', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    console.log('📋 Admin orders request:', { page, limit, status });

    let whereClause = '';
    const params: any[] = [];

    if (status && status !== 'all') {
      whereClause = `WHERE (
        CASE 
          WHEN o.status = '' OR o.status IS NULL THEN 
            CASE 
              WHEN o.delivered_at IS NOT NULL THEN 'delivered'
              WHEN o.shipped_at IS NOT NULL THEN 'shipped' 
              WHEN o.started_processing_at IS NOT NULL THEN 'preparing'
              ELSE 'pending'
            END
          ELSE o.status 
        END
      ) = ?`;
      params.push(status);
    }

    try {
      // Orders tablosundan gerçek veriler çek
      const orders = await query(`
        SELECT 
          o.id,
          CONCAT('VRM-', YEAR(o.created_at), '-', LPAD(MONTH(o.created_at), 2, '0'), '-', SUBSTRING(o.id, 1, 6)) as order_number,
          o.total_amount,
          CASE 
            WHEN o.status = '' OR o.status IS NULL THEN 
              CASE 
                WHEN o.delivered_at IS NOT NULL THEN 'delivered'
                WHEN o.shipped_at IS NOT NULL THEN 'shipped' 
                WHEN o.started_processing_at IS NOT NULL THEN 'preparing'
                ELSE 'pending'
              END
            ELSE o.status 
          END as status,
          o.shipping_address,
          o.tracking_number,
          o.carrier_company,
          o.created_at,
          o.updated_at,
          b.firstName as buyer_first_name,
          b.lastName as buyer_last_name,
          b.email as buyer_email,
          GROUP_CONCAT(
            CONCAT(
              COALESCE(oi.title, 'Ürün'), ' (', COALESCE(oi.quantity, 1), 'x)'
            ) SEPARATOR ', '
          ) as items_summary,
          GROUP_CONCAT(
            DISTINCT CONCAT(seller_users.firstName, ' ', seller_users.lastName)
            SEPARATOR ', '
          ) as seller_names
        FROM orders o
        LEFT JOIN users b ON o.user_id = b.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN offers off ON oi.offer_id = off.id
        LEFT JOIN users seller_users ON off.seller_id = seller_users.id
        ${whereClause}
        GROUP BY o.id, o.total_amount, o.status, o.shipping_address, 
                 o.tracking_number, o.carrier_company, o.created_at, o.updated_at,
                 b.firstName, b.lastName, b.email
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, params) as any[];

      console.log('📊 Found orders:', orders.length);

      const countResult = await query(`
        SELECT COUNT(DISTINCT o.id) as total FROM orders o ${whereClause}
      `, params) as any[];

      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      // Transform orders data
      const transformedOrders = orders.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        listingTitle: order.items_summary || 'Bilinmeyen ürün',
        buyerName: `${order.buyer_first_name || ''} ${order.buyer_last_name || ''}`.trim() || 'Bilinmeyen kullanıcı',
        sellerName: order.seller_names || 'Bilinmeyen satıcı',
        buyerEmail: order.buyer_email,
        totalAmount: parseFloat(order.total_amount) || 0,
        status: order.status,
        shippingAddress: order.shipping_address,
        trackingNumber: order.tracking_number,
        carrierCompany: order.carrier_company,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }));

      console.log('📈 Total orders:', total);

      res.json({
        success: true,
        orders: transformedOrders,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });

    } catch (dbError) {
      console.error('Database error in admin orders:', dbError);
      
      // Fallback: mock data if orders table doesn't exist
      const mockOrders = [
        {
          id: '1',
          orderNumber: 'VRM-2024-001',
          listingTitle: 'iPhone 15 Pro Max',
          buyerName: 'Ahmet Yılmaz',
          buyerEmail: 'ahmet@example.com',
          totalAmount: 45000,
          status: 'preparing',
          shippingAddress: 'İstanbul, Kadıköy',
          trackingNumber: 'TK123456789',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          orderNumber: 'VRM-2024-002',
          listingTitle: 'MacBook Air M2',
          buyerName: 'Fatma Demir',
          buyerEmail: 'fatma@example.com',
          totalAmount: 32000,
          status: 'shipped',
          shippingAddress: 'Ankara, Çankaya',
          trackingNumber: 'TK987654321',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      res.json({
        success: true,
        orders: mockOrders,
        pagination: {
          page: 1,
          limit,
          total: mockOrders.length,
          totalPages: 1
        }
      });
    }

  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ success: false, message: 'Siparişler yüklenemedi' });
  }
});

// Update order status
router.put('/orders/:orderId/status', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber } = req.body;

    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Durum gereklidir' 
      });
    }

    let updateQuery = 'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?';
    let updateParams = [status, orderId];

    // Status'a göre timestamp'leri de güncelle
    if (status === 'preparing' && !trackingNumber) {
      updateQuery = 'UPDATE orders SET status = ?, started_processing_at = NOW(), updated_at = NOW() WHERE id = ?';
    } else if (status === 'shipped') {
      if (trackingNumber) {
        updateQuery = 'UPDATE orders SET status = ?, tracking_number = ?, shipped_at = NOW(), updated_at = NOW() WHERE id = ?';
        updateParams = [status, trackingNumber, orderId];
      } else {
        updateQuery = 'UPDATE orders SET status = ?, shipped_at = NOW(), updated_at = NOW() WHERE id = ?';
      }
    } else if (status === 'delivered') {
      updateQuery = 'UPDATE orders SET status = ?, delivered_at = NOW(), completed_at = NOW(), updated_at = NOW() WHERE id = ?';
    } else if (trackingNumber) {
      updateQuery = 'UPDATE orders SET status = ?, tracking_number = ?, updated_at = NOW() WHERE id = ?';
      updateParams = [status, trackingNumber, orderId];
    }

    await query(updateQuery, updateParams);

    console.log(`📦 Updated order ${orderId} status to ${status}`);

    res.json({ 
      success: true, 
      message: 'Sipariş durumu güncellendi' 
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sipariş durumu güncellenemedi' 
    });
  }
});

// Get single order detail
router.get('/orders/:orderId', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    console.log('📋 Admin order detail request:', orderId);

    try {
      // Order basic info
      const orders = await query(`
        SELECT 
          o.id,
          CONCAT('VRM-', YEAR(o.created_at), '-', LPAD(MONTH(o.created_at), 2, '0'), '-', SUBSTRING(o.id, 1, 6)) as order_number,
          o.total_amount,
          CASE 
            WHEN o.status = '' OR o.status IS NULL THEN 
              CASE 
                WHEN o.delivered_at IS NOT NULL THEN 'delivered'
                WHEN o.shipped_at IS NOT NULL THEN 'shipped' 
                WHEN o.started_processing_at IS NOT NULL THEN 'preparing'
                ELSE 'pending'
              END
            ELSE o.status 
          END as status,
          o.payment_status,
          o.shipping_cost,
          o.shipping_address,
          o.tracking_number,
          o.carrier_company,
          o.estimated_delivery,
          o.created_at,
          o.updated_at,
          o.started_processing_at,
          o.shipped_at,
          o.delivered_at,
          o.completed_at,
          b.id as buyer_id,
          b.firstName as buyer_first_name,
          b.lastName as buyer_last_name,
          b.email as buyer_email,
          b.phone as buyer_phone
        FROM orders o
        LEFT JOIN users b ON o.user_id = b.id
        WHERE o.id = ?
      `, [orderId]) as any[];

      if (orders.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Sipariş bulunamadı' 
        });
      }

      const order = orders[0];

      // Order items
      const items = await query(`
        SELECT 
          oi.id,
          oi.title,
          oi.description,
          oi.price,
          oi.quantity,
          oi.image,
          s.firstName as seller_first_name,
          s.lastName as seller_last_name,
          s.email as seller_email,
          s.phone as seller_phone
        FROM order_items oi
        LEFT JOIN offers off ON oi.offer_id = off.id
        LEFT JOIN users s ON off.seller_id = s.id
        WHERE oi.order_id = ?
        ORDER BY oi.created_at
      `, [orderId]) as any[];

      // Transform data
      const transformedOrder = {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: order.payment_status,
        totalAmount: parseFloat(order.total_amount) || 0,
        shippingCost: parseFloat(order.shipping_cost) || 0,
        shippingAddress: order.shipping_address,
        trackingNumber: order.tracking_number,
        carrierCompany: order.carrier_company,
        estimatedDelivery: order.estimated_delivery,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        startedProcessingAt: order.started_processing_at,
        shippedAt: order.shipped_at,
        deliveredAt: order.delivered_at,
        completedAt: order.completed_at,
        buyer: {
          id: order.buyer_id,
          firstName: order.buyer_first_name,
          lastName: order.buyer_last_name,
          email: order.buyer_email,
          phone: order.buyer_phone
        },
        items: items.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          price: parseFloat(item.price) || 0,
          quantity: item.quantity || 1,
          image: item.image,
          seller: {
            firstName: item.seller_first_name,
            lastName: item.seller_last_name,
            email: item.seller_email,
            phone: item.seller_phone
          }
        }))
      };

      console.log('📊 Order detail loaded:', { id: orderId, itemsCount: items.length });

      res.json({
        success: true,
        order: transformedOrder
      });

    } catch (dbError) {
      console.error('Database error in admin order detail:', dbError);
      
      // Fallback: mock data
      const mockOrder = {
        id: orderId,
        orderNumber: 'VRM-2024-001',
        status: 'delivered',
        paymentStatus: 'paid',
        totalAmount: 45000,
        shippingCost: 99.99,
        shippingAddress: 'İstanbul, Kadıköy',
        trackingNumber: 'TK123456789',
        carrierCompany: 'MNG Kargo',
        estimatedDelivery: new Date().toISOString(),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        startedProcessingAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        shippedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        deliveredAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        buyer: {
          id: '1',
          firstName: 'Ahmet',
          lastName: 'Yılmaz',
          email: 'ahmet@example.com',
          phone: '+90 555 123 4567'
        },
        items: [
          {
            id: '1',
            title: 'iPhone 15 Pro Max',
            description: '256GB Doğal Titanyum',
            price: 45000,
            quantity: 1,
            image: '/placeholder-product.png',
            seller: {
              firstName: 'Mehmet',
              lastName: 'Kaya'
            }
          }
        ]
      };

      res.json({
        success: true,
        order: mockOrder
      });
    }

  } catch (error) {
    console.error('Admin order detail error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sipariş detayları yüklenemedi' 
    });
  }
});

// ============================================
// LISTING APPROVAL SYSTEM - Admin İlan Onay Sistemi
// ============================================

// Onay bekleyen ilanları listele
router.get('/listings/pending', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    console.log('🔍 Admin fetching pending listings...');
    
    const pendingListings = await query(`
      SELECT 
        l.id,
        l.title,
        l.category,
        l.listing_condition,
        l.budget_max,
        l.city,
        l.description,
        l.images,
        l.created_at,
        l.approval_status,
        u.id as buyer_id,
        u.email as buyer_email,
        u.firstName as buyer_first_name,
        u.lastName as buyer_last_name,
        u.phone as buyer_phone
      FROM listings l
      JOIN users u ON l.buyer_id = u.id
      WHERE l.approval_status = 'pending'
      ORDER BY l.created_at ASC
    `) as any[];

    console.log(`✅ Found ${pendingListings.length} pending listings`);

    res.json({
      success: true,
      listings: pendingListings.map(listing => ({
        id: listing.id,
        title: listing.title,
        category: listing.category,
        condition: listing.listing_condition,
        budgetMax: parseFloat(listing.budget_max) || 0,
        city: listing.city,
        description: listing.description,
        images: listing.images ? JSON.parse(listing.images) : [],
        createdAt: listing.created_at,
        approvalStatus: listing.approval_status,
        buyer: {
          id: listing.buyer_id,
          email: listing.buyer_email,
          firstName: listing.buyer_first_name,
          lastName: listing.buyer_last_name,
          phone: listing.buyer_phone
        }
      }))
    });

  } catch (error) {
    console.error('❌ Fetch pending listings error:', error);
    res.status(500).json({
      success: false,
      message: 'Onay bekleyen ilanlar yüklenemedi'
    });
  }
});

// İlanı onayla
router.post('/listings/approve/:id', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const listingId = req.params.id;
    const adminId = req.userId;

    console.log(`✅ Admin ${adminId} approving listing ${listingId}...`);

    // İlan var mı kontrol et
    const listings = await query(
      'SELECT id, title, buyer_id, approval_status FROM listings WHERE id = ?',
      [listingId]
    ) as any[];

    if (listings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    const listing = listings[0];

    if (listing.approval_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Bu ilan zaten onaylanmış veya reddedilmiş'
      });
    }

    // İlanı onayla ve aktif yap
    await query(
      `UPDATE listings 
       SET approval_status = 'approved', 
           approved_by = ?, 
           approved_at = NOW(),
           status = 'active'
       WHERE id = ?`,
      [adminId, listingId]
    );

    // Audit kaydı oluştur
    const auditId = uuidv4();
    await query(
      `INSERT INTO listing_approval_audit (id, listing_id, action, performed_by, created_at)
       VALUES (?, ?, 'approved', ?, NOW())`,
      [auditId, listingId, adminId]
    );

    console.log(`✅ Listing ${listingId} approved successfully`);

    // Redis cache temizle - homepage'de yeni ilan görünsün
    await redisCache.delete(CacheKeys.listingsActive());
    console.log('🗑️ Redis cache cleared for listings:active');

    res.json({
      success: true,
      message: 'İlan başarıyla onaylandı ve yayına alındı'
    });

    // İlan sahibine bildirim gönder (non-blocking - response gönderildikten sonra)
    setImmediate(async () => {
      try {
        const userResult = await query(
          'SELECT email, firstName FROM users WHERE id = ?',
          [listing.buyer_id]
        ) as any[];

        if (userResult.length > 0) {
          await sendListingApprovedNotification(
            userResult[0].email,
            listing.title,
            userResult[0].firstName,
            String(listing.buyer_id),
            String(listing.id)
          );
          console.log('📧 Listing approval email sent to:', userResult[0].email);
        }
      } catch (emailError) {
        console.error('❌ Email send error:', emailError);
      }
    });

  } catch (error) {
    console.error('❌ Approve listing error:', error);
    res.status(500).json({
      success: false,
      message: 'İlan onaylanırken hata oluştu'
    });
  }
});

// İlanı reddet
router.post('/listings/reject/:id', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const listingId = req.params.id;
    const adminId = req.userId;
    const { reason } = req.body;

    console.log(`❌ Admin ${adminId} rejecting listing ${listingId}...`);

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reddetme sebebi gereklidir'
      });
    }

    // İlan var mı kontrol et
    const listings = await query(
      'SELECT id, title, buyer_id, approval_status FROM listings WHERE id = ?',
      [listingId]
    ) as any[];

    if (listings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    const listing = listings[0];

    if (listing.approval_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Bu ilan zaten onaylanmış veya reddedilmiş'
      });
    }

    // İlanı reddet
    await query(
      `UPDATE listings 
       SET approval_status = 'rejected', 
           approved_by = ?, 
           approved_at = NOW(),
           rejection_reason = ?,
           status = 'inactive'
       WHERE id = ?`,
      [adminId, reason, listingId]
    );

    // Audit kaydı oluştur
    const auditId = uuidv4();
    await query(
      `INSERT INTO listing_approval_audit (id, listing_id, action, performed_by, reason, created_at)
       VALUES (?, ?, 'rejected', ?, ?, NOW())`,
      [auditId, listingId, adminId, reason]
    );

    console.log(`❌ Listing ${listingId} rejected successfully`);

    res.json({
      success: true,
      message: 'İlan reddedildi'
    });

    // İlan sahibine bildirim gönder (non-blocking - response gönderildikten sonra)
    setImmediate(async () => {
      try {
        const userResult = await query(
          'SELECT email, firstName FROM users WHERE id = ?',
          [listing.buyer_id]
        ) as any[];

        if (userResult.length > 0) {
          await sendListingRejectedNotification(
            userResult[0].email,
            listing.title,
            reason,
            userResult[0].firstName,
            String(listing.buyer_id),
            String(listing.id)
          );
          console.log('📧 Listing rejection email sent to:', userResult[0].email);
        }
      } catch (emailError) {
        console.error('❌ Email send error:', emailError);
      }
    });

  } catch (error) {
    console.error('❌ Reject listing error:', error);
    res.status(500).json({
      success: false,
      message: 'İlan reddedilirken hata oluştu'
    });
  }
});

// İlan durumunu değiştir (askıya al, aktif et, vb.)
router.put('/listings/:listingId/status', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { listingId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.userId;

    console.log('🎯 Admin changing listing status:', { listingId, status, reason, adminId });

    // Geçerli status değerlerini kontrol et
    const validStatuses = ['active', 'inactive', 'deleted', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum değeri'
      });
    }

    // İlan bilgilerini al
    const listingResult = await query(
      'SELECT * FROM listings WHERE id = ?',
      [listingId]
    ) as any[];

    if (!listingResult || listingResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    const listing = listingResult[0];
    const previousStatus = listing.status;

    // Durumu güncelle
    await query(
      'UPDATE listings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, listingId]
    );

    // Audit kaydı oluştur
    const auditId = uuidv4();
    await query(
      `INSERT INTO listing_approval_audit 
       (id, listing_id, action, performed_by, reason, previous_status, new_status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [auditId, listingId, 'status_changed', adminId, reason || null, previousStatus, status]
    );

    console.log('✅ Listing status updated successfully');

    res.json({
      success: true,
      message: 'İlan durumu güncellendi',
      data: {
        listingId,
        previousStatus,
        newStatus: status
      }
    });

    // Email bildirimi gönder (opsiyonel)
    if (status === 'suspended' && listing.buyer_id) {
      setImmediate(async () => {
        try {
          const userResult = await query(
            'SELECT email, firstName FROM users WHERE id = ?',
            [listing.buyer_id]
          ) as any[];

          if (userResult && userResult.length > 0) {
            // Burada suspend email fonksiyonu eklenebilir
            console.log('📧 Listing suspended notification should be sent to:', userResult[0].email);
          }
        } catch (emailError) {
          console.error('❌ Email send error:', emailError);
        }
      });
    }

  } catch (error) {
    console.error('❌ Update listing status error:', error);
    res.status(500).json({
      success: false,
      message: 'İlan durumu güncellenirken hata oluştu'
    });
  }
});

// İlanı sil (admin)
router.delete('/listings/:listingId', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { listingId } = req.params;
    const adminId = req.userId;

    console.log('🗑️ Admin deleting listing (HARD DELETE):', { listingId, adminId });

    // İlan var mı kontrol et
    const listingResult = await query(
      'SELECT id, title, buyer_id, images FROM listings WHERE id = ?',
      [listingId]
    ) as any[];

    if (!listingResult || listingResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlan bulunamadı'
      });
    }

    const listing = listingResult[0];

    // İlişkili verileri sil (Foreign key constraints nedeniyle sırayla)
    
    // 1. Favorileri sil
    await query('DELETE FROM favorites WHERE listing_id = ?', [listingId]);
    console.log('✅ Favorites deleted');

    // 2. Admin bildirimlerini sil
    await query('DELETE FROM admin_notifications WHERE listing_id = ?', [listingId]);
    console.log('✅ Admin notifications deleted');

    // 3. Onay audit kayıtlarını sil
    await query('DELETE FROM listing_approval_audit WHERE listing_id = ?', [listingId]);
    console.log('✅ Approval audit records deleted');

    // 4. Teklifleri sil
    await query('DELETE FROM offers WHERE listing_id = ?', [listingId]);
    console.log('✅ Offers deleted');

    // 5. Siparişleri sil (order_items üzerinden)
    // Önce order_items'dan bu ilana ait kayıtları bul
    const orderItems = await query('SELECT order_id FROM order_items WHERE listing_id = ?', [listingId]) as any[];
    
    if (orderItems && orderItems.length > 0) {
      const orderIds = [...new Set(orderItems.map((item: any) => item.order_id))]; // Unique order IDs
      console.log(`📦 Found ${orderIds.length} orders related to this listing`);
      
      for (const orderId of orderIds) {
        // Her sipariş için ilişkili kayıtları sil
        await query('DELETE FROM order_status_audit WHERE order_id = ?', [orderId]);
        await query('DELETE FROM order_tracking WHERE order_id = ?', [orderId]);
        await query('DELETE FROM order_notifications WHERE order_id = ?', [orderId]);
        
        // Order_items'dan bu siparişin BU İLANA ait kayıtlarını sil
        await query('DELETE FROM order_items WHERE order_id = ? AND listing_id = ?', [orderId, listingId]);
        
        // Eğer bu siparişin başka item'ı kalmadıysa siparişi de sil
        const remainingItems = await query('SELECT COUNT(*) as count FROM order_items WHERE order_id = ?', [orderId]) as any[];
        if (remainingItems[0].count === 0) {
          await query('DELETE FROM orders WHERE id = ?', [orderId]);
          console.log(`🗑️ Order ${orderId} completely deleted (no items left)`);
        }
      }
      console.log(`✅ Order related data cleaned for ${orderIds.length} orders`);
    }

    // 6. İlanı sil
    await query('DELETE FROM listings WHERE id = ?', [listingId]);
    console.log('✅ Listing deleted from database');

    // 7. Görselleri diskten sil (opsiyonel)
    // TODO: listing.images JSON parse edip dosyaları sil

    console.log('✅ Listing and all related data deleted successfully by admin');

    res.json({
      success: true,
      message: 'İlan ve ilişkili tüm veriler silindi',
      data: {
        listingId,
        title: listing.title
      }
    });

  } catch (error) {
    console.error('❌ Delete listing error:', error);
    res.status(500).json({
      success: false,
      message: 'İlan silinirken hata oluştu'
    });
  }
});

// Onaylanmış ilanları listele (istatistik için)
router.get('/listings/approved', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const approvedListings = await query(`
      SELECT 
        l.id,
        l.title,
        l.approved_at,
        u.firstName as admin_first_name,
        u.lastName as admin_last_name
      FROM listings l
      LEFT JOIN users u ON l.approved_by = u.id
      WHERE l.approval_status = 'approved'
      ORDER BY l.approved_at DESC
      LIMIT 50
    `) as any[];

    res.json({
      success: true,
      listings: approvedListings
    });

  } catch (error) {
    console.error('❌ Fetch approved listings error:', error);
    res.status(500).json({
      success: false,
      message: 'Onaylanmış ilanlar yüklenemedi'
    });
  }
});

// Reddedilmiş ilanları listele
router.get('/listings/rejected', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const rejectedListings = await query(`
      SELECT 
        l.id,
        l.title,
        l.rejection_reason,
        l.approved_at as rejected_at,
        u.firstName as admin_first_name,
        u.lastName as admin_last_name
      FROM listings l
      LEFT JOIN users u ON l.approved_by = u.id
      WHERE l.approval_status = 'rejected'
      ORDER BY l.approved_at DESC
      LIMIT 50
    `) as any[];

    res.json({
      success: true,
      listings: rejectedListings
    });

  } catch (error) {
    console.error('❌ Fetch rejected listings error:', error);
    res.status(500).json({
      success: false,
      message: 'Reddedilmiş ilanlar yüklenemedi'
    });
  }
});

// ============================================
// OFFERS MANAGEMENT - Admin Teklif Yönetimi
// ============================================

// Tüm teklifleri listele (admin)
router.get('/offers', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    console.log('🎯 Admin offers request:', { page, limit, status });

    let whereClause = '';
    const params: any[] = [];

    if (status && status !== 'all') {
      whereClause = 'WHERE o.status = ?';
      params.push(status);
    }

    const offers = await query(`
      SELECT 
        o.id,
        o.listing_id,
        o.seller_id,
        o.price,
        o.quantity,
        o.offer_condition,
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
        o.updated_at,
        o.valid_until,
        o.images,
        l.title as listing_title,
        l.category as listing_category,
        l.budget_max as listing_budget,
        CONCAT(buyer.firstName, ' ', buyer.lastName) as buyer_name,
        buyer.email as buyer_email,
        buyer.phone as buyer_phone,
        CONCAT(seller.firstName, ' ', seller.lastName) as seller_name,
        seller.email as seller_email,
        seller.phone as seller_phone
      FROM offers o
      LEFT JOIN listings l ON o.listing_id = l.id
      LEFT JOIN users buyer ON l.buyer_id = buyer.id
      LEFT JOIN users seller ON o.seller_id = seller.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params) as any[];

    console.log('📊 Found offers:', offers.length);

    // Toplam teklif sayısı
    const countResult = await query(`
      SELECT COUNT(*) as total FROM offers o ${whereClause}
    `, params) as any[];

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Transform offers data
    const transformedOffers = offers.map(offer => ({
      id: offer.id,
      listingId: offer.listing_id,
      listingTitle: offer.listing_title || 'Bilinmeyen ilan',
      listingCategory: offer.listing_category,
      listingBudget: parseFloat(offer.listing_budget) || 0,
      productName: offer.product_name,
      description: offer.description,
      price: parseFloat(offer.price) || 0,
      quantity: offer.quantity || 1,
      condition: offer.offer_condition,
      deliveryType: offer.delivery_type,
      shippingDesi: parseFloat(offer.shipping_desi) || 0,
      shippingCost: parseFloat(offer.shipping_cost) || 0,
      etaDays: offer.eta_days,
      status: offer.status,
      approval_status: offer.approval_status,
      approved_by: offer.approved_by,
      approved_at: offer.approved_at,
      rejection_reason: offer.rejection_reason,
      images: offer.images ? JSON.parse(offer.images) : [],
      createdAt: offer.created_at,
      updatedAt: offer.updated_at,
      validUntil: offer.valid_until,
      buyer: {
        name: offer.buyer_name || 'Bilinmeyen alıcı',
        email: offer.buyer_email,
        phone: offer.buyer_phone
      },
      seller: {
        id: offer.seller_id,
        name: offer.seller_name || 'Bilinmeyen satıcı',
        email: offer.seller_email,
        phone: offer.seller_phone
      }
    }));

    console.log('📈 Total offers:', total);

    res.json({
      success: true,
      offers: transformedOffers,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('❌ Admin offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Teklifler yüklenemedi'
    });
  }
});

// Tek bir teklifi detaylı görüntüle (admin)
router.get('/offers/:offerId', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;

    console.log('🎯 Admin offer detail request:', offerId);

    const offers = await query(`
      SELECT 
        o.id,
        o.listing_id,
        o.seller_id,
        o.price,
        o.quantity,
        o.offer_condition,
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
        o.updated_at,
        o.valid_until,
        o.images,
        l.title as listing_title,
        l.category as listing_category,
        l.budget_max as listing_budget,
        l.description as listing_description,
        l.images as listing_images,
        CONCAT(buyer.firstName, ' ', buyer.lastName) as buyer_name,
        buyer.email as buyer_email,
        buyer.phone as buyer_phone,
        buyer.city as buyer_city,
        CONCAT(seller.firstName, ' ', seller.lastName) as seller_name,
        seller.email as seller_email,
        seller.phone as seller_phone,
        seller.city as seller_city
      FROM offers o
      LEFT JOIN listings l ON o.listing_id = l.id
      LEFT JOIN users buyer ON l.buyer_id = buyer.id
      LEFT JOIN users seller ON o.seller_id = seller.id
      WHERE o.id = ?
    `, [offerId]) as any[];

    if (offers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teklif bulunamadı'
      });
    }

    const offer = offers[0];

    const transformedOffer = {
      id: offer.id,
      listing: {
        id: offer.listing_id,
        title: offer.listing_title || 'Bilinmeyen ilan',
        category: offer.listing_category,
        budget: parseFloat(offer.listing_budget) || 0,
        description: offer.listing_description,
        images: offer.listing_images ? JSON.parse(offer.listing_images) : []
      },
      productName: offer.product_name,
      description: offer.description,
      price: parseFloat(offer.price) || 0,
      quantity: offer.quantity || 1,
      condition: offer.offer_condition,
      deliveryType: offer.delivery_type,
      shippingDesi: parseFloat(offer.shipping_desi) || 0,
      shippingCost: parseFloat(offer.shipping_cost) || 0,
      etaDays: offer.eta_days,
      status: offer.status,
      approval_status: offer.approval_status,
      approved_by: offer.approved_by,
      approved_at: offer.approved_at,
      rejection_reason: offer.rejection_reason,
      images: offer.images ? JSON.parse(offer.images) : [],
      createdAt: offer.created_at,
      updatedAt: offer.updated_at,
      validUntil: offer.valid_until,
      buyer: {
        name: offer.buyer_name || 'Bilinmeyen alıcı',
        email: offer.buyer_email,
        phone: offer.buyer_phone,
        city: offer.buyer_city
      },
      seller: {
        id: offer.seller_id,
        name: offer.seller_name || 'Bilinmeyen satıcı',
        email: offer.seller_email,
        phone: offer.seller_phone,
        city: offer.seller_city
      }
    };

    console.log('✅ Offer detail loaded:', { id: offerId });

    res.json({
      success: true,
      offer: transformedOffer
    });

  } catch (error) {
    console.error('❌ Admin offer detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Teklif detayları yüklenemedi'
    });
  }
});

// Teklif durumunu değiştir (admin)
router.put('/offers/:offerId/status', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { offerId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.userId;

    console.log('🎯 Admin changing offer status:', { offerId, status, reason, adminId });

    // Geçerli status değerlerini kontrol et
    const validStatuses = ['active', 'accepted', 'rejected', 'withdrawn', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum değeri'
      });
    }

    // Teklif var mı kontrol et
    const offerResult = await query(
      'SELECT id, status FROM offers WHERE id = ?',
      [offerId]
    ) as any[];

    if (!offerResult || offerResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teklif bulunamadı'
      });
    }

    const previousStatus = offerResult[0].status;

    // Durumu güncelle
    await query(
      'UPDATE offers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, offerId]
    );

    console.log('✅ Offer status updated successfully');

    res.json({
      success: true,
      message: 'Teklif durumu güncellendi',
      data: {
        offerId,
        previousStatus,
        newStatus: status
      }
    });

  } catch (error) {
    console.error('❌ Update offer status error:', error);
    res.status(500).json({
      success: false,
      message: 'Teklif durumu güncellenirken hata oluştu'
    });
  }
});

// Teklifi sil (admin)
router.delete('/offers/:offerId', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { offerId } = req.params;
    const adminId = req.userId;

    console.log('🗑️ Admin deleting offer:', { offerId, adminId });

    // Teklif var mı kontrol et
    const offerResult = await query(
      'SELECT id, product_name FROM offers WHERE id = ?',
      [offerId]
    ) as any[];

    if (!offerResult || offerResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teklif bulunamadı'
      });
    }

    const offer = offerResult[0];

    // İlişkili siparişleri kontrol et
    const orderItems = await query(
      'SELECT order_id FROM order_items WHERE offer_id = ?',
      [offerId]
    ) as any[];

    if (orderItems && orderItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu teklifle ilişkili siparişler var. Önce siparişleri iptal edin.'
      });
    }

    // Teklifi sil
    await query('DELETE FROM offers WHERE id = ?', [offerId]);

    console.log('✅ Offer deleted successfully by admin');

    res.json({
      success: true,
      message: 'Teklif silindi',
      data: {
        offerId,
        productName: offer.product_name
      }
    });

  } catch (error) {
    console.error('❌ Delete offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Teklif silinirken hata oluştu'
    });
  }
});

// Get pending offers (onay bekleyen teklifler)
router.get('/pending-offers', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    console.log('🔍 Fetching pending offers...');

    const offers = await query(
      `SELECT 
        o.id,
        o.listing_id,
        o.seller_id,
        o.price,
        o.quantity,
        o.product_name,
        o.description,
        o.offer_condition,
        o.delivery_type,
        o.shipping_cost,
        o.images,
        o.created_at,
        o.approval_status,
        o.status,
        CONCAT(seller.firstName, ' ', seller.lastName) as seller_name,
        seller.email as seller_email,
        seller.phone as seller_phone,
        l.title as listing_title,
        l.buyer_id as listing_owner_id,
        CONCAT(buyer.firstName, ' ', buyer.lastName) as listing_owner_name,
        buyer.email as listing_owner_email
      FROM offers o
      JOIN users seller ON o.seller_id = seller.id
      JOIN listings l ON o.listing_id = l.id
      JOIN users buyer ON l.buyer_id = buyer.id
      WHERE o.approval_status = 'pending'
      ORDER BY o.created_at DESC`
    ) as any[];

    console.log(`✅ Found ${offers.length} pending offers`);

    const formattedOffers = offers.map((offer: any) => ({
      id: offer.id,
      listingId: offer.listing_id,
      sellerId: offer.seller_id,
      sellerName: offer.seller_name,
      sellerEmail: offer.seller_email,
      sellerPhone: offer.seller_phone,
      price: parseFloat(offer.price),
      quantity: offer.quantity,
      productName: offer.product_name,
      description: offer.description,
      condition: offer.offer_condition,
      deliveryType: offer.delivery_type,
      shippingCost: parseFloat(offer.shipping_cost || 0),
      images: offer.images,
      createdAt: offer.created_at,
      approvalStatus: offer.approval_status,
      status: offer.status,
      listingTitle: offer.listing_title,
      listingOwnerId: offer.listing_owner_id,
      listingOwnerName: offer.listing_owner_name,
      listingOwnerEmail: offer.listing_owner_email
    }));

    res.json({
      success: true,
      data: formattedOffers
    });

  } catch (error) {
    console.error('❌ Get pending offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Onay bekleyen teklifler alınırken hata oluştu'
    });
  }
});

// Approve offer (teklifi onayla)
router.post('/offers/:offerId/approve', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { offerId } = req.params;
    const adminId = req.user?.userId || req.user?.id;

    console.log(`✅ Admin ${adminId} approving offer ${offerId}...`);

    // Teklif var mı kontrol et
    const offers = await query(
      'SELECT id, product_name, seller_id, listing_id, approval_status FROM offers WHERE id = ?',
      [offerId]
    ) as any[];

    if (offers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teklif bulunamadı'
      });
    }

    const offer = offers[0];

    if (offer.approval_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Bu teklif zaten onaylanmış veya reddedilmiş'
      });
    }

    // Teklifi onayla
    await query(
      `UPDATE offers 
       SET approval_status = 'approved', 
           approved_by = ?, 
           approved_at = NOW(),
           status = 'active'
       WHERE id = ?`,
      [adminId, offerId]
    );

    // Audit kaydı oluştur
    const auditId = uuidv4();
    await query(
      `INSERT INTO offer_approval_audit (id, offer_id, action, performed_by, created_at)
       VALUES (?, ?, 'approved', ?, NOW())`,
      [auditId, offerId, adminId]
    );

    // Admin notification'ı güncelle (okundu olarak işaretle)
    await query(
      `UPDATE admin_notifications 
       SET is_read = TRUE, read_at = NOW()
       WHERE offer_id = ? AND type = 'new_offer'`,
      [offerId]
    );

    console.log(`✅ Offer ${offerId} approved successfully`);

    res.json({
      success: true,
      message: 'Teklif onaylandı ve aktif hale getirildi'
    });

    // İlan sahibine teklif geldi bildirimi gönder (non-blocking)
    setImmediate(async () => {
      try {
        // Teklif ve ilan bilgilerini getir
        const offerDetails = await query(
          `SELECT o.seller_id, o.seller_name, o.price, l.buyer_id, l.title, l.id as listing_id
           FROM offers o
           JOIN listings l ON o.listing_id = l.id
           WHERE o.id = ?`,
          [offerId]
        ) as any[];

        if (offerDetails.length > 0) {
          const detail = offerDetails[0];
          
          // İlan sahibine teklif geldi bildirimi
          await sendOfferNotification(
            detail.buyer_id,
            detail.seller_name,
            Number(detail.price),
            detail.title,
            detail.listing_id
          );
          console.log(`📧 İlan sahibine teklif onay bildirimi gönderildi`);

          // Teklif sahibine onay bildirimi
          await sendOfferApprovedNotification(
            detail.seller_id,
            detail.title,
            Number(detail.price),
            detail.listing_id
          );
          console.log(`📧 Teklif sahibine onay bildirimi gönderildi`);
        }
      } catch (err) {
        console.error('📧 Teklif bildirimleri gönderilemedi:', err);
      }
    });

  } catch (error) {
    console.error('❌ Approve offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Teklif onaylanırken hata oluştu'
    });
  }
});

// Reject offer (teklifi reddet)
router.post('/offers/:offerId/reject', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { offerId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.userId || req.user?.id;

    console.log(`❌ Admin ${adminId} rejecting offer ${offerId}...`);

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reddetme sebebi gereklidir'
      });
    }

    // Teklif var mı kontrol et
    const offers = await query(
      'SELECT id, product_name, seller_id, listing_id, approval_status FROM offers WHERE id = ?',
      [offerId]
    ) as any[];

    if (offers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teklif bulunamadı'
      });
    }

    const offer = offers[0];

    if (offer.approval_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Bu teklif zaten onaylanmış veya reddedilmiş'
      });
    }

    // Teklifi reddet
    await query(
      `UPDATE offers 
       SET approval_status = 'rejected', 
           approved_by = ?, 
           approved_at = NOW(),
           rejection_reason = ?,
           status = 'rejected'
       WHERE id = ?`,
      [adminId, reason, offerId]
    );

    // Audit kaydı oluştur
    const auditId = uuidv4();
    await query(
      `INSERT INTO offer_approval_audit (id, offer_id, action, performed_by, reason, created_at)
       VALUES (?, ?, 'rejected', ?, ?, NOW())`,
      [auditId, offerId, adminId, reason]
    );

    // Admin notification'ı güncelle (okundu olarak işaretle)
    await query(
      `UPDATE admin_notifications 
       SET is_read = TRUE, read_at = NOW()
       WHERE offer_id = ? AND type = 'new_offer'`,
      [offerId]
    );

    console.log(`❌ Offer ${offerId} rejected successfully`);

    res.json({
      success: true,
      message: 'Teklif reddedildi'
    });

    // Teklif sahibine red bildirimi gönder (non-blocking)
    setImmediate(async () => {
      try {
        // Teklif ve ilan bilgilerini getir
        const offerDetails = await query(
          `SELECT o.seller_id, o.price, l.title
           FROM offers o
           JOIN listings l ON o.listing_id = l.id
           WHERE o.id = ?`,
          [offerId]
        ) as any[];

        if (offerDetails.length > 0) {
          const detail = offerDetails[0];
          
          // Teklif sahibine red bildirimi
          await sendOfferRejectedNotification(
            detail.seller_id,
            detail.title,
            Number(detail.price),
            reason
          );
          console.log(`📧 Teklif sahibine red bildirimi gönderildi`);
        }
      } catch (err) {
        console.error('📧 Teklif red bildirimi gönderilemedi:', err);
      }
    });

  } catch (error) {
    console.error('❌ Reject offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Teklif reddedilirken hata oluştu'
    });
  }
});

// ============================================
// KOMİSYON YÖNETİMİ
// ============================================

/**
 * GET /api/admin/commission/stats
 * Komisyon istatistikleri
 */
router.get('/commission/stats', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const commissionService = await import('../services/commissionService.js');
    const stats = await commissionService.getCommissionStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Get commission stats error:', error);
    res.status(500).json({
      success: false,
      error: 'İstatistikler getirilemedi'
    });
  }
});

/**
 * GET /api/admin/commission/withdrawals
 * Tüm çekim taleplerini getir
 */
router.get('/commission/withdrawals', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const commissionService = await import('../services/commissionService.js');
    const statusParam = req.query.status as string | undefined;
    const status = statusParam ? statusParam : null;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await commissionService.getAllWithdrawalRequests(status, limit, offset);
    
    res.json({
      success: true,
      requests: result.requests,
      total: result.total,
      limit: result.limit,
      offset: result.offset
    });
  } catch (error: any) {
    console.error('❌ Get withdrawal requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Talepler getirilemedi'
    });
  }
});

/**
 * POST /api/admin/commission/withdrawals/:id/approve
 * Çekim talebini onayla ve tamamla
 */
router.post('/commission/withdrawals/:id/approve', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const commissionService = await import('../services/commissionService.js');
    const requestId = req.params.id;
    const adminId = (req as any).userId;
    const { transferReference, transferDate, adminNotes } = req.body;

    if (!transferReference || !transferDate) {
      return res.status(400).json({
        success: false,
        error: 'Havale referansı ve tarihi gerekli'
      });
    }

    await commissionService.approveWithdrawalRequest(requestId, adminId, {
      transferReference,
      transferDate,
      adminNotes
    });

    res.json({
      success: true,
      message: 'Çekim talebi onaylandı ve tamamlandı'
    });
  } catch (error) {
    console.error('❌ Approve withdrawal error:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message || 'Talep onaylanamadı'
    });
  }
});

/**
 * POST /api/admin/commission/withdrawals/:id/reject
 * Çekim talebini reddet
 */
router.post('/commission/withdrawals/:id/reject', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const commissionService = await import('../services/commissionService.js');
    const requestId = req.params.id;
    const adminId = (req as any).userId;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: 'Red nedeni gerekli'
      });
    }

    await commissionService.rejectWithdrawalRequest(requestId, adminId, rejectionReason);

    res.json({
      success: true,
      message: 'Çekim talebi reddedildi'
    });
  } catch (error) {
    console.error('❌ Reject withdrawal error:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message || 'Talep reddedilemedi'
    });
  }
});

/**
 * PUT /api/admin/commission/settings
 * Komisyon oranlarını güncelle
 */
router.put('/commission/settings', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const commissionService = await import('../services/commissionService.js');
    const adminId = (req as any).userId;
    const { listingOwnerRate, sellerRate } = req.body;

    if (listingOwnerRate === undefined || sellerRate === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Her iki oran da gerekli'
      });
    }

    if (listingOwnerRate < 0 || listingOwnerRate > 100 || sellerRate < 0 || sellerRate > 100) {
      return res.status(400).json({
        success: false,
        error: 'Oranlar 0-100 arasında olmalı'
      });
    }

    await commissionService.updateCommissionRates(adminId, listingOwnerRate, sellerRate);

    res.json({
      success: true,
      message: 'Komisyon oranları güncellendi',
      rates: { listingOwnerRate, sellerRate }
    });
  } catch (error) {
    console.error('❌ Update commission rates error:', error);
    res.status(500).json({
      success: false,
      error: 'Oranlar güncellenemedi'
    });
  }
});

// ==================== SUPPORT TICKETS ====================

/**
 * GET /api/admin/support/tickets
 * Tüm destek taleplerini listele (filtrelenebilir)
 */
router.get('/support/tickets', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { status, priority, category, search } = req.query;
    
    let sql = `
      SELECT 
        st.*,
        u.firstName as user_first_name,
        u.lastName as user_last_name,
        admin.firstName as replied_by_first_name,
        admin.lastName as replied_by_last_name
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN users admin ON st.replied_by = admin.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (status) {
      sql += ` AND st.status = ?`;
      params.push(status);
    }
    
    if (priority) {
      sql += ` AND st.priority = ?`;
      params.push(priority);
    }
    
    if (category) {
      sql += ` AND st.category = ?`;
      params.push(category);
    }
    
    if (search) {
      sql += ` AND (st.name LIKE ? OR st.email LIKE ? OR st.subject LIKE ? OR st.message LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    sql += ` ORDER BY st.created_at DESC`;
    
    const tickets = await query(sql, params);
    
    console.log('✅ Support tickets fetched:', (tickets as any[]).length);
    
    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('❌ Fetch support tickets error:', error);
    res.status(500).json({
      success: false,
      error: 'Destek talepleri alınamadı'
    });
  }
});

/**
 * GET /api/admin/support/tickets/:ticketId
 * Tek bir destek talebinin detaylarını getir
 */
router.get('/support/tickets/:ticketId', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    
    const tickets = await query(
      `SELECT 
        st.*,
        u.firstName as user_first_name,
        u.lastName as user_last_name,
        u.email as user_email,
        u.phone as user_phone,
        admin.firstName as replied_by_first_name,
        admin.lastName as replied_by_last_name
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN users admin ON st.replied_by = admin.id
      WHERE st.id = ?`,
      [ticketId]
    );
    
    if ((tickets as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Destek talebi bulunamadı'
      });
    }
    
    console.log('✅ Support ticket fetched:', ticketId);
    
    res.json({
      success: true,
      ticket: (tickets as any[])[0]
    });
  } catch (error) {
    console.error('❌ Fetch support ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Destek talebi alınamadı'
    });
  }
});

/**
 * POST /api/admin/support/tickets/:ticketId/reply
 * Destek talebine cevap gönder (veritabanına kaydedilir ve kullanıcıya email gönderilir)
 */
router.post('/support/tickets/:ticketId/reply', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { reply, status } = req.body;
    const adminId = req.userId;
    
    if (!reply) {
      return res.status(400).json({
        success: false,
        error: 'Cevap metni gerekli'
      });
    }
    
    // Ticket bilgilerini al
    const tickets = await query(
      'SELECT * FROM support_tickets WHERE id = ?',
      [ticketId]
    );
    
    if ((tickets as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Destek talebi bulunamadı'
      });
    }
    
    const ticket = (tickets as any[])[0];
    
    // Cevabı kaydet
    await query(
      `UPDATE support_tickets 
       SET admin_reply = ?, 
           replied_by = ?, 
           replied_at = NOW(), 
           status = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [reply, adminId, status || 'answered', ticketId]
    );
    
    console.log('✅ Support ticket replied:', ticketId);
    
    // Kullanıcıya email gönder
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              background: white;
              padding: 40px;
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 10px 10px;
            }
            .reply-box {
              background: #f0fdf4;
              border-left: 4px solid #22c55e;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .original-message {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border: 1px solid #e5e7eb;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>💬 Destek Talebinize Yanıt Verildi</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Varmı.com Destek Ekibi</p>
          </div>
          
          <div class="content">
            <p>Merhaba <strong>${ticket.name}</strong>,</p>
            
            <p>Destek talebinize yanıt verildi. Detaylar aşağıdadır:</p>
            
            <div class="reply-box">
              <strong>✨ Destek Ekibimizin Yanıtı:</strong><br><br>
              <div style="white-space: pre-wrap; line-height: 1.8;">${reply}</div>
            </div>
            
            <div class="original-message">
              <strong>📋 Orijinal Mesajınız:</strong><br>
              <strong>Kategori:</strong> ${ticket.category}<br>
              ${ticket.subject ? `<strong>Konu:</strong> ${ticket.subject}<br>` : ''}
              <strong>Talep No:</strong> ${ticketId.substring(0, 8).toUpperCase()}<br><br>
              <div style="white-space: pre-wrap;">${ticket.message}</div>
            </div>
            
            <p>Başka bir sorunuz olursa lütfen bizimle iletişime geçmekten çekinmeyin.</p>
            
            <p><strong>İletişim:</strong><br>
            E-posta: <a href="mailto:asistan@varmii.com" style="color: #667eea;">asistan@varmii.com</a><br>
            Web: <a href="https://varmii.com" style="color: #667eea;">www.varmii.com</a></p>
          </div>
          
          <div class="footer">
            <p><strong>Varmı.com</strong> - Size daha iyi hizmet vermek için buradayız</p>
            <p style="margin: 5px 0 0 0;">© 2025 Tüm hakları saklıdır.</p>
          </div>
        </body>
      </html>
    `;
    
    const { sendEmail } = await import('../services/emailService.js');
    
    await sendEmail({
      to: ticket.email,
      subject: `💬 Destek Talebinize Yanıt - ${ticket.subject || ticket.category}`,
      html: emailHtml
    });
    
    console.log('✅ Reply email sent to user');
    
    res.json({
      success: true,
      message: 'Cevap gönderildi ve kullanıcıya email gönderildi'
    });
  } catch (error) {
    console.error('❌ Reply to support ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Cevap gönderilemedi'
    });
  }
});

/**
 * PATCH /api/admin/support/tickets/:ticketId/status
 * Destek talebinin durumunu güncelle
 */
router.patch('/support/tickets/:ticketId/status', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;
    
    if (!['open', 'in_progress', 'answered', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz durum'
      });
    }
    
    await query(
      'UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, ticketId]
    );
    
    console.log('✅ Support ticket status updated:', ticketId, status);
    
    res.json({
      success: true,
      message: 'Durum güncellendi'
    });
  } catch (error) {
    console.error('❌ Update support ticket status error:', error);
    res.status(500).json({
      success: false,
      error: 'Durum güncellenemedi'
    });
  }
});

/**
 * PATCH /api/admin/support/tickets/:ticketId/priority
 * Destek talebinin önceliğini güncelle
 */
router.patch('/support/tickets/:ticketId/priority', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { priority } = req.body;
    
    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz öncelik'
      });
    }
    
    await query(
      'UPDATE support_tickets SET priority = ?, updated_at = NOW() WHERE id = ?',
      [priority, ticketId]
    );
    
    console.log('✅ Support ticket priority updated:', ticketId, priority);
    
    res.json({
      success: true,
      message: 'Öncelik güncellendi'
    });
  } catch (error) {
    console.error('❌ Update support ticket priority error:', error);
    res.status(500).json({
      success: false,
      error: 'Öncelik güncellenemedi'
    });
  }
});

/**
 * DELETE /api/admin/support/tickets/:ticketId
 * Destek talebini sil
 */
router.delete('/support/tickets/:ticketId', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    
    await query('DELETE FROM support_tickets WHERE id = ?', [ticketId]);
    
    console.log('✅ Support ticket deleted:', ticketId);
    
    res.json({
      success: true,
      message: 'Destek talebi silindi'
    });
  } catch (error) {
    console.error('❌ Delete support ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Destek talebi silinemedi'
    });
  }
});

/**
 * GET /api/admin/support/stats
 * Destek talepleri istatistikleri
 */
router.get('/support/stats', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'answered' THEN 1 ELSE 0 END) as answered,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high
      FROM support_tickets
    `);
    
    console.log('✅ Support stats fetched');
    
    res.json({
      success: true,
      stats: (stats as any[])[0]
    });
  } catch (error) {
    console.error('❌ Fetch support stats error:', error);
    res.status(500).json({
      success: false,
      error: 'İstatistikler alınamadı'
    });
  }
});

// ============ SATICI PROFİLİ YÖNETİMİ ============

/**
 * GET /api/admin/seller-profiles
 * Tüm satıcı profillerini listele
 */
router.get('/seller-profiles', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    let sql = `
      SELECT 
        sp.*,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        approver.firstName as approver_firstName,
        approver.lastName as approver_lastName
      FROM seller_profiles sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN users approver ON sp.approved_by = approver.id
    `;
    
    const params: any[] = [];
    if (status) {
      sql += ' WHERE sp.approval_status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY sp.created_at DESC';
    
    const profiles = await query(sql, params);
    
    // Parse JSON fields
    (profiles as any[]).forEach(profile => {
      if (profile.documents) {
        try {
          profile.documents = JSON.parse(profile.documents);
        } catch (e) {
          profile.documents = [];
        }
      }
    });
    
    console.log('✅ Seller profiles fetched:', (profiles as any[]).length);
    
    res.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error('❌ Fetch seller profiles error:', error);
    res.status(500).json({
      success: false,
      error: 'Satıcı profilleri alınamadı'
    });
  }
});

/**
 * GET /api/admin/seller-profiles/:profileId
 * Belirli bir satıcı profilini getir
 */
router.get('/seller-profiles/:profileId', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    
    const profiles = await query(
      `SELECT 
        sp.*,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        u.city as user_city,
        u.district as user_district,
        approver.firstName as approver_firstName,
        approver.lastName as approver_lastName
      FROM seller_profiles sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN users approver ON sp.approved_by = approver.id
      WHERE sp.id = ?`,
      [profileId]
    );
    
    if ((profiles as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Satıcı profili bulunamadı'
      });
    }
    
    const profile = (profiles as any[])[0];
    
    // Parse JSON fields
    if (profile.documents) {
      try {
        profile.documents = JSON.parse(profile.documents);
      } catch (e) {
        profile.documents = [];
      }
    }
    
    // Onay geçmişini getir
    const auditLog = await query(
      `SELECT 
        spa.*,
        u.firstName as performed_by_firstName,
        u.lastName as performed_by_lastName
      FROM seller_profile_approval_audit spa
      LEFT JOIN users u ON spa.performed_by = u.id
      WHERE spa.seller_profile_id = ?
      ORDER BY spa.created_at DESC`,
      [profileId]
    );
    
    profile.auditLog = auditLog;
    
    console.log('✅ Seller profile fetched:', profileId);
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('❌ Fetch seller profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Satıcı profili alınamadı'
    });
  }
});

/**
 * POST /api/admin/seller-profiles/:profileId/approve
 * Satıcı profilini onayla
 */
router.post('/seller-profiles/:profileId/approve', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const adminId = (req as any).userId;
    
    console.log('✅ Approving seller profile:', profileId, 'by admin:', adminId);
    
    // Profil bilgilerini getir
    const profiles = await query(
      `SELECT sp.*, u.email, u.firstName, u.lastName 
       FROM seller_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.id = ?`,
      [profileId]
    );
    
    if ((profiles as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Satıcı profili bulunamadı'
      });
    }
    
    const profile = (profiles as any[])[0];
    
    // Profili onayla
    await query(
      `UPDATE seller_profiles 
       SET approval_status = 'approved',
           approved_by = ?,
           approved_at = NOW(),
           rejection_reason = NULL,
           updated_at = NOW()
       WHERE id = ?`,
      [adminId, profileId]
    );
    
    // Kullanıcıyı verified seller yap
    await query(
      `UPDATE users 
       SET is_verified_seller = 1,
           seller_profile_id = ?
       WHERE id = ?`,
      [profileId, profile.user_id]
    );
    
    // Audit log
    await query(
      `INSERT INTO seller_profile_approval_audit 
       (seller_profile_id, action, performed_by, reason, created_at)
       VALUES (?, 'approved', ?, 'Seller profile approved by admin', NOW())`,
      [profileId, adminId]
    );
    
    // Admin bildirimini okundu olarak işaretle
    await query(
      `UPDATE admin_notifications 
       SET is_read = 1 
       WHERE seller_profile_id = ?`,
      [profileId]
    );
    
    // Email gönder
    try {
      await sendSellerProfileApprovedEmail(
        profile.email,
        profile.firstName,
        profile.store_name
      );
      console.log('📧 Seller profile approved email sent to:', profile.email);
    } catch (emailError) {
      console.error('❌ Failed to send approval email:', emailError);
    }
    
    console.log('✅ Seller profile approved:', profileId);
    
    res.json({
      success: true,
      message: 'Satıcı profili onaylandı'
    });
  } catch (error) {
    console.error('❌ Approve seller profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Satıcı profili onaylanamadı'
    });
  }
});

/**
 * POST /api/admin/seller-profiles/:profileId/reject
 * Satıcı profilini reddet
 */
router.post('/seller-profiles/:profileId/reject', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).userId;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Ret nedeni belirtilmelidir'
      });
    }
    
    console.log('❌ Rejecting seller profile:', profileId, 'by admin:', adminId);
    
    // Profil bilgilerini getir
    const profiles = await query(
      `SELECT sp.*, u.email, u.firstName, u.lastName 
       FROM seller_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.id = ?`,
      [profileId]
    );
    
    if ((profiles as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Satıcı profili bulunamadı'
      });
    }
    
    const profile = (profiles as any[])[0];
    
    // Profili reddet
    await query(
      `UPDATE seller_profiles 
       SET approval_status = 'rejected',
           approved_by = ?,
           approved_at = NOW(),
           rejection_reason = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [adminId, reason, profileId]
    );
    
    // Kullanıcının verified seller durumunu kaldır
    await query(
      `UPDATE users 
       SET is_verified_seller = 0
       WHERE id = ?`,
      [profile.user_id]
    );
    
    // Audit log
    await query(
      `INSERT INTO seller_profile_approval_audit 
       (seller_profile_id, action, performed_by, reason, created_at)
       VALUES (?, 'rejected', ?, ?, NOW())`,
      [profileId, adminId, reason]
    );
    
    // Admin bildirimini okundu olarak işaretle
    await query(
      `UPDATE admin_notifications 
       SET is_read = 1 
       WHERE seller_profile_id = ?`,
      [profileId]
    );
    
    // Email gönder
    try {
      await sendSellerProfileRejectedEmail(
        profile.email,
        profile.firstName,
        profile.store_name,
        reason
      );
      console.log('📧 Seller profile rejected email sent to:', profile.email);
    } catch (emailError) {
      console.error('❌ Failed to send rejection email:', emailError);
    }
    
    console.log('✅ Seller profile rejected:', profileId);
    
    res.json({
      success: true,
      message: 'Satıcı profili reddedildi'
    });
  } catch (error) {
    console.error('❌ Reject seller profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Satıcı profili reddedilemedi'
    });
  }
});

/**
 * POST /api/admin/seller-profiles/:profileId/suspend
 * Satıcı profilini askıya al
 */
router.post('/seller-profiles/:profileId/suspend', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).userId;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Askıya alma nedeni belirtilmelidir'
      });
    }
    
    // Profili askıya al
    await query(
      `UPDATE seller_profiles 
       SET approval_status = 'suspended',
           suspended_reason = ?,
           suspended_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [reason, profileId]
    );
    
    // Kullanıcının verified seller durumunu kaldır
    const profiles = await query('SELECT user_id FROM seller_profiles WHERE id = ?', [profileId]);
    if ((profiles as any[]).length > 0) {
      await query(
        `UPDATE users 
         SET is_verified_seller = 0
         WHERE id = ?`,
        [(profiles as any[])[0].user_id]
      );
    }
    
    // Audit log
    await query(
      `INSERT INTO seller_profile_approval_audit 
       (seller_profile_id, action, performed_by, reason, created_at)
       VALUES (?, 'suspended', ?, ?, NOW())`,
      [profileId, adminId, reason]
    );
    
    console.log('✅ Seller profile suspended:', profileId);
    
    res.json({
      success: true,
      message: 'Satıcı profili askıya alındı'
    });
  } catch (error) {
    console.error('❌ Suspend seller profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Satıcı profili askıya alınamadı'
    });
  }
});

/**
 * POST /api/admin/seller-profiles/:profileId/unsuspend
 * Satıcı profilinin askısını kaldır
 */
router.post('/seller-profiles/:profileId/unsuspend', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const adminId = (req as any).userId;
    
    // Profili tekrar aktif et
    await query(
      `UPDATE seller_profiles 
       SET approval_status = 'approved',
           suspended_reason = NULL,
           suspended_at = NULL,
           updated_at = NOW()
       WHERE id = ?`,
      [profileId]
    );
    
    // Kullanıcıyı tekrar verified seller yap
    const profiles = await query('SELECT user_id FROM seller_profiles WHERE id = ?', [profileId]);
    if ((profiles as any[]).length > 0) {
      await query(
        `UPDATE users 
         SET is_verified_seller = 1
         WHERE id = ?`,
        [(profiles as any[])[0].user_id]
      );
    }
    
    // Audit log
    await query(
      `INSERT INTO seller_profile_approval_audit 
       (seller_profile_id, action, performed_by, reason, created_at)
       VALUES (?, 'unsuspended', ?, 'Suspension lifted by admin', NOW())`,
      [profileId, adminId]
    );
    
    console.log('✅ Seller profile unsuspended:', profileId);
    
    res.json({
      success: true,
      message: 'Satıcı profilinin askısı kaldırıldı'
    });
  } catch (error) {
    console.error('❌ Unsuspend seller profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Satıcı profilinin askısı kaldırılamadı'
    });
  }
});

export default router;

