import express from 'express';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// DEBUG: Get all orders (temporary)
router.get('/debug-all', authenticateToken, async (req, res) => {
  try {
    const allOrders = await query('SELECT id, user_id, status, total_amount, created_at FROM orders LIMIT 10');
    const allUsers = await query('SELECT id, firstName, lastName, email FROM users LIMIT 10');
    
    console.log('🔍 DEBUG - All Orders:', allOrders);
    console.log('🔍 DEBUG - All Users:', allUsers);
    
    res.json({
      success: true,
      allOrders,
      allUsers,
      currentUserId: (req as any).user?.userId || (req as any).userId
    });
  } catch (error) {
    console.error('Transfer orders error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Transfer sırasında hata oluştu' 
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
              'Sample Address, Istanbul 34000', NOW(), NOW())
    `, [orderId, orderNumber, userId]);

    // Insert order item
    await query(`
      INSERT INTO order_items (order_id, listing_id, title, description, price, quantity, image)
      VALUES (?, 'sample-listing', 'Sample Product', 'Sample product description', 1299.99, 1, '/placeholder-image.jpg')
    `, [orderId]);

    // Insert seller (make current user both buyer and seller for testing)
    await query(`
      INSERT INTO order_sellers (order_id, seller_id, seller_name, seller_email)
      VALUES (?, ?, 'Test Seller', 'seller@test.com')
    `, [orderId, userId]);

    // Insert tracking
    await query(`
      INSERT INTO order_tracking (order_id, status, description)
      VALUES (?, 'Sipariş Alındı', 'Sample order created for testing')
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
});g('🔍 DEBUG - All Users:', allUsers);
    
    res.json({
      success: true,
      allOrders,
      allUsers,
      currentUserId: (req as any).user?.userId || (req as any).userId
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, error: 'Debug failed' });
  }
});

// Get user's orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }

    console.log('🔍 Getting orders for user:', userId);
    console.log('🔍 Full user object from token:', (req as any).user);

    const orders = await query(`
      SELECT 
        o.*,
        COUNT(oi.id) as item_count,
        GROUP_CONCAT(DISTINCT os.seller_name) as seller_names
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN order_sellers os ON o.id = os.order_id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [userId]);

    console.log('📦 Found orders:', (orders as any[]).length);
    console.log('📦 Orders data:', orders);

    const formattedOrders = (orders as any[]).map(order => ({
      id: order.id,
      orderNumber: order.order_number || order.id, // Fallback to ID if no order_number
      total: parseFloat(order.total_amount),
      status: order.status,
      paymentStatus: order.payment_status || 'pending', // Default to pending
      createdAt: order.created_at,
      estimatedDelivery: order.estimated_delivery || order.estimated_delivery_date,
      itemCount: order.item_count || 0,
      sellerNames: order.seller_names ? order.seller_names.split(',') : [],
      shippingAddress: order.shipping_address,
      trackingNumber: order.tracking_number,
      shippingCost: parseFloat(order.shipping_cost || 0)
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

// Get order details by order number or ID
router.get('/:orderIdentifier', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }

    const { orderIdentifier } = req.params;
    console.log('🔍 Getting order details for:', orderIdentifier);

    // Get order basic info
    const orderRows = await query(`
      SELECT o.*, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ? AND o.user_id = ?
      GROUP BY o.id
    `, [orderIdentifier, userId]);

    if (!orderRows || (orderRows as any[]).length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Sipariş bulunamadı' 
      });
    }

    const order = (orderRows as any[])[0];

    // Get order items with seller info
    const itemsRows = await query(`
      SELECT 
        oi.*,
        u.firstName as seller_first_name,
        u.lastName as seller_last_name,
        u.email as seller_email,
        ot.carrier_company,
        ot.tracking_url,
        ot.location as tracking_location,
        ot.description as tracking_description
      FROM order_items oi
      LEFT JOIN users u ON oi.seller_id = u.id
      LEFT JOIN order_tracking ot ON oi.id = ot.order_item_id
      WHERE oi.order_id = ?
      ORDER BY oi.created_at DESC
    `, [order.id]);

    // Get seller summary
    const sellersRows = await query(`
      SELECT DISTINCT
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        os.seller_rating
      FROM order_sellers os
      LEFT JOIN users u ON os.seller_id = u.id
      WHERE os.order_id = ?
    `, [order.id]);

    const formattedOrder = {
      id: order.id,
      orderNumber: order.order_number,
      total: order.total_amount,
      status: order.status,
      paymentStatus: order.payment_status,
      createdAt: order.created_at,
      estimatedDelivery: order.estimated_delivery_date,
      itemCount: order.item_count || 0,
      shippingAddress: order.shipping_address,
      billingAddress: order.billing_address,
      notes: order.notes,
      items: (itemsRows as any[]).map(item => ({
        id: item.id,
        offerId: item.offer_id,
        listingId: item.listing_id,
        productName: item.product_name,
        productDescription: item.product_description,
        price: item.price,
        quantity: item.quantity,
        condition: item.product_condition,
        images: item.images ? JSON.parse(item.images) : [],
        shippingCost: item.shipping_cost,
        shippingMethod: item.shipping_method,
        trackingNumber: item.tracking_number,
        deliveryStatus: item.delivery_status,
        deliveredAt: item.delivered_at,
        seller: {
          id: item.seller_id,
          name: `${item.seller_first_name || ''} ${item.seller_last_name || ''}`.trim(),
          email: item.seller_email
        },
        tracking: {
          company: item.carrier_company,
          url: item.tracking_url,
          location: item.tracking_location,
          description: item.tracking_description
        }
      })),
      sellers: (sellersRows as any[]).map(seller => ({
        id: seller.id,
        name: `${seller.firstName || ''} ${seller.lastName || ''}`.trim(),
        email: seller.email,
        rating: seller.seller_rating
      }))
    };

    console.log('📦 Order details loaded:', formattedOrder.orderNumber);

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

// Update order status (for admin or seller)
router.patch('/:orderId/status', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }

    const { orderId } = req.params;
    const { status, itemId, trackingNumber, carrierCompany } = req.body;

    console.log('🔄 Updating order status:', { orderId, status, itemId, userId });

    if (itemId) {
      // Update specific item status
      await query(`
        UPDATE order_items 
        SET delivery_status = ?, tracking_number = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND order_id = ?
      `, [status, trackingNumber || null, itemId, orderId]);

      // Add tracking entry if provided
      if (trackingNumber && carrierCompany) {
        await query(`
          INSERT INTO order_tracking (order_item_id, status, carrier_company, tracking_number, created_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [itemId, status, carrierCompany, trackingNumber]);
      }
    } else {
      // Update entire order status
      await query(`
        UPDATE orders 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, orderId]);
    }

    res.json({
      success: true,
      message: 'Sipariş durumu güncellendi'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sipariş durumu güncellenirken hata oluştu' 
    });
  }
});

// Create new order (when offer is accepted and payment is made)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }

    const { offerIds, shippingAddress, billingAddress, notes } = req.body;

    console.log('🛒 Creating new order:', { userId, offerIds });

    // Generate order number
    const orderNumber = '105764' + Date.now().toString().slice(-6);
    
    // Calculate total from offers
    const offersData = await query(`
      SELECT o.*, l.title as listing_title, u.firstName, u.lastName
      FROM offers o
      JOIN listings l ON o.listing_id = l.id
      JOIN users u ON o.seller_id = u.id
      WHERE o.id IN (${offerIds.map(() => '?').join(',')}) AND o.status = 'accepted'
    `, offerIds);

    if (!offersData || (offersData as any[]).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Geçerli teklif bulunamadı' 
      });
    }

    const offers = offersData as any[];
    const totalAmount = offers.reduce((sum, offer) => sum + (offer.price * offer.quantity), 0);

    // Create order
    const orderResult = await query(`
      INSERT INTO orders (order_number, user_id, total_amount, status, payment_status, estimated_delivery_date, shipping_address, billing_address, notes)
      VALUES (?, ?, ?, 'preparing', 'paid', DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), ?, ?, ?)
    `, [orderNumber, userId, totalAmount, shippingAddress, billingAddress, notes]);

    const orderId = (orderResult as any).insertId;

    // Create order items
    for (const offer of offers) {
      await query(`
        INSERT INTO order_items (order_id, offer_id, listing_id, seller_id, product_name, price, quantity, product_condition, images, shipping_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        offer.id,
        offer.listing_id,
        offer.seller_id,
        offer.listing_title,
        offer.price,
        offer.quantity,
        offer.offer_condition || 'new',
        offer.images || '[]',
        offer.shipping_cost || 0
      ]);

      // Create seller entry
      await query(`
        INSERT INTO order_sellers (order_id, seller_id, seller_name, seller_rating)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE seller_name = VALUES(seller_name)
      `, [
        orderId,
        offer.seller_id,
        `${offer.firstName || ''} ${offer.lastName || ''}`.trim(),
        offer.seller_rating || 0
      ]);
    }

    console.log('✅ Order created:', orderNumber);

    res.json({
      success: true,
      order: {
        id: orderId,
        orderNumber,
        total: totalAmount,
        status: 'preparing'
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sipariş oluşturulurken hata oluştu' 
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
        os.seller_name
      FROM orders o
      INNER JOIN order_sellers os ON o.id = os.order_id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE os.seller_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [userId]);

    console.log('🛍️ Found sales:', (salesRows as any[]).length);
    console.log('🛍️ Sales data:', salesRows);

    const formattedSales = (salesRows as any[]).map(sale => ({
      id: sale.id,
      orderNumber: sale.order_number || sale.id,
      total: parseFloat(sale.total_amount),
      status: sale.status,
      paymentStatus: sale.payment_status || 'paid',
      createdAt: sale.created_at,
      itemCount: sale.item_count || 0,
      buyerAddress: sale.shipping_address,
      trackingNumber: sale.tracking_number,
      estimatedDelivery: sale.estimated_delivery,
      sellerName: sale.seller_name,
      shippingCost: parseFloat(sale.shipping_cost || 0)
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

// Update order status and tracking (for sellers)
router.patch('/:orderId/update-status', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = (req as any).user?.userId || (req as any).userId;
    const { status, trackingNumber, carrierCompany, estimatedDelivery, notes } = req.body;

    console.log('📦 Updating order status:', { orderId, status, trackingNumber });

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User ID bulunamadı' 
      });
    }

    // Verify the user is the seller of this order
    const sellerCheckRows = await query(`
      SELECT os.seller_id 
      FROM order_sellers os 
      WHERE os.order_id = ? AND os.seller_id = ?
    `, [orderId, userId]);

    if ((sellerCheckRows as any[]).length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu siparişi güncelleme yetkiniz yok' 
      });
    }

    // Update order status
    const updateFields = ['status = ?'];
    const updateValues = [status];

    if (trackingNumber) {
      updateFields.push('tracking_number = ?');
      updateValues.push(trackingNumber);
    }

    if (estimatedDelivery) {
      updateFields.push('estimated_delivery = ?');
      updateValues.push(estimatedDelivery);
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
          `Sipariş kargoya verildi. Kargo firması: ${carrierCompany || 'Belirtilmedi'}` : 
          'Sipariş kargoya verildi',
        delivered: 'Sipariş teslim edildi'
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

    res.json({
      success: true,
      message: 'Sipariş durumu güncellendi'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sipariş durumu güncellenirken hata oluştu' 
    });
  }
});

// TEMPORARY: Transfer sample orders to current user
router.post('/transfer-sample-orders', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID bulunamadı' });
    }

    console.log('🔄 Transferring sample orders to user:', userId);

    // Check current orders situation
    const existingOrders = await query('SELECT id, user_id FROM orders');
    const existingSellers = await query('SELECT order_id, seller_id FROM order_sellers');
    
    console.log('📊 Existing orders:', existingOrders);
    console.log('📊 Existing sellers:', existingSellers);

    // Transfer all existing orders to current user (as buyer)
    const orderUpdateResult = await query(`
      UPDATE orders 
      SET user_id = ? 
      WHERE user_id != ?
    `, [userId, userId]);

    // Make current user a seller for all orders to test sales functionality
    const sellerUpdateResult = await query(`
      UPDATE order_sellers 
      SET seller_id = ? 
      WHERE seller_id != ?
    `, [userId, userId]);

    console.log('✅ Order update result:', orderUpdateResult);
    console.log('✅ Seller update result:', sellerUpdateResult);

    // Check final state
    const finalOrders = await query('SELECT id, user_id FROM orders WHERE user_id = ?', [userId]);
    const finalSellers = await query('SELECT order_id, seller_id FROM order_sellers WHERE seller_id = ?', [userId]);
    
    console.log('📊 Final orders for user:', finalOrders);
    console.log('📊 Final sellers for user:', finalSellers);

    res.json({
      success: true,
      message: 'Sample orders and sales transferred successfully',
      details: {
        ordersTransferred: (orderUpdateResult as any).affectedRows,
        sellersTransferred: (sellerUpdateResult as any).affectedRows,
        finalOrdersCount: (finalOrders as any[]).length,
        finalSellersCount: (finalSellers as any[]).length
      }
    });
  } catch (error) {
    console.error('Transfer orders error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Siparişler transfer edilirken hata oluştu' 
    });
  }
});

export default router;