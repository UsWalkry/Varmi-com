// Favorites Routes - Favori CRUD İşlemleri
import { Router, Request, Response } from 'express';
import { authenticateToken } from './auth.js';
import { query } from '../database.js';
import mysql from 'mysql2/promise';

const router = Router();

// Get user's favorites
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }
    
    const rows = await query(`
      SELECT 
        f.id,
        f.listing_id,
        f.created_at,
        l.title,
        l.category,
        l.budget_max as price,
        l.city as location,
        l.images,
        l.created_at as listing_created_at,
        CONCAT(u.firstName, ' ', u.lastName) as buyer_name
      FROM favorites f
      JOIN listings l ON f.listing_id = l.id
      JOIN users u ON l.buyer_id = u.id
      WHERE f.user_id = ? AND l.status = 'active'
      ORDER BY f.created_at DESC
    `, [userId]);
    
    console.log('❤️ Favorites raw data:', (rows as any[]).map(r => ({ 
      id: r.id, 
      listing_id: r.listing_id, 
      title: r.title 
    })));
    
    res.json({
      success: true,
      favorites: (rows as any[]).map(row => ({
        id: row.id,
        listing_id: row.listing_id,
        title: row.title,
        category: row.category,
        price: row.price,
        location: row.location,
        images: row.images,
        createdAt: row.listing_created_at, // İlan oluşturulma tarihi
        buyerName: row.buyer_name,
        created_at: row.created_at // Favoriye eklenme tarihi
      }))
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Favoriler alınırken hata oluştu' 
    });
  }
});

// Add to favorites
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }
    const { listing_id } = req.body;
    
    console.log('➕ Adding to favorites:', { userId, listing_id });
    
    if (!listing_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'İlan ID gerekli' 
      });
    }
    
    // Check if already favorited
    const existingRows = await query(
      `SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?`,
      [userId, listing_id]
    );
    
    if ((existingRows as any[]).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Bu ilan zaten favorilerinizde'
      });
    }

    // Check if listing exists
    const listingRows = await query(
      `SELECT id FROM listings WHERE id = ?`,
      [listing_id]
    );
    
    if ((listingRows as any[]).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bu ilan artık mevcut değil'
      });
    }
    
    // Add to favorites
    await query(
      `INSERT INTO favorites (user_id, listing_id, created_at) VALUES (?, ?, NOW())`,
      [userId, listing_id]
    );
    
    res.json({
      success: true,
      message: 'İlan favorilere eklendi'
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Favorilere eklenirken hata oluştu' 
    });
  }
});

// Clean orphaned favorites (listings that no longer exist) - MUST be before /:listingId route
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }
    
    // Delete favorites where listing no longer exists
    const result = await query(
      `DELETE f FROM favorites f 
       LEFT JOIN listings l ON f.listing_id = l.id 
       WHERE f.user_id = ? AND l.id IS NULL`,
      [userId]
    );
    
    res.json({
      success: true,
      message: `${(result as any).affectedRows} orphaned favorites cleaned up`
    });
  } catch (error) {
    console.error('Cleanup favorites error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Favori temizliği sırasında hata oluştu' 
    });
  }
});

// Remove from favorites
router.delete('/:listingId', authenticateToken, async (req, res) => {
  let connection;
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }
    const { listingId } = req.params;
    
    console.log('➖ Removing from favorites:', { userId, listingId });
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'varmi_db',
      timezone: '+00:00'
    });
    
    // Debug: Check current favorites before deletion
    const [existingFavorites] = await connection.execute(
      `SELECT * FROM favorites WHERE user_id = ? AND listing_id = ?`,
      [userId, listingId]
    );
    console.log('🔍 Existing favorites before delete:', existingFavorites);
    
    const [result] = await connection.execute(
      `DELETE FROM favorites WHERE user_id = ? AND listing_id = ?`,
      [userId, listingId]
    );
    
    const affectedRows = (result as any).affectedRows;
    console.log(`🗑️ DELETE result: ${affectedRows} rows affected`);
    
    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bu ilan favorilerinizde bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'İlan favorilerden kaldırıldı',
      affectedRows
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Favorilerden kaldırılırken hata oluştu' 
    });
  } finally {
    if (connection) await connection.end();
  }
});

// Check if listing is favorite
router.get('/check/:listingId', authenticateToken, async (req, res) => {
  let connection;
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }
    const { listingId } = req.params;
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'varmi_db',
      timezone: '+00:00'
    });
    
    const [rows] = await connection.execute(
      `SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?`,
      [userId, listingId]
    );
    
    res.json({
      success: true,
      isFavorite: (rows as any[]).length > 0
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Favori durumu kontrol edilirken hata oluştu' 
    });
  } finally {
    if (connection) await connection.end();
  }
});

export default router;