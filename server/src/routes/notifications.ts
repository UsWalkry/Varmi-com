import express from 'express';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from './auth.js';
import { dbConfig, query } from '../database.js';

const router = express.Router();

// Kullanıcının bildirimlerini getir
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User ID bulunamadı' 
      });
    }

    // Son 30 gün içindeki bildirimleri getir
    const notifications = await query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    ) as any[];

    // Okunmamış bildirim sayısı
    const unreadCount = await query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    ) as any[];

    res.json({
      success: true,
      notifications,
      unreadCount: unreadCount[0]?.count || 0
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Bildirimler getirilirken hata oluştu' 
    });
  }
});

// Bildirimi okundu olarak işaretle
router.put('/:notificationId/read', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { notificationId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User ID bulunamadı' 
      });
    }

    await query(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW() 
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    res.json({
      success: true,
      message: 'Bildirim okundu olarak işaretlendi'
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Bildirim güncellenirken hata oluştu' 
    });
  }
});

// Tüm bildirimleri okundu olarak işaretle
router.put('/mark-all-read', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User ID bulunamadı' 
      });
    }

    await query(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW() 
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Tüm bildirimler okundu olarak işaretlendi'
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Bildirimler güncellenirken hata oluştu' 
    });
  }
});

// Kullanıcının bildirim ayarlarını getir
router.get('/settings', authenticateToken, async (req: any, res) => {
  let connection;
  try {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User ID bulunamadı' 
      });
    }
    
    // Önce mevcut ayarları kontrol et
    const existingSettings = await query(
      'SELECT * FROM user_notification_settings WHERE user_id = ?',
      [userId]
    ) as any[];
    
    if (existingSettings.length === 0) {
      // Varsayılan ayarları oluştur
      const settingsId = uuidv4();
      await query(
        `INSERT INTO user_notification_settings 
         (id, user_id, email_notifications, sms_notifications, push_notifications, 
          offer_notifications, message_notifications, system_notifications) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [settingsId, userId, true, false, true, true, true, true]
      );
      
      // Yeni ayarları döndür
      const newSettings = await query(
        'SELECT * FROM user_notification_settings WHERE user_id = ?',
        [userId]
      );
      
      const settings = (newSettings as any[])[0];
      res.json({
        email_notifications: settings.email_notifications,
        sms_notifications: settings.sms_notifications
      });
    } else {
      const settings = (existingSettings as any[])[0];
      res.json({
        email_notifications: settings.email_notifications,
        sms_notifications: settings.sms_notifications
      });
    }
    
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Bildirim ayarları getirilirken hata oluştu' 
    });
  }
});

// Kullanıcının bildirim ayarlarını güncelle
router.put('/settings', authenticateToken, async (req: any, res) => {
  let connection;
  try {
    const userId = req.user?.userId || req.user?.id;
    
    console.log('🔍 Notification settings update request:', {
      userId,
      body: req.body,
      user: req.user
    });
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User ID bulunamadı' 
      });
    }
    
    const {
      email_notifications,
      sms_notifications
    } = req.body;
    
    connection = await mysql.createConnection(dbConfig);
    
    // Önce mevcut ayarları kontrol et
    const [existingCheck] = await connection.execute(
      'SELECT id FROM user_notification_settings WHERE user_id = ?',
      [userId]
    );
    
    if ((existingCheck as any[]).length === 0) {
      // Kayıt yoksa yeni oluştur
      const settingsId = uuidv4();
      await connection.execute(
        `INSERT INTO user_notification_settings 
         (id, user_id, email_notifications, sms_notifications, offer_notifications, 
          message_notifications, push_notifications, system_notifications) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [settingsId, userId, email_notifications, sms_notifications, true, 
         true, true, true]
      );
    } else {
      // Mevcut kaydı güncelle
      await connection.execute(
        `UPDATE user_notification_settings 
         SET email_notifications = ?, sms_notifications = ?, updated_at = NOW()
         WHERE user_id = ?`,
        [email_notifications, sms_notifications, userId]
      );
    }
    
    // Güncellenmiş ayarları döndür
    const [updatedSettings] = await connection.execute(
      'SELECT * FROM user_notification_settings WHERE user_id = ?',
      [userId]
    );
    
    const settings = (updatedSettings as any[])[0];
    res.json({
      email_notifications: settings.email_notifications,
      sms_notifications: settings.sms_notifications,
      message: 'Bildirim ayarları güncellendi'
    });
    
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Bildirim ayarları güncellenirken hata oluştu' 
    });
  } finally {
    if (connection) await connection.end();
  }
});

export default router;