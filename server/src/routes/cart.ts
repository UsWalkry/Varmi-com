import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/cart
 * Kullanıcının sepetini getir
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    // Sepeti getir veya oluştur
    let carts: any = await query(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    let cartId;
    if (carts.length === 0) {
      // Sepet yoksa oluştur
      cartId = uuidv4();
      await query(
        'INSERT INTO carts (id, user_id) VALUES (?, ?)',
        [cartId, userId]
      );
    } else {
      cartId = carts[0].id;
    }

    // Sepet içeriğini detaylı getir
    const items: any = await query(`
      SELECT * FROM v_cart_details 
      WHERE cart_id = ?
      ORDER BY added_at DESC
    `, [cartId]);

    // Toplam hesapla
    const subtotal = items.reduce((sum: number, item: any) => 
      sum + parseFloat(item.subtotal || 0), 0
    );
    
    const shipping = items.reduce((sum: number, item: any) => 
      sum + parseFloat(item.shipping_cost || 0), 0
    );
    
    const total = subtotal + shipping;
    
    const itemCount = items.reduce((sum: number, item: any) => 
      sum + parseInt(item.quantity || 0), 0
    );

    res.json({
      success: true,
      cart: {
        id: cartId,
        items: items,
        summary: {
          itemCount,
          subtotal: subtotal.toFixed(2),
          shipping: shipping.toFixed(2),
          total: total.toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('❌ Cart fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sepet yüklenirken hata oluştu' 
    });
  }
});

/**
 * POST /api/cart/add
 * Sepete ürün ekle
 * - offerId varsa: O teklifi kullan (manuel seçim)
 * - offerId yoksa: En düşük teklifi otomatik seç
 */
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { listingId, offerId, quantity = 1 } = req.body;

    if (!listingId) {
      return res.status(400).json({ 
        success: false, 
        message: 'İlan ID gerekli' 
      });
    }

    // İlan kontrolü
    const listings: any = await query(
      `SELECT id, buyer_id FROM listings 
       WHERE id = ? AND status = 'active' AND approval_status = 'approved'`,
      [listingId]
    );

    if (listings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'İlan bulunamadı veya aktif değil' 
      });
    }

    // Kendi ilanını sepete ekleyemez
    if (listings[0].buyer_id === userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kendi ilanınızı sepete ekleyemezsiniz' 
      });
    }

    let selectedOffer;

    // Manuel seçim: Belirli bir teklif seçildi (ilan detay sayfasından)
    if (offerId) {
      const offers: any = await query(
        `SELECT id, price, seller_id 
         FROM offers 
         WHERE id = ? 
           AND listing_id = ?
           AND status = 'active' 
           AND approval_status = 'approved'
           AND (valid_until IS NULL OR valid_until > NOW())`,
        [offerId, listingId]
      );

      if (offers.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Seçilen teklif bulunamadı, aktif değil veya süresi dolmuş' 
        });
      }

      selectedOffer = offers[0];

      // Kendi teklifini sepete ekleyemez
      if (selectedOffer.seller_id === userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Kendi teklifinizi sepete ekleyemezsiniz' 
        });
      }
    } 
    // Otomatik seçim: En düşük teklifi seç (ana sayfa hover'dan)
    else {
      const offers: any = await query(
        `SELECT id, price, seller_id 
         FROM offers 
         WHERE listing_id = ? 
           AND status = 'active' 
           AND approval_status = 'approved'
           AND (valid_until IS NULL OR valid_until > NOW())
           AND seller_id != ?
         ORDER BY price ASC 
         LIMIT 1`,
        [listingId, userId]
      );

      if (offers.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Bu ilan için satın alabileceğiniz geçerli teklif bulunmuyor' 
        });
      }

      selectedOffer = offers[0];
    }

    const lowestOffer = selectedOffer;

    // Sepeti getir veya oluştur
    let carts: any = await query(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    let cartId;
    if (carts.length === 0) {
      cartId = uuidv4();
      await query(
        'INSERT INTO carts (id, user_id) VALUES (?, ?)',
        [cartId, userId]
      );
    } else {
      cartId = carts[0].id;
    }

    // Zaten sepette mi kontrol et
    const existingItems: any = await query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND listing_id = ?',
      [cartId, listingId]
    );

    if (existingItems.length > 0) {
      // Varsa miktarı artır
      const newQuantity = existingItems[0].quantity + quantity;
      await query(
        'UPDATE cart_items SET quantity = ?, offer_id = ? WHERE id = ?',
        [newQuantity, lowestOffer.id, existingItems[0].id]
      );

      return res.json({ 
        success: true, 
        message: 'Sepetteki miktar güncellendi',
        action: 'updated'
      });
    }

    // Yeni item ekle
    const cartItemId = uuidv4();
    await query(
      `INSERT INTO cart_items (id, cart_id, listing_id, offer_id, quantity) 
       VALUES (?, ?, ?, ?, ?)`,
      [cartItemId, cartId, listingId, lowestOffer.id, quantity]
    );

    // Güncel sepet sayısını getir
    const itemCount: any = await query(
      'SELECT SUM(quantity) as count FROM cart_items WHERE cart_id = ?',
      [cartId]
    );

    res.json({ 
      success: true, 
      message: 'Ürün sepete eklendi',
      action: 'added',
      cartItemCount: itemCount[0]?.count || 1
    });
  } catch (error) {
    console.error('❌ Add to cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sepete eklenirken hata oluştu' 
    });
  }
});

/**
 * DELETE /api/cart/item/:id
 * Sepetten ürün çıkar
 */
router.delete('/item/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const itemId = req.params.id;

    // Kullanıcının sepetinden mi kontrol et
    const carts: any = await query(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    if (carts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sepet bulunamadı' 
      });
    }

    await query(
      'DELETE FROM cart_items WHERE id = ? AND cart_id = ?',
      [itemId, carts[0].id]
    );

    res.json({ 
      success: true, 
      message: 'Ürün sepetten çıkarıldı' 
    });
  } catch (error) {
    console.error('❌ Remove from cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sepetten çıkarılırken hata oluştu' 
    });
  }
});

/**
 * PUT /api/cart/item/:id
 * Sepetteki ürün miktarını güncelle
 */
router.put('/item/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const itemId = req.params.id;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçerli miktar giriniz' 
      });
    }

    // Kullanıcının sepetinden mi kontrol et
    const carts: any = await query(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    if (carts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sepet bulunamadı' 
      });
    }

    await query(
      'UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?',
      [quantity, itemId, carts[0].id]
    );

    res.json({ 
      success: true, 
      message: 'Miktar güncellendi' 
    });
  } catch (error) {
    console.error('❌ Update cart item error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Miktar güncellenirken hata oluştu' 
    });
  }
});

/**
 * DELETE /api/cart/clear
 * Sepeti temizle
 */
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const carts: any = await query(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    if (carts.length > 0) {
      await query('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id]);
    }

    res.json({ 
      success: true, 
      message: 'Sepet temizlendi' 
    });
  } catch (error) {
    console.error('❌ Clear cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sepet temizlenirken hata oluştu' 
    });
  }
});

/**
 * POST /api/cart/checkout
 * Sepeti siparişe çevir
 */
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    // Sepeti getir
    const carts: any = await query(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    if (carts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sepet boş' 
      });
    }

    const cartId = carts[0].id;

    // Sepet içeriğini getir
    const items: any = await query(
      'SELECT * FROM v_cart_details WHERE cart_id = ?',
      [cartId]
    );

    if (items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Sepette ürün bulunmuyor' 
      });
    }

    // Kullanıcının varsayılan adresini al
    const addresses: any = await query(
      'SELECT * FROM user_addresses WHERE user_id = ? AND is_default = 1 LIMIT 1',
      [userId]
    );
    const defaultAddress = addresses[0];
    const shippingAddress = defaultAddress
      ? `${defaultAddress.recipient_name || ''}, ${defaultAddress.address_line1 || ''}${defaultAddress.address_line2 ? ', ' + defaultAddress.address_line2 : ''}, ${defaultAddress.district || ''}, ${defaultAddress.city || ''}, ${defaultAddress.postal_code || ''}`.trim()
      : '';

    // Her item için order oluştur
    const orderIds = [];
    for (const item of items) {
      const orderId = uuidv4();
      
      await query(
        `INSERT INTO orders (
          id, user_id, buyer_id, seller_id, listing_id, source_offer_id, 
          status, total_amount, shipping_cost, shipping_address
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          orderId,
          userId,
          userId,
          item.seller_id,
          item.listing_id,
          item.offer_id,
          item.total_with_shipping,
          item.shipping_cost || 0,
          shippingAddress
        ]
      );

      orderIds.push(orderId);

      // İlanı kapat
      await query(
        "UPDATE listings SET status = 'closed' WHERE id = ?",
        [item.listing_id]
      );

      // Teklifi accepted yap
      await query(
        "UPDATE offers SET status = 'accepted' WHERE id = ?",
        [item.offer_id]
      );
    }

    // Sepeti temizle
    await query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);

    res.json({ 
      success: true, 
      message: 'Sipariş başarıyla oluşturuldu',
      orderIds 
    });
  } catch (error) {
    console.error('❌ Checkout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sipariş oluşturulurken hata oluştu' 
    });
  }
});

export default router;
