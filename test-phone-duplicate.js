// Test phone number duplication prevention
const https = require('https');

// Disable SSL verification for localhost testing
const agent = new https.Agent({
  rejectUnauthorized: false
});

const testPhoneValidation = async () => {
  const baseUrl = 'https://localhost:8787';
  
  try {
    // Test registration with a phone number
    const testUser = {
      email: 'test-phone@example.com',
      password: 'test123',
      firstName: 'Test',
      lastName: 'User',
      phone: '+905551234567' // Test phone number
    };
    
    console.log('🧪 Testing phone number duplicate validation...');
    console.log('📱 Test phone number:', testUser.phone);
    
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser),
      agent // Disable SSL verification
    });
    
    const result = await response.json();
    console.log('📊 Registration response:', result);
    
    if (result.success) {
      console.log('✅ First registration successful');
      
      // Now try to register again with the same phone number
      console.log('🔄 Attempting duplicate phone registration...');
      
      const duplicateUser = {
        email: 'different-email@example.com',
        password: 'test123',
        firstName: 'Different',
        lastName: 'User',
        phone: '+905551234567' // Same phone number
      };
      
      const duplicateResponse = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duplicateUser),
        agent // Disable SSL verification
      });
      
      const duplicateResult = await duplicateResponse.json();
      console.log('📊 Duplicate registration response:', duplicateResult);
      
      if (!duplicateResult.success && duplicateResult.error.includes('telefon numarası zaten kayıtlı')) {
        console.log('✅ Phone number duplication correctly prevented!');
      } else {
        console.log('❌ Phone number duplication was NOT prevented!');
      }
      
    } else {
      console.log('❌ First registration failed:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
};

testPhoneValidation();