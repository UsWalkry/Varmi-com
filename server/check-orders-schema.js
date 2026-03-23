import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'varmi_db',
  charset: 'utf8mb4'
};

async function checkOrdersSchema() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔍 orders Tablosu Schema:\n');

    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM orders
    `);

    console.log('📋 Kolonlar:');
    columns.forEach(col => {
      console.log(`  ${col.Field.padEnd(30)} | ${col.Type.padEnd(20)} | ${col.Null} | ${col.Key} | ${col.Default}`);
    });

    console.log('\n🔗 Foreign Keys:');
    const [fks] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'varmi_db'
      AND TABLE_NAME = 'orders'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    fks.forEach(fk => {
      console.log(`  ${fk.CONSTRAINT_NAME}: ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
    });

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkOrdersSchema();
