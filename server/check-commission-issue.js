import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'varmi_db',
  charset: 'utf8mb4'
};

async function checkCommission() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const listingId = 'b4494b18-8090-42fe-ac96-f80774e26fb7';
    
    console.log('🔍 İlan ve Sipariş Bilgileri:\n');

    // 1. İlan bilgilerini getir
    const [listings] = await connection.execute(`
      SELECT l.*, u.email as owner_email, u.firstName, u.lastName, u.commission_balance
      FROM listings l
      LEFT JOIN users u ON l.buyer_id = u.id
      WHERE l.id = ?
    `, [listingId]);

    if (listings.length === 0) {
      console.log('❌ İlan bulunamadı!');
      return;
    }

    const listing = listings[0];
    console.log('📋 İlan Bilgileri:');
    console.log('  ID:', listing.id);
    console.log('  Başlık:', listing.title);
    console.log('  Sahip:', `${listing.firstName} ${listing.lastName} (${listing.owner_email})`);
    console.log('  Sahip ID:', listing.buyer_id);
    console.log('  Mevcut Komisyon Bakiyesi:', listing.commission_balance);

    // 2. Bu ilana ait son siparişleri getir
    const [orders] = await connection.execute(`
      SELECT 
        o.*,
        buyer.email as buyer_email,
        buyer.firstName as buyer_firstName,
        buyer.lastName as buyer_lastName,
        seller.email as seller_email,
        seller.firstName as seller_firstName,
        seller.lastName as seller_lastName
      FROM orders o
      LEFT JOIN users buyer ON o.buyer_id = buyer.id
      LEFT JOIN users seller ON o.seller_id = seller.id
      WHERE o.listing_id = ?
      ORDER BY o.created_at DESC
      LIMIT 5
    `, [listingId]);

    if (orders.length === 0) {
      console.log('\n❌ Bu ilana ait sipariş bulunamadı!');
      return;
    }

    console.log(`\n📦 Son ${orders.length} Sipariş:\n`);
    
    orders.forEach((order, index) => {
      console.log(`Sipariş ${index + 1}:`);
      console.log('  ID:', order.id);
      console.log('  Tarih:', order.created_at);
      console.log('  Alıcı:', `${order.buyer_firstName} ${order.buyer_lastName} (${order.buyer_email})`);
      console.log('  Satıcı:', `${order.seller_firstName} ${order.seller_lastName} (${order.seller_email})`);
      console.log('  Toplam Tutar:', order.total_amount);
      console.log('  Durum:', order.status);
      console.log('  İlan Sahibine Komisyon:', order.commission_to_listing_owner || 0);
      console.log('  Satıcıya Komisyon:', order.commission_to_seller || 0);
      console.log('  İlan Komisyon Oranı:', order.commission_rate_listing || 0, '%');
      console.log('  Satıcı Komisyon Oranı:', order.commission_rate_seller || 0, '%');
      console.log('  Kullanılan Komisyon:', order.commission_used || 0);
      console.log('  Komisyon Ödendi mi?:', order.commission_paid ? 'Evet' : 'Hayır');
      console.log('');
    });

    // 3. Commission transactions tablosunu kontrol et
    const [transactions] = await connection.execute(`
      SELECT 
        ct.*,
        u.email,
        u.firstName,
        u.lastName
      FROM commission_transactions ct
      LEFT JOIN users u ON ct.user_id = u.id
      LEFT JOIN orders o ON ct.order_id = o.id
      WHERE o.listing_id = ?
      ORDER BY ct.created_at DESC
      LIMIT 10
    `, [listingId]);

    if (transactions.length > 0) {
      console.log(`💰 Komisyon İşlemleri (${transactions.length} adet):\n`);
      transactions.forEach((tx, index) => {
        console.log(`İşlem ${index + 1}:`);
        console.log('  Kullanıcı:', `${tx.firstName} ${tx.lastName} (${tx.email})`);
        console.log('  Tip:', tx.transaction_type);
        console.log('  Tutar:', tx.amount);
        console.log('  Açıklama:', tx.description);
        console.log('  Tarih:', tx.created_at);
        console.log('');
      });
    } else {
      console.log('❌ Komisyon işlemi kaydı bulunamadı!\n');
    }

    // 4. İlan sahibinin ve satıcının komisyon bakiyelerini kontrol et
    const lastOrder = orders[0];
    const [ownerBalance] = await connection.execute(`
      SELECT id, email, firstName, lastName, commission_balance, total_commission_earned
      FROM users
      WHERE id = ?
    `, [listing.buyer_id]);

    const [sellerBalance] = await connection.execute(`
      SELECT id, email, firstName, lastName, commission_balance, total_commission_earned
      FROM users
      WHERE id = ?
    `, [lastOrder.seller_id]);

    console.log('👤 Kullanıcı Komisyon Bakiyeleri:\n');
    
    if (ownerBalance.length > 0) {
      const owner = ownerBalance[0];
      console.log('İlan Sahibi:', `${owner.firstName} ${owner.lastName} (${owner.email})`);
      console.log('  Komisyon Bakiyesi:', owner.commission_balance);
      console.log('  Toplam Kazanılan:', owner.total_commission_earned);
      console.log('');
    }

    if (sellerBalance.length > 0) {
      const seller = sellerBalance[0];
      console.log('Satıcı:', `${seller.firstName} ${seller.lastName} (${seller.email})`);
      console.log('  Komisyon Bakiyesi:', seller.commission_balance);
      console.log('  Toplam Kazanılan:', seller.total_commission_earned);
      console.log('');
    }

    // 5. Komisyon oranlarını kontrol et
    const [settings] = await connection.execute(`
      SELECT setting_key, setting_value
      FROM site_settings
      WHERE setting_key IN ('commission_rate_listing_owner', 'commission_rate_seller', 'commission_enabled')
    `);

    console.log('⚙️ Komisyon Ayarları:');
    settings.forEach(s => {
      console.log(`  ${s.setting_key}:`, s.setting_value);
    });

    // 6. Sorun teşhisi
    console.log('\n\n🔍 SORUN TEŞHİSİ:\n');
    
    if (orders[0].commission_to_listing_owner === null || orders[0].commission_to_listing_owner === 0) {
      console.log('❌ SORUN: Siparişte ilan sahibine komisyon hesaplanmamış!');
      console.log('   Olası Nedenler:');
      console.log('   - Alıcı = İlan sahibi mi? (Kendi ilanından aldıysa komisyon yok)');
      console.log('   - Komisyon sistemi kapalı mı?');
      console.log('   - calculateCommissions fonksiyonu düzgün çalışmamış olabilir');
    }

    if (transactions.length === 0) {
      console.log('❌ SORUN: Komisyon transactions tablosuna kayıt eklenmemiş!');
      console.log('   Neden: Komisyon transfer edilmemiş (users tablosuna eklenmemiş)');
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkCommission();
