/**
 * Destek Email Sistemi Test Script
 * asistan@varmii.com hesabına test maili gönderir
 */

import { sendEmail } from './src/services/emailService.js';

async function testSupportEmail() {
  console.log('📧 Destek email sistemi test ediliyor...\n');

  try {
    // Test email gönder
    await sendEmail({
      to: 'asistan@varmii.com',
      subject: '🧪 Test - Destek Sistemi Çalışıyor',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                margin-top: 20px;
              }
              .success {
                background: #10b981;
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎯 Destek Sistemi Test</h1>
            </div>
            
            <div class="content">
              <div class="success">
                ✅ Email sistemi başarıyla çalışıyor!
              </div>
              
              <h2>Test Bilgileri:</h2>
              <ul>
                <li><strong>Gönderim Zamanı:</strong> ${new Date().toLocaleString('tr-TR')}</li>
                <li><strong>Hedef:</strong> asistan@varmii.com</li>
                <li><strong>Durum:</strong> Başarılı</li>
              </ul>
              
              <p>Bu bir test mesajıdır. Destek sistemi doğru şekilde yapılandırılmış ve çalışmaktadır.</p>
              
              <h3>Sonraki Adımlar:</h3>
              <ol>
                <li>Webmail'e giriş yapın (http://localhost/webmail)</li>
                <li>asistan@varmii.com hesabını kontrol edin</li>
                <li>Bu test mesajını görmelisiniz</li>
              </ol>
            </div>
          </body>
        </html>
      `,
      text: `
TEST - Destek Sistemi Çalışıyor

✅ Email sistemi başarıyla çalışıyor!

Test Bilgileri:
- Gönderim Zamanı: ${new Date().toLocaleString('tr-TR')}
- Hedef: asistan@varmii.com
- Durum: Başarılı

Bu bir test mesajıdır. Destek sistemi doğru şekilde yapılandırılmış ve çalışmaktadır.

Sonraki Adımlar:
1. Webmail'e giriş yapın (http://localhost/webmail)
2. asistan@varmii.com hesabını kontrol edin
3. Bu test mesajını görmelisiniz
      `
    });

    console.log('✅ Test emaili başarıyla gönderildi!');
    console.log('\n📬 Kontrol Adımları:');
    console.log('1. Webmail: http://localhost/webmail');
    console.log('2. Email: asistan@varmii.com');
    console.log('3. Şifre: [.env dosyasındaki SMTP_PASS]');
    console.log('\n💡 Test mesajını asistan@varmii.com gelen kutusunda göreceksiniz.\n');

  } catch (error) {
    console.error('\n❌ Email gönderimi başarısız:', error.message);
    console.error('\n🔧 Olası Sorunlar:');
    console.error('1. hMailServer servisi çalışmıyor mu?');
    console.error('2. SMTP ayarları doğru mu? (.env dosyasını kontrol edin)');
    console.error('3. asistan@varmii.com hesabı oluşturulmuş mu?');
    console.error('\nDetaylı hata:', error);
    process.exit(1);
  }
}

// Test çalıştır
testSupportEmail();
