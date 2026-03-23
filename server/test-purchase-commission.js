import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'varmi_db',
  charset: 'utf8mb4'
};

async function testPurchase() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔍 Database bağlantısı başarılı\n');

    // 1. Test için aktif bir offer bulalım
    const [offers] = await connection.execute(`
      SELECT o.*, l.buyer_id as listing_owner_id
      FROM offers o
      LEFT JOIN listings l ON o.listing_id = l.id
      WHERE o.status = 'active' 
      AND o.approval_status = 'approved'
      AND (o.quantity - COALESCE(o.sold_quantity, 0)) > 0
      LIMIT 1
    `);

    if (offers.length === 0) {
      console.log('❌ Test için uygun aktif teklif bulunamadı');
      return;
    }

    const offer = offers[0];
    console.log('📦 Test Offer:', {
      id: offer.id,
      product_name: offer.product_name,
      price: offer.price,
      quantity: offer.quantity,
      sold_quantity: offer.sold_quantity,
      seller_id: offer.seller_id,
      listing_owner_id: offer.listing_owner_id
    });

    // 2. Bir test kullanıcısı bulalım (admin olmayan)
    const [users] = await connection.execute(`
      SELECT id, email, firstName, lastName, commission_balance 
      FROM users 
      WHERE role != 'admin' 
      AND id != ? 
      AND id != ?
      LIMIT 1
    `, [offer.seller_id, offer.listing_owner_id]);

    if (users.length === 0) {
      console.log('❌ Test için uygun kullanıcı bulunamadı');
      return;
    }

    const buyer = users[0];
    console.log('\n👤 Test Buyer:', {
      id: buyer.id,
      email: buyer.email,
      name: `${buyer.firstName} ${buyer.lastName}`,
      commission_balance: buyer.commission_balance
    });

    // 3. Komisyon oranlarını kontrol edelim
    const [settings] = await connection.execute(`
      SELECT setting_key, setting_value 
      FROM site_settings 
      WHERE setting_key IN ('commission_rate_listing_owner', 'commission_rate_seller', 'commission_enabled')
    `);

    console.log('\n⚙️ Commission Settings:');
    settings.forEach(s => {
      console.log(`  ${s.setting_key}: ${s.setting_value}`);
    });

    // 4. Komisyon hesaplaması yapalım
    const totalAmount = offer.price;
    const listingOwnerRate = 2; // varsayılan
    const sellerRate = 2; // varsayılan

    const isBuyerOwner = buyer.id === offer.listing_owner_id;
    const isBuyerSeller = buyer.id === offer.seller_id;

    const commissionToOwner = isBuyerOwner ? 0 : (totalAmount * listingOwnerRate / 100);
    const commissionToSeller = isBuyerSeller ? 0 : (totalAmount * sellerRate / 100);

    console.log('\n💰 Commission Calculation:', {
      totalAmount,
      listingOwnerRate: `${listingOwnerRate}%`,
      sellerRate: `${sellerRate}%`,
      isBuyerOwner,
      isBuyerSeller,
      commissionToOwner: commissionToOwner.toFixed(2) + ' TL',
      commissionToSeller: commissionToSeller.toFixed(2) + ' TL'
    });

    // 5. orders tablosunun schema'sını kontrol edelim
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM orders
    `);

    console.log('\n📋 Orders Table Columns:');
    const columnNames = columns.map(c => c.Field);
    const requiredColumns = [
      'id', 'buyer_id', 'seller_id', 'listing_id', 'source_offer_id',
      'status', 'total_amount', 'shipping_cost', 'shipping_address',
      'commission_to_listing_owner', 'commission_to_seller',
      'commission_rate_listing', 'commission_rate_seller',
      'commission_used'
    ];

    requiredColumns.forEach(col => {
      const exists = columnNames.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

    // 6. order_items tablosu var mı kontrol edelim
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'order_items'
    `);

    if (tables.length === 0) {
      console.log('\n❌ order_items tablosu eksik!');
    } else {
      console.log('\n✅ order_items tablosu mevcut');
    }

    // 7. commission_transactions tablosu var mı kontrol edelim
    const [commTables] = await connection.execute(`
      SHOW TABLES LIKE 'commission_transactions'
    `);

    if (commTables.length === 0) {
      console.log('❌ commission_transactions tablosu eksik!');
    } else {
      console.log('✅ commission_transactions tablosu mevcut');
    }

    console.log('\n✅ Test tamamlandı!');
    console.log('\n📝 Satın alma işlemi için gerekli veriler:');
    console.log({
      offerId: offer.id,
      userId: buyer.id,
      quantity: 1,
      totalAmount: offer.price,
      userInfo: {
        firstName: buyer.firstName || 'Test',
        lastName: buyer.lastName || 'User',
        email: buyer.email,
        phone: '5551234567',
        address: 'Test Adres',
        city: 'Istanbul',
        postalCode: '34000'
      },
      paymentInfo: {
        cardName: 'Test Card',
        cardNumber: '4242424242424242',
        expiry: '12/25',
        cvv: '123'
      }
    });

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testPurchase();
