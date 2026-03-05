// MySQL Database Connection
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Environment variables'ı yükle - .env dosyasının mutlak yolunu belirle
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varmi_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 100, // 10x artırıldı - high-traffic için
  queueLimit: 0,
  maxIdle: 10, // Max idle connections
  idleTimeout: 60000, // 60 seconds
  charset: 'utf8mb4',
  connectTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

logger.debug('🔧 Database Configuration Debug:');
logger.debug('DB_HOST:', process.env.DB_HOST);
logger.debug('DB_PORT:', process.env.DB_PORT);
logger.debug('DB_PORT parsed:', parseInt(process.env.DB_PORT || '3306'));
logger.debug('Final dbConfig.port:', dbConfig.port);

// Connection pool oluştur
export const pool = mysql.createPool(dbConfig);

// Bağlantıyı test et
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('✅ MySQL bağlantısı başarılı!');
    connection.release();
    return true;
  } catch (error) {
    logger.error('❌ MySQL bağlantı hatası:', error);
    return false;
  }
}

// Helper function - SQL query runner
export async function query(sql: string, params?: any[]) {
  try {
    // Ensure params is always an array
    const queryParams = params || [];
    const [results] = await pool.execute(sql, queryParams);
    return results;
  } catch (error) {
    logger.error('SQL Query Error:', error);
    throw error;
  }
}

export default pool;