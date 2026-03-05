/**
 * Support/Contact API Routes
 * 
 * Endpoints:
 * - POST /api/support/contact - Destek talebi gönder (veritabanına kaydedilir)
 */

import express, { Request, Response } from 'express';
import { sendEmail } from '../services/emailService.js';
import { query } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/support/contact
 * Destek talebi veya soru gönder - Veritabanına kaydedilir, admin panelde görünür
 */
router.post('/contact', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, message, category } = req.body;

    // Validasyon
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Ad, e-posta ve mesaj alanları zorunludur'
      });
    }

    // Email validasyonu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir e-posta adresi giriniz'
      });
    }

    console.log('📧 Support request received:', {
      name,
      email,
      category,
      subject
    });

    // Veritabanına kaydet
    const ticketId = uuidv4();
    const userId = (req as any).userId || null; // Giriş yapmış kullanıcı varsa

    await query(
      `INSERT INTO support_tickets (id, user_id, name, email, phone, category, subject, message, status, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 'medium')`,
      [ticketId, userId, name, email, phone || null, category || 'genel', subject || '', message]
    );

    console.log('✅ Support ticket saved to database:', ticketId);

    // Kullanıcıya otomatik yanıt gönder (Admin panelde görünecek)
    const userConfirmationHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              background: white;
              padding: 40px;
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 10px 10px;
            }
            .success-icon {
              text-align: center;
              font-size: 60px;
              margin: 20px 0;
            }
            .message {
              font-size: 16px;
              line-height: 1.8;
              color: #4b5563;
            }
            .info-box {
              background: #f0fdf4;
              border-left: 4px solid #22c55e;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .contact-info {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Talebiniz Alındı</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Teşekkür ederiz!</p>
          </div>
          
          <div class="content">
            <div class="success-icon">🎉</div>
            
            <div class="message">
              <p>Merhaba <strong>${name}</strong>,</p>
              
              <p>Destek talebiniz başarıyla alınmıştır. Profesyonel destek ekibimiz en kısa sürede size geri dönüş yapacaktır.</p>
              
              <div class="info-box">
                <strong>📋 Talebinizin Detayları:</strong><br>
                <strong>Talep No:</strong> ${ticketId.substring(0, 8).toUpperCase()}<br>
                <strong>Kategori:</strong> ${category || 'Genel'}<br>
                ${subject ? `<strong>Konu:</strong> ${subject}<br>` : ''}
                <strong>Gönderim:</strong> ${new Date().toLocaleString('tr-TR')}
              </div>
              
              <p><strong>Ne kadar sürer?</strong><br>
              Genellikle 24 saat içinde size dönüş yapıyoruz. Acil durumlar için daha hızlı yanıt verebiliriz.</p>
              
              <div class="contact-info">
                <strong>📞 Bizimle İletişim:</strong><br>
                E-posta: <a href="mailto:asistan@varmii.com" style="color: #667eea;">asistan@varmii.com</a><br>
                Web: <a href="https://varmii.com" style="color: #667eea;">www.varmii.com</a>
              </div>
              
              <p style="margin-top: 30px;">
                <a href="https://varmii.com" class="button">Siteye Dön</a>
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Varmı.com</strong> - Size daha iyi hizmet vermek için buradayız</p>
            <p style="margin: 5px 0 0 0;">© 2025 Tüm hakları saklıdır.</p>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject: '✅ Destek Talebiniz Alındı - Varmı.com',
      html: userConfirmationHtml
    });

    console.log('✅ Confirmation email sent to user');

    res.json({
      success: true,
      message: 'Destek talebiniz başarıyla alındı. En kısa sürede size dönüş yapılacaktır.',
      ticketId
    });

  } catch (error) {
    console.error('❌ Support request error:', error);
    res.status(500).json({
      success: false,
      error: 'Destek talebi gönderilemedi. Lütfen daha sonra tekrar deneyiniz.'
    });
  }
});

export default router;
