import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'B426859..',
  database: 'varmi_db'
});

console.log('🔍 Veritabanı ilanları kontrol ediliyor...\n');

// Aktif ve onaylı ilan sayısı
const [activeListings] = await conn.execute(`
  SELECT COUNT(*) as count 
  FROM listings 
  WHERE status = 'active' AND approval_status = 'approved'
`);
console.log('✅ Aktif ve onaylı ilan sayısı:', activeListings[0].count);

// Tüm ilanlar
const [allListings] = await conn.execute(`
  SELECT COUNT(*) as count FROM listings
`);
console.log('📊 Toplam ilan sayısı:', allListings[0].count);

// Onay bekleyen ilanlar
const [pendingListings] = await conn.execute(`
  SELECT COUNT(*) as count 
  FROM listings 
  WHERE approval_status = 'pending'
`);
console.log('⏳ Onay bekleyen ilan sayısı:', pendingListings[0].count);

// Eğer aktif ilan yoksa, örnek ilan ekle
if (activeListings[0].count === 0) {
  console.log('\n❌ Aktif ilan bulunamadı! Test ilanı ekleniyor...\n');
  
  // Önce bir test kullanıcısı al
  const [users] = await conn.execute('SELECT id FROM users LIMIT 1');
  
  if (users.length === 0) {
    console.log('❌ Kullanıcı bulunamadı! Önce bir kullanıcı oluşturun.');
  } else {
    const userId = users[0].id;
    
    // Test ilanı ekle
    await conn.execute(`
      INSERT INTO listings (
        id, buyer_id, title, description, category, listing_condition,
        budget_min, budget_max, city, delivery_type, status, approval_status,
        created_at, updated_at, expires_at
      ) VALUES (
        UUID(), ?, 'Test İlanı - iPhone 15 Pro Aranıyor', 
        'Sıfır veya 2. el iPhone 15 Pro aranıyor. Temiz ve garantili olmalı.',
        'Elektronik', 'sifir', 35000, 50000, 'İstanbul', 'kargo',
        'active', 'approved', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)
      )
    `, [userId]);
    
    await conn.execute(`
      INSERT INTO listings (
        id, buyer_id, title, description, category, listing_condition,
        budget_min, budget_max, city, delivery_type, status, approval_status,
        created_at, updated_at, expires_at
      ) VALUES (
        UUID(), ?, 'PlayStation 5 Aranıyor', 
        'Kutusu ve aksesuarları ile birlikte PS5 aranıyor.',
        'Elektronik', 'sifir', 15000, 18000, 'Ankara', 'elden',
        'active', 'approved', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)
      )
    `, [userId]);
    
    await conn.execute(`
      INSERT INTO listings (
        id, buyer_id, title, description, category, listing_condition,
        budget_min, budget_max, city, delivery_type, status, approval_status,
        created_at, updated_at, expires_at
      ) VALUES (
        UUID(), ?, 'MacBook Pro M3 Aranıyor', 
        '14 veya 16 inch MacBook Pro M3, az kullanılmış veya sıfır.',
        'Bilgisayar', 'sifir', 45000, 65000, 'İzmir', 'kargo',
        'active', 'approved', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)
      )
    `, [userId]);
    
    console.log('✅ 3 adet test ilanı eklendi!');
  }
}

await conn.end();
console.log('\n✅ Kontrol tamamlandı!');
