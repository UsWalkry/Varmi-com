const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: process.env.DB_USER || 'varmii_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'varmii_com'
    });

    console.log('✅ Database bağlantısı başarılı');

    const sql = fs.readFileSync('/tmp/add_performance_indexes.sql', 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('USE') && !s.startsWith('SELECT'));

    console.log(`📊 ${statements.length} index oluşturulacak...`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const stmt of statements) {
      try {
        await conn.execute(stmt);
        const indexName = stmt.match(/INDEX\s+(\w+)/i)?.[1] || 'unknown';
        console.log(`✅ ${indexName}`);
        created++;
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log(`⏭️  Already exists: ${stmt.substring(0, 50)}...`);
          skipped++;
        } else {
          console.error(`❌ Error: ${e.message}`);
          console.error(`   SQL: ${stmt.substring(0, 80)}...`);
          errors++;
        }
      }
    }

    await conn.end();

    console.log('\n📊 SONUÇ:');
    console.log(`  ✅ Oluşturulan: ${created}`);
    console.log(`  ⏭️  Zaten var: ${skipped}`);
    console.log(`  ❌ Hata: ${errors}`);
    console.log(`\n🎉 Index'ler başarıyla eklendi!`);
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
})();
