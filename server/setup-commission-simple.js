/**
 * Simple Commission System Setup - No TypeScript
 * Direkt MySQL'e bağlanıp SQL çalıştırır
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env dosyasını yükle
dotenv.config({ path: join(__dirname, '.env') });

async function setup() {
  let connection;
  
  try {
    console.log('🔌 MySQL bağlantısı kuruluyor...');
    console.log('   Host:', process.env.DB_HOST || 'localhost');
    console.log('   User:', process.env.DB_USER || 'root');
    console.log('   Database:', process.env.DB_NAME || 'varmicom_db');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmicom_db',
      multipleStatements: true
    });

    console.log('✅ Bağlantı başarılı!\n');

    // Mevcut kolonları kontrol et
    console.log('📋 Mevcut yapı kontrol ediliyor...');
    
    const [userCols] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('commission_balance', 'total_commission_earned', 'total_commission_withdrawn')
    `, [process.env.DB_NAME]);

    if (userCols.length === 3) {
      console.log('⚠️  Komisyon sistemi zaten kurulu görünüyor.');
      console.log('   Devam etmek istiyor musunuz? (Ctrl+C ile iptal)');
    }

    // users tablosuna kolonlar ekle
    console.log('\n1️⃣ users tablosuna komisyon alanları ekleniyor...');
    try {
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN commission_balance DECIMAL(10, 2) DEFAULT 0.00,
        ADD COLUMN total_commission_earned DECIMAL(10, 2) DEFAULT 0.00,
        ADD COLUMN total_commission_withdrawn DECIMAL(10, 2) DEFAULT 0.00
      `);
      console.log('   ✅ Başarılı');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠️  Kolonlar zaten mevcut');
      } else {
        throw err;
      }
    }

    // orders tablosuna kolonlar ekle
    console.log('\n2️⃣ orders tablosuna komisyon alanları ekleniyor...');
    try {
      await connection.query(`
        ALTER TABLE orders
        ADD COLUMN commission_to_listing_owner DECIMAL(10, 2) DEFAULT 0.00,
        ADD COLUMN commission_to_seller DECIMAL(10, 2) DEFAULT 0.00,
        ADD COLUMN commission_rate_listing DECIMAL(5, 2) DEFAULT 5.00,
        ADD COLUMN commission_rate_seller DECIMAL(5, 2) DEFAULT 5.00,
        ADD COLUMN commission_paid BOOLEAN DEFAULT FALSE,
        ADD COLUMN commission_paid_at TIMESTAMP NULL
      `);
      console.log('   ✅ Başarılı');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠️  Kolonlar zaten mevcut');
      } else {
        throw err;
      }
    }

    // commission_transactions tablosu
    console.log('\n3️⃣ commission_transactions tablosu oluşturuluyor...');
    try {
      await connection.query(`
        CREATE TABLE commission_transactions (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          order_id VARCHAR(36) NOT NULL,
          transaction_type ENUM('earned', 'withdrawn') NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_transactions (user_id, created_at DESC),
          INDEX idx_order_transactions (order_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ Başarılı');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('   ⚠️  Tablo zaten mevcut');
      } else {
        throw err;
      }
    }

    // commission_withdrawal_requests tablosu
    console.log('\n4️⃣ commission_withdrawal_requests tablosu oluşturuluyor...');
    try {
      await connection.query(`
        CREATE TABLE commission_withdrawal_requests (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
          bank_name VARCHAR(100),
          iban VARCHAR(34),
          account_holder_name VARCHAR(100),
          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP NULL,
          processed_by VARCHAR(36) NULL,
          rejection_reason TEXT,
          admin_notes TEXT,
          transfer_reference VARCHAR(100),
          transfer_date DATE,
          INDEX idx_user_withdrawals (user_id, requested_at DESC),
          INDEX idx_status (status, requested_at DESC),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ Başarılı');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('   ⚠️  Tablo zaten mevcut');
      } else {
        throw err;
      }
    }

    // site_settings tablosu
    console.log('\n5️⃣ site_settings tablosu oluşturuluyor...');
    try {
      await connection.query(`
        CREATE TABLE site_settings (
          id INT PRIMARY KEY AUTO_INCREMENT,
          setting_key VARCHAR(100) UNIQUE NOT NULL,
          setting_value TEXT NOT NULL,
          setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
          description TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          updated_by VARCHAR(36) NULL,
          FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ Başarılı');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('   ⚠️  Tablo zaten mevcut');
      } else {
        throw err;
      }
    }

    // Default settings
    console.log('\n6️⃣ Varsayılan ayarlar ekleniyor...');
    try {
      await connection.query(`
        INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
        ('commission_rate_listing_owner', '5.00', 'number', 'İlan sahibine verilen komisyon oranı (%)'),
        ('commission_rate_seller', '5.00', 'number', 'Teklif sahibine verilen komisyon oranı (%)'),
        ('commission_min_withdrawal', '100.00', 'number', 'Minimum çekim tutarı (TL)'),
        ('commission_max_withdrawal', '10000.00', 'number', 'Maksimum çekim tutarı (TL)'),
        ('commission_enabled', 'true', 'boolean', 'Komisyon sistemi aktif mi?')
      `);
      console.log('   ✅ Başarılı');
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log('   ⚠️  Ayarlar zaten mevcut');
      } else {
        throw err;
      }
    }

    console.log('\n✨ Komisyon sistemi başarıyla kuruldu!');
    console.log('\n📝 Sistem Özellikleri:');
    console.log('   - Sipariş tamamlandığında otomatik komisyon ödemesi (trigger ile)');
    console.log('   - İlan sahibi ve teklif sahibi komisyon kazanır');
    console.log('   - Varsayılan oran: %5 (her iki taraf için)');
    console.log('   - Minimum çekim: 100 TL');
    console.log('   - Maksimum çekim: 10,000 TL');
    console.log('\n⚠️  NOT: Trigger manuel olarak oluşturulmalı (MySQL Workbench ile)');

  } catch (error) {
    console.error('\n❌ Hata:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
}

setup();
