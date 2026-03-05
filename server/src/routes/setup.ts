import express from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query } from '../database.js';

const router = express.Router();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Setup orders database endpoint
router.post('/setup', async (req, res) => {
  try {
    console.log('🔧 Setting up orders database...');
    
    // Read SQL file
    const sqlFilePath = join(__dirname, '../../setup_orders.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Executing ${statements.length} SQL statements...`);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await query(statement);
          console.log('✅ Statement executed successfully');
        } catch (error: any) {
          console.log('⚠️ Statement skipped (might already exist):', error.message);
        }
      }
    }
    
    console.log('🎉 Orders database setup complete!');
    res.json({ 
      success: true, 
      message: 'Orders database setup completed successfully!' 
    });
    
  } catch (error: any) {
    console.error('❌ Setup error:', error);
    res.status(500).json({ 
      error: 'Database setup failed', 
      details: error.message 
    });
  }
});

export default router;