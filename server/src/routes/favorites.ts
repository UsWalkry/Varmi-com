// Favorites Routes - Favori CRUD İşlemleri
import { Router, Request, Response } from 'express';
import { authenticateToken } from './auth.js';
import { query } from '../database.js';

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
        l.budget_max,
        l.city,
        l.images,
        l.status,
        l.view_count,
        l.favorite_count,
        l.mask_owner_name,
        l.delivery_type,
        l.buyer_id,
        l.created_at as listing_created_at,
        CONCAT(u.firstName, ' ', u.lastName) as buyer_name
      FROM favorites f
      JOIN listings l ON f.listing_id = l.id
      JOIN users u ON l.buyer_id = u.id
      WHERE f.user_id = ? AND l.status != 'deleted'
      ORDER BY f.created_at DESC
    `, [userId]);
    
    console.log('❤️ Favorites raw data:', (rows as any[]).map(r => ({ 
      id: r.id, 
      listing_id: r.listing_id, 
      title: r.title 
    })));
    
    const mapped = (rows as any[]).map(row => ({
        id: row.listing_id,
        listing_id: row.listing_id,
        title: row.title,
        category: row.category,
        budget_max: parseFloat(row.budget_max) || 0,
        city: row.city,
        images: row.images,
        status: row.status,
        view_count: row.view_count || 0,
        favorite_count: row.favorite_count || 0,
        mask_owner_name: row.mask_owner_name,
        delivery_type: row.delivery_type,
        buyer_id: row.buyer_id,
        buyer_name: row.buyer_name,
        created_at: row.listing_created_at,
        favoritedAt: row.created_at,
        isFavorited: true
      }));

    res.json({
      success: true,
      data: mapped,
      favorites: mapped
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
    
    console.log('🔍 Existing favorites check:', { 
      userId, 
      listing_id, 
      existingCount: (existingRows as any[]).length,
      existing: existingRows 
    });
    
    if ((existingRows as any[]).length > 0) {
      console.log('ℹ️ Listing already in favorites, returning success');
      return res.status(200).json({
        success: true,
        message: 'İlan zaten favorilerinizde',
        favoriteId: (existingRows as any[])[0].id
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

// Clean orphaned favorites (listings that no longer exist)
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
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }
    
    const { listingId } = req.params;
    
    // Remove from favorites
    const result = await query(
      `DELETE FROM favorites WHERE user_id = ? AND listing_id = ?`,
      [userId, listingId]
    );
    
    if ((result as any).affectedRows === 0) {
      console.log('ℹ️ Listing not in favorites, returning success');
      return res.status(200).json({
        success: true,
        message: 'İlan zaten favorilerinizde değil'
      });
    }
    
    res.json({
      success: true,
      message: 'İlan favorilerden kaldırıldı'
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Favorilerden kaldırılırken hata oluştu' 
    });
  }
});

// Check if listing is favorited
router.get('/check/:listingId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }
    
    const { listingId } = req.params;
    
    const rows = await query(
      `SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?`,
      [userId, listingId]
    );
    
    res.json({
      success: true,
      isFavorited: (rows as any[]).length > 0
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Favori durumu kontrol edilemedi' 
    });
  }
});

// Cleanup invalid favorites (listings that no longer exist)
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }

    // Remove favorites for listings that no longer exist or are inactive
    const result = await query(`
      DELETE f FROM favorites f
      LEFT JOIN listings l ON f.listing_id = l.id
      WHERE f.user_id = ? AND (l.id IS NULL OR l.status != 'active')
    `, [userId]);

    res.json({
      success: true,
      message: 'Favoriler temizlendi',
      removedCount: (result as any).affectedRows || 0
    });

  } catch (error) {
    console.error('Cleanup favorites error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Favoriler temizlenirken hata oluştu' 
    });
  }
});

export default router;