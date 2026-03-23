import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'varmi_db'
};

async function testCommissionRatesQuery() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');
    
    console.log('🔍 Testing getCommissionRates query:');
    console.log('─'.repeat(80));
    
    const [rows] = await connection.query(
      `SELECT setting_key, setting_value 
       FROM site_settings 
       WHERE setting_key IN ('commission_rate_listing_owner', 'commission_rate_seller', 'commission_enabled')`
    );
    
    console.log('Raw query result:');
    console.log(rows);
    console.log('\n');
    
    // Simulate the logic in commissionService
    const rates = {
      listingOwnerRate: 5.0,
      sellerRate: 5.0,
      enabled: true
    };

    if (Array.isArray(rows) && rows.length > 0) {
      rows.forEach((setting) => {
        console.log(`Processing: ${setting.setting_key} = ${setting.setting_value}`);
        if (setting.setting_key === 'commission_rate_listing_owner') {
          rates.listingOwnerRate = parseFloat(setting.setting_value);
        } else if (setting.setting_key === 'commission_rate_seller') {
          rates.sellerRate = parseFloat(setting.setting_value);
        } else if (setting.setting_key === 'commission_enabled') {
          rates.enabled = setting.setting_value === 'true';
        }
      });
    }

    console.log('\n📊 Final rates object:');
    console.log(rates);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

testCommissionRatesQuery();
