import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function setupAdminTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'varmi_db'
  });

  try {
    console.log('🔌 Connected to MySQL database');
    
    // Check if role column exists
    console.log('📋 Checking users table structure...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
    `, [process.env.DB_NAME || 'varmi_db']);
    
    if (columns.length === 0) {
      console.log('➕ Adding role column to users table...');
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN role VARCHAR(20) DEFAULT 'user' AFTER email
      `);
      console.log('✅ Role column added');
    } else {
      console.log('✅ Role column already exists');
    }

    // Create admin_logs table
    console.log('📝 Creating admin_logs table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        admin_id VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id VARCHAR(255),
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_id (admin_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Admin logs table created/verified');

    // Set first user as admin for testing
    console.log('👤 Setting first user as admin...');
    const [users] = await connection.execute(`
      SELECT id, email, first_name, last_name, role 
      FROM users 
      ORDER BY created_at ASC 
      LIMIT 1
    `);
    
    if (users.length > 0) {
      const firstUser = users[0];
      if (firstUser.role !== 'admin') {
        await connection.execute(`
          UPDATE users 
          SET role = 'admin' 
          WHERE id = ?
        `, [firstUser.id]);
        console.log(`✅ User ${firstUser.email} (${firstUser.first_name} ${firstUser.last_name}) set as admin`);
      } else {
        console.log(`✅ User ${firstUser.email} is already admin`);
      }
    } else {
      console.log('⚠️ No users found in database');
    }

    // Add useful indexes
    console.log('📊 Adding performance indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await connection.execute(indexQuery);
      } catch (e) {
        console.log(`Index already exists: ${e.message}`);
      }
    }
    console.log('✅ Indexes created');

    // Show admin users
    console.log('👥 Current admin users:');
    const [admins] = await connection.execute(`
      SELECT id, email, first_name, last_name, role, created_at 
      FROM users 
      WHERE role = 'admin'
    `);
    
    if (admins.length > 0) {
      admins.forEach(admin => {
        console.log(`  - ${admin.email} (${admin.first_name} ${admin.last_name})`);
      });
    } else {
      console.log('  No admin users found');
    }

    console.log('\n🎉 Admin setup completed successfully!');
    console.log('\n📝 Instructions:');
    console.log('1. Login with the admin user credentials');
    console.log('2. You will see "Admin Panel" link in the user dropdown');
    console.log('3. Click to access admin panel at /admin');

  } catch (error) {
    console.error('❌ Error setting up admin tables:', error);
  } finally {
    await connection.end();
  }
}

setupAdminTables();