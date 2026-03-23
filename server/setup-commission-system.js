/**
 * Komisyon Sistemi Database Setup Script
 * Bu script komisyon sistemini database'e kurar
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query } from './src/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupCommissionSystem() {
  try {
    console.log('🚀 Komisyon sistemi kurulumu başlıyor...\n');

    // SQL dosyasını oku
    const sqlPath = join(__dirname, '../create_commission_system.sql');
    let sqlContent = readFileSync(sqlPath, 'utf8');

    // DELIMITER komutlarını ve trigger'ı manual olarak handle edelim
    // Önce normal SQL'leri çalıştır
    const statements = sqlContent
      .split('-- ============================================')
      .filter(section => !section.includes('DELIMITER') && !section.includes('CREATE TRIGGER'))
      .join('')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== 'USE varmicom_db');

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (statement.includes('SELECT') && statement.includes('Status')) {
        // Skip SELECT statements
        continue;
      }

      try {
        await query(statement);
        successCount++;
        
        if (statement.includes('ALTER TABLE users')) {
          console.log('✅ users tablosuna komisyon alanları eklendi');
        } else if (statement.includes('ALTER TABLE orders')) {
          console.log('✅ orders tablosuna komisyon alanları eklendi');
        } else if (statement.includes('CREATE TABLE') && statement.includes('commission_transactions')) {
          console.log('✅ commission_transactions tablosu oluşturuldu');
        } else if (statement.includes('CREATE TABLE') && statement.includes('commission_withdrawal_requests')) {
          console.log('✅ commission_withdrawal_requests tablosu oluşturuldu');
        } else if (statement.includes('CREATE TABLE') && statement.includes('site_settings')) {
          console.log('✅ site_settings tablosu oluşturuldu');
        } else if (statement.includes('INSERT INTO site_settings')) {
          console.log('✅ Varsayılan komisyon ayarları eklendi');
        } else if (statement.includes('CREATE OR REPLACE VIEW')) {
          console.log('✅ commission_stats view oluşturuldu');
        }
      } catch (error) {
        // Duplicate column/table hatalarını ignore et
        if (
          error.message.includes('Duplicate column') ||
          error.message.includes('already exists') ||
          error.message.includes('Duplicate entry')
        ) {
          console.log(`⚠️  Zaten mevcut: ${statement.substring(0, 50)}...`);
        } else {
          console.error(`❌ Hata:`, error.message);
          console.error(`   Statement: ${statement.substring(0, 100)}...`);
          errorCount++;
        }
      }
    }

    // Trigger'ı ayrı olarak oluştur
    try {
      const triggerSQL = `
        CREATE TRIGGER after_order_completed
        AFTER UPDATE ON orders
        FOR EACH ROW
        BEGIN
            IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.commission_paid = FALSE THEN
                IF NEW.buyer_id != (SELECT buyer_id FROM listings WHERE id = NEW.listing_id) THEN
                    UPDATE users 
                    SET 
                        commission_balance = commission_balance + NEW.commission_to_listing_owner,
                        total_commission_earned = total_commission_earned + NEW.commission_to_listing_owner
                    WHERE id = (SELECT buyer_id FROM listings WHERE id = NEW.listing_id);
                    
                    INSERT INTO commission_transactions (user_id, order_id, transaction_type, amount, description)
                    VALUES (
                        (SELECT buyer_id FROM listings WHERE id = NEW.listing_id),
                        NEW.id,
                        'earned',
                        NEW.commission_to_listing_owner,
                        CONCAT('İlan komisyonu - Sipariş #', NEW.id)
                    );
                END IF;
                
                IF NEW.seller_id != NEW.buyer_id THEN
                    UPDATE users 
                    SET 
                        commission_balance = commission_balance + NEW.commission_to_seller,
                        total_commission_earned = total_commission_earned + NEW.commission_to_seller
                    WHERE id = NEW.seller_id;
                    
                    INSERT INTO commission_transactions (user_id, order_id, transaction_type, amount, description)
                    VALUES (
                        NEW.seller_id,
                        NEW.id,
                        'earned',
                        NEW.commission_to_seller,
                        CONCAT('Teklif komisyonu - Sipariş #', NEW.id)
                    );
                END IF;
                
                UPDATE orders 
                SET 
                    commission_paid = TRUE,
                    commission_paid_at = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
            END IF;
        END
      `;

      await query(triggerSQL);
      console.log('✅ after_order_completed trigger oluşturuldu');
      successCount++;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Trigger zaten mevcut');
      } else {
        console.error('❌ Trigger oluşturma hatası:', error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Özet:`);
    console.log(`   ✅ Başarılı: ${successCount}`);
    console.log(`   ❌ Hata: ${errorCount}`);
    console.log(`\n✨ Komisyon sistemi kurulumu tamamlandı!`);
    console.log(`\n📝 Sistem Özellikleri:`);
    console.log(`   - Sipariş tamamlandığında otomatik komisyon ödemesi`);
    console.log(`   - İlan sahibi ve teklif sahibi komisyon kazanır`);
    console.log(`   - Varsayılan oran: %5 (her iki taraf için)`);
    console.log(`   - Minimum çekim: 100 TL`);
    console.log(`   - Maksimum çekim: 10,000 TL`);

  } catch (error) {
    console.error('❌ Kurulum hatası:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run setup
setupCommissionSystem();
