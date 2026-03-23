import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

const dbConfig = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'varmi_db',
  charset: 'utf8mb4'
};

async function fixPastCommissions() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();
    
    console.log('🔍 Komisyonu ödenmemiş siparişler aranıyor...\n');

    // Get orders with unpaid commissions
    const [orders] = await connection.execute(`
      SELECT 
        o.id,
        o.buyer_id,
        o.seller_id,
        o.listing_id,
        o.commission_to_listing_owner,
        o.commission_to_seller,
        o.created_at,
        l.buyer_id as listing_owner_id
      FROM orders o
      LEFT JOIN listings l ON o.listing_id = l.id
      WHERE o.commission_paid = 0
      AND (o.commission_to_listing_owner > 0 OR o.commission_to_seller > 0)
      ORDER BY o.created_at ASC
    `);

    if (orders.length === 0) {
      console.log('✅ Düzeltilecek sipariş yok!\n');
      await connection.commit();
      return;
    }

    console.log(`📦 ${orders.length} sipariş bulundu, komisyonlar transfer ediliyor...\n`);

    let totalFixed = 0;
    let totalCommissionOwner = 0;
    let totalCommissionSeller = 0;

    for (const order of orders) {
      console.log(`Sipariş: ${order.id.substring(0, 8)}... (${order.created_at})`);
      
      // Transfer commission to listing owner
      if (order.commission_to_listing_owner > 0 && order.listing_owner_id) {
        await connection.execute(`
          UPDATE users 
          SET commission_balance = commission_balance + ?,
              total_commission_earned = total_commission_earned + ?
          WHERE id = ?
        `, [
          order.commission_to_listing_owner,
          order.commission_to_listing_owner,
          order.listing_owner_id
        ]);

        // Record transaction
        const txId = uuidv4();
        await connection.execute(`
          INSERT INTO commission_transactions (
            id, user_id, order_id, transaction_type, amount, description, created_at
          ) VALUES (?, ?, ?, 'earned', ?, ?, ?)
        `, [
          txId,
          order.listing_owner_id,
          order.id,
          order.commission_to_listing_owner,
          `İlan üzerinden satış komisyonu (Geçmiş sipariş düzeltmesi)`,
          order.created_at
        ]);

        console.log(`  ✅ İlan sahibine: ${order.commission_to_listing_owner} TL`);
        totalCommissionOwner += parseFloat(order.commission_to_listing_owner);
      }

      // Transfer commission to seller
      if (order.commission_to_seller > 0 && order.seller_id) {
        await connection.execute(`
          UPDATE users 
          SET commission_balance = commission_balance + ?,
              total_commission_earned = total_commission_earned + ?
          WHERE id = ?
        `, [
          order.commission_to_seller,
          order.commission_to_seller,
          order.seller_id
        ]);

        // Record transaction
        const txId = uuidv4();
        await connection.execute(`
          INSERT INTO commission_transactions (
            id, user_id, order_id, transaction_type, amount, description, created_at
          ) VALUES (?, ?, ?, 'earned', ?, ?, ?)
        `, [
          txId,
          order.seller_id,
          order.id,
          order.commission_to_seller,
          `Teklif satış komisyonu (Geçmiş sipariş düzeltmesi)`,
          order.created_at
        ]);

        console.log(`  ✅ Satıcıya: ${order.commission_to_seller} TL`);
        totalCommissionSeller += parseFloat(order.commission_to_seller);
      }

      // Mark as paid
      await connection.execute(`
        UPDATE orders SET commission_paid = 1, commission_paid_at = NOW() WHERE id = ?
      `, [order.id]);

      totalFixed++;
      console.log('');
    }

    await connection.commit();

    console.log('✅ Tamamlandı!\n');
    console.log('📊 Özet:');
    console.log(`  Düzeltilen Sipariş: ${totalFixed}`);
    console.log(`  İlan Sahiplerine Toplam: ${totalCommissionOwner.toFixed(2)} TL`);
    console.log(`  Satıcılara Toplam: ${totalCommissionSeller.toFixed(2)} TL`);
    console.log(`  Genel Toplam: ${(totalCommissionOwner + totalCommissionSeller).toFixed(2)} TL`);

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Hata:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

console.log('💰 Geçmiş Komisyon Düzeltme Script\n');
console.log('Bu script, daha önce oluşturulan ama komisyonları');
console.log('kullanıcılara transfer edilmemiş siparişleri düzeltir.\n');

fixPastCommissions();
