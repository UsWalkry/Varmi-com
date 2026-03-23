import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'varmi_db',
  charset: 'utf8mb4'
};

async function checkOrdersTable() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Database bağlantısı başarılı\n');

    // orders tablosunun kolonlarını kontrol et
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM orders
    `);

    console.log('📋 orders Tablosu Kolonları:\n');
    
    const columnNames = columns.map(c => c.Field);
    const requiredColumns = [
      'id',
      'buyer_id',
      'seller_id',
      'listing_id',
      'source_offer_id',
      'status',
      'total_amount',
      'shipping_cost',
      'shipping_address',
      'commission_to_listing_owner',
      'commission_to_seller',
      'commission_rate_listing',
      'commission_rate_seller',
      'commission_used',
      'created_at'
    ];

    let allPresent = true;
    requiredColumns.forEach(col => {
      const exists = columnNames.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
      if (!exists) allPresent = false;
    });

    if (!allPresent) {
      console.log('\n❌ Eksik kolonlar var! commission_used kolonu eklenmiş mi?');
    } else {
      console.log('\n✅ Tüm gerekli kolonlar mevcut!');
    }

    // commission_used kolonunun detaylarını göster
    const commissionUsedCol = columns.find(c => c.Field === 'commission_used');
    if (commissionUsedCol) {
      console.log('\n💰 commission_used Kolon Detayları:');
      console.log('  Type:', commissionUsedCol.Type);
      console.log('  Null:', commissionUsedCol.Null);
      console.log('  Default:', commissionUsedCol.Default);
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkOrdersTable();
