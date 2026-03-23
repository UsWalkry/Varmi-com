// Migrate name data to firstName/lastName
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrateNameData() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db',
      port: parseInt(process.env.DB_PORT || '3306'),
      charset: 'utf8mb4'
    });

    console.log('🔗 Connected to MySQL database');

    // First, let's see current data
    const [users] = await connection.execute('SELECT id, name, firstName, lastName FROM users WHERE name IS NOT NULL LIMIT 5');
    console.log('📋 Current user data:');
    console.table(users);

    // Migrate data
    console.log('🔄 Migrating name data to firstName/lastName...');
    
    // For each user with a name, split it
    const [allUsers] = await connection.execute('SELECT id, name FROM users WHERE name IS NOT NULL AND name != ""');
    
    for (const user of allUsers) {
      const nameParts = user.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      await connection.execute(
        'UPDATE users SET firstName = ?, lastName = ? WHERE id = ?',
        [firstName, lastName || null, user.id]
      );
      
      console.log(`✅ Updated user ${user.id}: "${user.name}" → firstName: "${firstName}", lastName: "${lastName}"`);
    }

    // Show updated data
    const [updatedUsers] = await connection.execute('SELECT id, name, firstName, lastName FROM users LIMIT 5');
    console.log('📋 Updated user data:');
    console.table(updatedUsers);

    // Drop the old name column
    console.log('🗑️ Dropping old name column...');
    await connection.execute('ALTER TABLE users DROP COLUMN name');
    console.log('✅ Name column dropped');

    // Final structure check
    const [structure] = await connection.execute('DESCRIBE users');
    console.log('📋 Final table structure:');
    console.table(structure);

    await connection.end();
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

migrateNameData();