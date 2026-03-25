import nodemailer from 'nodemailer';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';

// Helper function to create notification
async function createNotification(userId: string, type: string, title: string, message: string, data?: any) {
  try {
    const notificationId = uuidv4();
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())`,
      [notificationId, userId, type, title, message, data ? JSON.stringify(data) : null]
    );
    console.log('🔔 Notification created:', { userId, type, title });
  } catch (error) {
    console.error('❌ Error creating notification:', error);
  }
}

// Debug SMTP configuration
console.log('📧 SMTP Configuration Debug:');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
console.log('SMTP_FROM:', process.env.SMTP_FROM);

// Production SMTP Configuration (cPanel)
const isLocalDev = process.env.NODE_ENV === 'development' && (process.env.SMTP_HOST === 'localhost' || process.env.SMTP_HOST === '127.0.0.1');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'cp13.servername.co',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    } : undefined,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 10,
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
    debug: isLocalDev // Debug only in local development
});

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
};

// Generic sendEmail function
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  const startTime = Date.now();
  console.log('📧 Sending email to:', options.to);

  try {
    const info = await transporter.sendMail({
      from: options.from || process.env.SMTP_FROM || 'noreply@varmii.com.tr',
      to: options.to,
      subject: options.subject,
      html: options.html
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Email sent successfully in ${elapsed}ms:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Email error after ${elapsed}ms:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendVerificationEmail(email: string, confirmationUrl: string, name?: string) {
    const startTime = Date.now();
    console.log('📧 Starting verification email to:', email);
    console.log('🔗 Verification URL:', confirmationUrl);
    console.log('👤 Name:', name);
    
    try {
        // Test SMTP connection first
        console.log('🔌 Testing Mercury Mail SMTP connection...');
        await transporter.verify();
        console.log('✅ Mercury Mail SMTP connection verified successfully');
        
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: email,
            subject: 'Varmii Hesap Doğrulama',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #007bff; margin: 0; font-size: 28px;">Varmii</h1>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Güvenilir Alışveriş Platformu</p>
                        </div>
                        
                        <h2 style="color: #333; text-align: center; margin-bottom: 25px; font-size: 24px;">
                            Hoş Geldiniz${name ? `, ${name}` : ''}!
                        </h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
                            Varmii hesabınızı aktifleştirmek için aşağıdaki butona tıklayın:
                        </p>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${confirmationUrl}" 
                               style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                                      color: white; 
                                      padding: 15px 40px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(0,123,255,0.3);
                                      transition: all 0.3s ease;">
                                Hesabımı Doğrula
                            </a>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #007bff;">
                            <h3 style="color: #333; margin-top: 0; font-size: 18px;">Neler Yapabilirsiniz:</h3>
                            <ul style="color: #666; margin: 10px 0; padding-left: 20px; line-height: 1.6;">
                                <li>İlan oluşturun ve ürünlerinizi satın</li>
                                <li>Binlerce ürün arasından alışveriş yapın</li>
                                <li>Güvenli ödeme sistemi ile alışveriş edin</li>
                                <li>Anlık bildirimler alın</li>
                            </ul>
                        </div>
                        
                        <p style="color: #888; font-size: 14px; margin-top: 30px; text-align: center;">
                            Bu link 24 saat geçerlidir. Eğer bu e-postayı siz talep etmediyseniz, lütfen dikkate almayın.
                        </p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                Bu e-posta <strong>noreply@varmii.com</strong> adresinden gönderilmiştir.
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                © 2024 Varmii - Tüm hakları saklıdır.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        const duration = Date.now() - startTime;
        console.log('Verification email sent in', duration, 'ms to:', email);
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('Verification email failed after', duration, 'ms to:', email, error);
        throw error;
    }
}

export async function sendEmailChangeVerificationEmail(email: string, confirmationUrl: string, name?: string) {
    const startTime = Date.now();
    console.log('Starting email change verification to:', email);
    
    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: email,
            subject: '📧 Varmii E-posta Değişikliği Doğrulama',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #28a745; margin: 0; font-size: 28px;">📧 Varmii</h1>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">E-posta Değişikliği</p>
                        </div>
                        
                        <h2 style="color: #333; text-align: center; margin-bottom: 25px; font-size: 24px;">
                            E-posta Adresinizi Güncelleyin
                        </h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
                            ${name ? `Merhaba ${name}, ` : 'Merhaba! '}Varmii hesabınızın e-posta adresini bu adrese değiştirmek için aşağıdaki butona tıklayın:
                        </p>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${confirmationUrl}" 
                               style="background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); 
                                      color: white; 
                                      padding: 15px 40px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(40,167,69,0.3);
                                      transition: all 0.3s ease;">
                                ✅ E-posta Değişikliğini Onayla
                            </a>
                        </div>
                        
                        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
                            <h3 style="color: #856404; margin-top: 0; font-size: 18px;">🔒 Güvenlik Uyarısı:</h3>
                            <p style="color: #856404; margin: 0; line-height: 1.6;">
                                Eğer bu değişikliği siz talep etmediyseniz, derhal hesabınızı kontrol edin ve şifrenizi değiştirin.
                            </p>
                        </div>
                        
                        <p style="color: #888; font-size: 14px; margin-top: 30px; text-align: center;">
                            Bu link 24 saat geçerlidir ve sadece bir kez kullanılabilir.
                        </p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                Bu e-posta <strong>noreply@varmii.com</strong> adresinden gönderilmiştir.
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                © 2024 Varmii - Tüm hakları saklıdır.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        const duration = Date.now() - startTime;
        console.log('Email change verification sent in', duration, 'ms to:', email);
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('Email change verification failed after', duration, 'ms to:', email, error);
        throw error;
    }
}

export async function sendListingCreatedNotification(userId: number, listingTitle: string, listingId: number) {
    const startTime = Date.now();
    console.log('Starting listing created notification for user:', userId, 'listing:', listingId);
    
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT email, firstName, lastName FROM users WHERE id = ?',
            [userId]
        );
        await connection.end();

        const users = rows as any[];
        if (users.length === 0) {
            console.log('User not found for listing notification:', userId);
            return;
        }

        const user = users[0];
        const listingUrl = (process.env.FRONTEND_URL || 'https://varmii.com') + '/listing/' + listingId;

        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: user.email,
            subject: 'İlanınız Başarıyla Oluşturuldu!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #007bff; margin: 0; font-size: 28px;">Varmii</h1>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">İlan Yönetim Sistemi</p>
                        </div>
                        
                        <h2 style="color: #333; text-align: center; margin-bottom: 25px; font-size: 24px;">
                            İlanınız Yayında!
                        </h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                            Merhaba <strong>${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Değerli Kullanıcı'}</strong>,
                        </p>
                        
                        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
                            <h3 style="color: #333; margin-top: 0; font-size: 18px;">İlan Detayları:</h3>
                            <p style="color: #666; margin: 10px 0; font-size: 16px;">
                                <strong>"${listingTitle}"</strong> başlıklı ilanınız başarıyla oluşturuldu ve artık Varmii'de yayında!
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${listingUrl}" 
                               style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                                      color: white; 
                                      padding: 15px 40px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(0,123,255,0.3);
                                      transition: all 0.3s ease;">
                                İlanımı Görüntüle
                            </a>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <h3 style="color: #333; margin-top: 0; font-size: 18px;">İpuçları:</h3>
                            <ul style="color: #666; margin: 0; padding-left: 20px; line-height: 1.8;">
                                <li>İlanınızı sosyal medyada paylaşarak daha fazla kişiye ulaşın</li>
                                <li>Kaliteli fotoğraflar kullanarak dikkat çekin</li>
                                <li>Gelen teklifleri hızlıca yanıtlayarak satış şansınızı artırın</li>
                                <li>Ürün açıklamalarınızı detaylı ve net yazın</li>
                            </ul>
                        </div>
                        
                        <p style="color: #28a745; font-size: 16px; text-align: center; font-weight: bold; margin: 30px 0;">
                            İyi satışlar dileriz!
                        </p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                Bu e-posta <strong>noreply@varmii.com</strong> adresinden gönderilmiştir.
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                © 2024 Varmii - Tüm hakları saklıdır.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        
        // Create notification for user
        await createNotification(
            String(userId),
            'listing_created',
            'İlanınız Oluşturuldu!',
            `"${listingTitle}" başlıklı ilanınız başarıyla oluşturuldu ve yayında.`,
            { listingId, listingTitle }
        );
        
        const duration = Date.now() - startTime;
        console.log('Listing created notification sent in', duration, 'ms to:', user.email);
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('Listing created notification failed after', duration, 'ms for user:', userId, error);
        throw error;
    }
}

export async function sendOfferNotification(sellerId: number, buyerName: string, offerAmount: number, itemTitle: string, listingId: number) {
    const startTime = Date.now();
    console.log('Starting offer notification for seller:', sellerId, 'listing:', listingId);
    
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT email, firstName, lastName FROM users WHERE id = ?',
            [sellerId]
        );
        await connection.end();

        const users = rows as any[];
        if (users.length === 0) {
            console.log('Seller not found for offer notification:', sellerId);
            return;
        }

        const seller = users[0];
        const listingUrl = (process.env.FRONTEND_URL || 'https://varmii.com') + '/listing/' + listingId;

        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: seller.email,
            subject: 'İlanınıza Yeni Teklif Geldi!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #28a745; margin: 0; font-size: 28px;">Varmii</h1>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Teklif Bildirimi</p>
                        </div>
                        
                        <h2 style="color: #333; text-align: center; margin-bottom: 25px; font-size: 24px;">
                            Yeni Teklif Aldınız!
                        </h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                            Merhaba <strong>${seller.firstName && seller.lastName ? `${seller.firstName} ${seller.lastName}` : 'Değerli Satıcı'}</strong>,
                        </p>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            İlanınıza yeni bir teklif geldi! Detayları aşağıda görebilirsiniz:
                        </p>
                        
                        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
                            <h3 style="color: #333; margin-top: 0; font-size: 18px;">📋 Teklif Detayları:</h3>
                            <p style="color: #666; margin: 8px 0;"><strong>İlan:</strong> ${itemTitle}</p>
                            <p style="color: #666; margin: 8px 0;"><strong>Teklif Veren:</strong> ${buyerName}</p>
                            <p style="color: #666; margin: 8px 0;">
                                <strong>Teklif Miktarı:</strong> 
                                <span style="color: #28a745; font-size: 20px; font-weight: bold;">${offerAmount} TL</span>
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${listingUrl}" 
                               style="background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); 
                                      color: white; 
                                      padding: 15px 40px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(40,167,69,0.3);
                                      transition: all 0.3s ease;">
                                👁️ Teklifi Görüntüle ve Yanıtla
                            </a>
                        </div>
                        
                        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
                            <h3 style="color: #856404; margin-top: 0; font-size: 18px;">💡 Hızlı İpucu:</h3>
                            <p style="color: #856404; margin: 0; line-height: 1.6;">
                                Teklife hızlıca yanıt vererek satış şansınızı artırabilir ve alıcıyla iletişim kurabilirsiniz!
                            </p>
                        </div>
                        
                        <p style="color: #28a745; font-size: 16px; text-align: center; font-weight: bold; margin: 30px 0;">
                            Başarılı satışlar dileriz! 🎉
                        </p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                Bu e-posta <strong>noreply@varmii.com</strong> adresinden gönderilmiştir.
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                © 2024 Varmii - Tüm hakları saklıdır.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        
        // Create notification for seller
        await createNotification(
            String(sellerId),
            'new_offer',
            'Yeni Teklif Aldınız!',
            `"${itemTitle}" ilanınıza ${buyerName} tarafından ${offerAmount} TL teklif geldi.`,
            { listingId, offerAmount, buyerName, itemTitle }
        );
        
        const duration = Date.now() - startTime;
        console.log('Offer notification sent in', duration, 'ms to:', seller.email);
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('Offer notification failed after', duration, 'ms for seller:', sellerId, error);
        throw error;
    }
}

export async function sendPurchaseNotification(buyerId: number, sellerId: number, itemTitle: string, purchaseAmount: number, listingId: number) {
    const startTime = Date.now();
    console.log('Starting purchase notifications for buyer:', buyerId, 'seller:', sellerId, 'listing:', listingId);
    
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [buyerRows] = await connection.execute(
            'SELECT email, firstName, lastName FROM users WHERE id = ?',
            [buyerId]
        );
        const [sellerRows] = await connection.execute(
            'SELECT email, firstName, lastName FROM users WHERE id = ?',
            [sellerId]
        );
        await connection.end();

        const buyers = buyerRows as any[];
        const sellers = sellerRows as any[];

        if (buyers.length === 0 || sellers.length === 0) {
            console.log('User not found for purchase notification - Buyer:', buyers.length, 'Seller:', sellers.length);
            return;
        }

        const buyer = buyers[0];
        const seller = sellers[0];
        const listingUrl = (process.env.FRONTEND_URL || 'https://varmii.com') + '/listing/' + listingId;

        // Send notification to buyer
        const buyerMailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: buyer.email,
            subject: '✅ Satın Alma İşleminiz Tamamlandı!',
            encoding: 'utf-8',
            headers: {
                'Content-Type': 'text/html; charset=utf-8'
            },
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #007bff; margin: 0; font-size: 28px;">🛍️ Varmii</h1>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Satın Alma Onayı</p>
                        </div>
                        
                        <h2 style="color: #333; text-align: center; margin-bottom: 25px; font-size: 24px;">
                            ✅ Satın Alma Başarılı!
                        </h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                            Merhaba <strong>${buyer.name || 'Değerli Alıcı'}</strong>,
                        </p>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            Satın alma işleminiz başarıyla tamamlandı! İşlem detayları aşağıdadır:
                        </p>
                        
                        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #007bff;">
                            <h3 style="color: #333; margin-top: 0; font-size: 18px;">📦 Satın Aldığınız Ürün:</h3>
                            <p style="color: #666; margin: 8px 0;"><strong>Ürün:</strong> ${itemTitle}</p>
                            <p style="color: #666; margin: 8px 0;"><strong>Satıcı:</strong> ${seller.firstName && seller.lastName ? `${seller.firstName} ${seller.lastName}` : 'Satıcı'}</p>
                            <p style="color: #666; margin: 8px 0;">
                                <strong>Ödediğiniz Tutar:</strong> 
                                <span style="color: #007bff; font-size: 20px; font-weight: bold;">${purchaseAmount} TL</span>
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${listingUrl}" 
                               style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                                      color: white; 
                                      padding: 15px 40px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(0,123,255,0.3);
                                      transition: all 0.3s ease;">
                                🔍 İşlem Detaylarını Görüntüle
                            </a>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <h3 style="color: #333; margin-top: 0; font-size: 18px;">📋 Sonraki Adımlar:</h3>
                            <ul style="color: #666; margin: 0; padding-left: 20px; line-height: 1.8;">
                                <li>Satıcı ile iletişime geçerek teslimat detaylarını konuşabilirsiniz</li>
                                <li>Ürünü aldıktan sonra değerlendirme yapabilirsiniz</li>
                                <li>Herhangi bir sorun yaşarsanız destek ekibimize ulaşın</li>
                            </ul>
                        </div>
                        
                        <p style="color: #007bff; font-size: 16px; text-align: center; font-weight: bold; margin: 30px 0;">
                            İyi alışverişler dileriz! 🛒✨
                        </p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                Bu e-posta <strong>noreply@varmii.com</strong> adresinden gönderilmiştir.
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                © 2024 Varmii - Tüm hakları saklıdır.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        // Send notification to seller
        const sellerMailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: seller.email,
            subject: '🎉 Ürününüz Satıldı!',
            encoding: 'utf-8',
            headers: {
                'Content-Type': 'text/html; charset=utf-8'
            },
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #ffc107; margin: 0; font-size: 28px;">💰 Varmii</h1>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Satış Onayı</p>
                        </div>
                        
                        <h2 style="color: #333; text-align: center; margin-bottom: 25px; font-size: 24px;">
                            🎉 Tebrikler! Satış Gerçekleşti!
                        </h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                            Merhaba <strong>${seller.firstName && seller.lastName ? `${seller.firstName} ${seller.lastName}` : 'Değerli Satıcı'}</strong>,
                        </p>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            Harika haber! Ürününüz satıldı. İşlem detayları aşağıdadır:
                        </p>
                        
                        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
                            <h3 style="color: #333; margin-top: 0; font-size: 18px;">💵 Satış Detayları:</h3>
                            <p style="color: #666; margin: 8px 0;"><strong>Satılan Ürün:</strong> ${itemTitle}</p>
                            <p style="color: #666; margin: 8px 0;"><strong>Alıcı:</strong> ${buyer.name}</p>
                            <p style="color: #666; margin: 8px 0;">
                                <strong>Satış Tutarı:</strong> 
                                <span style="color: #ffc107; font-size: 20px; font-weight: bold;">${purchaseAmount} TL</span>
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${listingUrl}" 
                               style="background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%); 
                                      color: #333; 
                                      padding: 15px 40px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(255,193,7,0.3);
                                      transition: all 0.3s ease;">
                                🔍 İşlem Detaylarını Görüntüle
                            </a>
                        </div>
                        
                        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
                            <h3 style="color: #155724; margin-top: 0; font-size: 18px;">📋 Sonraki Adımlar:</h3>
                            <ul style="color: #155724; margin: 0; padding-left: 20px; line-height: 1.8;">
                                <li>Alıcı ile iletişime geçerek teslimat detaylarını organize edin</li>
                                <li>Ürünü güvenli şekilde paketleyip gönderin</li>
                                <li>Teslimat sonrası alıcıdan geri bildirim alın</li>
                                <li>Kazancınızı kontrol edin ve yeni ilanlar oluşturun</li>
                            </ul>
                        </div>
                        
                        <p style="color: #ffc107; font-size: 16px; text-align: center; font-weight: bold; margin: 30px 0;">
                            Başarılı satışınız için tebrikler! 🎊💰
                        </p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                Bu e-posta <strong>noreply@varmii.com</strong> adresinden gönderilmiştir.
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                © 2024 Varmii - Tüm hakları saklıdır.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const [buyerResult, sellerResult] = await Promise.all([
            transporter.sendMail(buyerMailOptions),
            transporter.sendMail(sellerMailOptions),
            // Create notifications for both buyer and seller
            createNotification(
                String(buyerId),
                'order_created',
                'Satın Alma Başarılı!',
                `${itemTitle} ürününü başarıyla satın aldınız. Toplam tutar: ${purchaseAmount} TL`,
                { listingId, amount: purchaseAmount }
            ),
            createNotification(
                String(sellerId),
                'order_created',
                'Ürününüz Satıldı!',
                `${itemTitle} ürününüz satıldı. Satış tutarı: ${purchaseAmount} TL`,
                { listingId, amount: purchaseAmount }
            )
        ]);

        const duration = Date.now() - startTime;
        console.log('Purchase notifications sent in', duration, 'ms - Buyer:', buyer.email, 'Seller:', seller.email);
        return { buyerResult, sellerResult };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('Purchase notifications failed after', duration, 'ms for buyer:', buyerId, 'seller:', sellerId, error);
        throw error;
    }
}

// Send order status change email notification
export async function sendOrderStatusChangeEmail(
    userEmail: string, 
    userName: string, 
    orderNumber: string, 
    newStatus: string, 
    previousStatus: string,
    userId?: string,
    trackingNumber?: string,
    carrierCompany?: string,
    estimatedDelivery?: string
) {
    const startTime = Date.now();
    console.log('Starting order status change email to:', userEmail);
    
    try {
        const statusMessages = {
            'preparing': {
                title: '📦 Siparişiniz Hazırlanıyor',
                message: 'Satıcı siparişinizi işleme aldı ve hazırlamaya başladı.',
                color: '#f59e0b'
            },
            'shipped': {
                title: '🚚 Siparişiniz Kargoya Verildi',
                message: 'Siparişiniz kargoya verildi ve size doğru yola çıktı.',
                color: '#10b981'
            },
            'delivered': {
                title: '✅ Siparişiniz Teslim Edildi',
                message: 'Siparişiniz başarıyla teslim edilmiştir.',
                color: '#059669'
            },
            'completed': {
                title: '🎉 Sipariş İşlemi Tamamlandı',
                message: 'Sipariş süreciniz başarıyla tamamlanmıştır.',
                color: '#059669'
            }
        };

        const statusConfig = statusMessages[newStatus as keyof typeof statusMessages] || {
            title: '📋 Sipariş Durumu Güncellendi',
            message: `Sipariş durumunuz ${newStatus} olarak güncellendi.`,
            color: '#6b7280'
        };

        let trackingInfo = '';
        if (trackingNumber && carrierCompany) {
            trackingInfo = `
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="color: #374151; margin: 0 0 10px 0;">📦 Kargo Bilgileri</h4>
                    <p style="color: #6b7280; margin: 5px 0;"><strong>Kargo Firması:</strong> ${carrierCompany}</p>
                    <p style="color: #6b7280; margin: 5px 0;"><strong>Takip Numarası:</strong> ${trackingNumber}</p>
                    ${estimatedDelivery ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Tahmini Teslimat:</strong> ${estimatedDelivery}</p>` : ''}
                </div>
            `;
        }

        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: userEmail,
            subject: `${statusConfig.title} - Sipariş #${orderNumber}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #007bff; margin: 0; font-size: 28px;">🛍️ Varmii</h1>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Güvenilir Alışveriş Platformu</p>
                        </div>
                        
                        <h2 style="color: ${statusConfig.color}; text-align: center; margin-bottom: 25px; font-size: 24px;">
                            ${statusConfig.title}
                        </h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            Merhaba ${userName},
                        </p>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            <strong>Sipariş #${orderNumber}</strong> durumunuz güncellendi:
                        </p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${statusConfig.color};">
                            <p style="color: #333; margin: 0; font-size: 16px; font-weight: 500;">
                                ${statusConfig.message}
                            </p>
                        </div>
                        
                        ${trackingInfo}
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="https://varmii.com/order/${orderNumber}" 
                               style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                                      color: white; 
                                      padding: 15px 40px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(0,123,255,0.3);">
                                👁️ Siparişimi Görüntüle
                            </a>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                Bu e-posta <strong>noreply@varmii.com</strong> adresinden gönderilmiştir.
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                © 2024 Varmii - Tüm hakları saklıdır.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        
        // Create notification if userId is provided
        console.log('🔔 Creating notification with userId:', userId, 'type:', 'order_status_change');
        if (userId) {
            console.log('🔔 userId exists, calling createNotification...');
            await createNotification(
                userId,
                'order_status_change',
                statusConfig.title,
                statusConfig.message + ` - Sipariş #${orderNumber}`,
                { orderNumber, newStatus, previousStatus, trackingNumber, carrierCompany }
            );
            console.log('🔔 Notification created successfully');
        } else {
            console.log('⚠️ userId is not provided, skipping notification creation');
        }
        
        const duration = Date.now() - startTime;
        console.log('Order status change email sent in', duration, 'ms to:', userEmail);
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('Order status change email failed after', duration, 'ms for:', userEmail, error);
        throw error;
    }
}

// Email 2FA Do�rulama Kodu G�nderme
export async function send2FAEmailCode(email: string, code: string, name?: string) {
    const startTime = Date.now();
    console.log('Starting 2FA email code send to:', email);
    
    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: email,
            subject: 'Varmii 2FA Doğrulama Kodu',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #007bff; margin: 0; font-size: 28px;">Varmii</h1>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">İki Faktörlü Kimlik Doğrulama</p>
                        </div>
                        
                        <h2 style="color: #333; text-align: center; margin-bottom: 25px; font-size: 24px;">
                            Doğrulama Kodu
                        </h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
                            ${name ? `Merhaba ${name}, ` : 'Merhaba! '}Giriş yapabilmek için aşağıdaki 6 haneli kodu kullanın:
                        </p>
                        
                        <div style="text-align: center; margin: 35px 0; background-color: #f8f9fa; padding: 20px; border-radius: 10px; border: 2px dashed #007bff;">
                            <div style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                ${code}
                            </div>
                        </div>
                        
                        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #007bff;">
                            <h3 style="color: #1565c0; margin-top: 0; font-size: 18px;">🔒 Güvenlik Bilgisi:</h3>
                            <ul style="color: #1565c0; margin: 10px 0; padding-left: 20px; line-height: 1.6;">
                                <li>Bu kod 5 dakika geçerlidir</li>
                                <li>Kodu kimseyle paylaşmayın</li>
                                <li>Sadece Varmii giriş sayfasında kullanın</li>
                            </ul>
                        </div>
                        
                        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
                            <h3 style="color: #856404; margin-top: 0; font-size: 18px;">⚠️ Dikkat:</h3>
                            <p style="color: #856404; margin: 0; line-height: 1.6;">
                                Eğer bu girişi siz yapmadıysanız, hesabınızın güvenliği için derhal şifrenizi değiştirin.
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                Bu e-posta <strong>noreply@varmii.com</strong> adresinden gönderilmiştir.
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                © 2024 Varmii - Tüm hakları saklıdır.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        const duration = Date.now() - startTime;
        console.log('✅ 2FA email code sent in', duration, 'ms to:', email);
        console.log('📧 Email Details:', {
            messageId: result.messageId,
            response: result.response,
            accepted: result.accepted,
            rejected: result.rejected
        });
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('2FA email code failed after', duration, 'ms to:', email, error);
        throw error;
    }
}

export async function sendCustomEmail(
    email: string, 
    subject: string, 
    message: string, 
    name?: string
) {
    const startTime = Date.now();
    console.log('Starting custom email to:', email, 'Subject:', subject);
    
    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: email,
            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #007bff; margin: 0; font-size: 28px;">🛍️ Varmii</h1>
                            <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Yönetici Mesajı</p>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            ${name ? `<p style="margin: 0 0 15px 0; color: #333;">Merhaba <strong>${name}</strong>,</p>` : ''}
                            <div style="color: #333; line-height: 1.6; white-space: pre-wrap;">${message}</div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 14px; margin: 0;">
                                Bu email Varmii yönetimi tarafından gönderilmiştir.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        const duration = Date.now() - startTime;
        console.log('Custom email sent successfully after', duration, 'ms to:', email);
        console.log('Message ID:', info.messageId);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('Custom email failed after', duration, 'ms to:', email, error);
        throw error;
    }
}

// İlan onaylandı email bildirimi
export async function sendListingApprovedNotification(
    email: string,
    listingTitle: string,
    name?: string,
    userId?: string,
    listingId?: string
) {
    const startTime = Date.now();
    console.log('📧 Sending listing approved email to:', email);
    
    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: email,
            subject: 'İlanınız Onaylandı - Varmii',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #28a745; margin: 0; font-size: 28px;">İlan Onaylandı!</h1>
                            <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Varmii</p>
                        </div>
                        
                        <div style="background-color: #d4edda; padding: 20px; border-left: 4px solid #28a745; border-radius: 8px; margin: 20px 0;">
                            ${name ? `<p style="margin: 0 0 15px 0; color: #155724;">Merhaba <strong>${name}</strong>,</p>` : ''}
                            <p style="color: #155724; line-height: 1.6; margin: 0;">
                                "<strong>${listingTitle}</strong>" başlıklı ilanınız onaylandı ve artık yayında!
                            </p>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Ne yapabilirsiniz?</h3>
                            <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>İlanınız artık diğer kullanıcılar tarafından görüntülenebilir</li>
                                <li>Gelen teklifleri inceleyebilir ve kabul edebilirsiniz</li>
                                <li>İlanınızı istediğiniz zaman güncelleyebilirsiniz</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'https://varmii.com'}/dashboard" 
                               style="display: inline-block; padding: 15px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                İlanlarımı Görüntüle
                            </a>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 14px; margin: 0;">
                                Teşekkürler,<br>
                                <strong>Varmii Ekibi</strong>
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        // Create notification if userId is provided
        if (userId) {
            await createNotification(
                userId,
                'listing_approved',
                'İlanınız Onaylandı!',
                `"${listingTitle}" başlıklı ilanınız onaylandı ve artık yayında!`,
                { listingId, listingTitle }
            );
        }
        
        const duration = Date.now() - startTime;
        console.log('✅ Listing approved email sent successfully after', duration, 'ms');
        console.log('Message ID:', info.messageId);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ Listing approved email failed after', duration, 'ms:', error);
        throw error;
    }
}

// İlan reddedildi email bildirimi
export async function sendListingRejectedNotification(
    email: string,
    listingTitle: string,
    reason: string,
    name?: string,
    userId?: string,
    listingId?: string
) {
    const startTime = Date.now();
    console.log('📧 Sending listing rejected email to:', email);
    
    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: email,
            subject: 'İlanınız Reddedildi - Varmii',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #dc3545; margin: 0; font-size: 28px;">İlan Reddedildi</h1>
                            <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Varmii</p>
                        </div>
                        
                        <div style="background-color: #f8d7da; padding: 20px; border-left: 4px solid #dc3545; border-radius: 8px; margin: 20px 0;">
                            ${name ? `<p style="margin: 0 0 15px 0; color: #721c24;">Merhaba <strong>${name}</strong>,</p>` : ''}
                            <p style="color: #721c24; line-height: 1.6; margin: 0 0 15px 0;">
                                Üzgünüz, "<strong>${listingTitle}</strong>" başlıklı ilanınız yayına alınamadı.
                            </p>
                            <div style="background-color: white; padding: 15px; border-radius: 8px;">
                                <p style="margin: 0 0 5px 0; color: #721c24; font-weight: bold;">Sebep:</p>
                                <p style="margin: 0; color: #721c24; line-height: 1.6;">${reason}</p>
                            </div>
                        </div>
                        
                        <div style="background-color: #fff3cd; padding: 20px; border-left: 4px solid #ffc107; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 18px;">Ne yapabilirsiniz?</h3>
                            <ul style="color: #856404; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>İlanınızı düzenleyerek tekrar yayınlayabilirsiniz</li>
                                <li>Reddetme sebebini dikkate alarak gerekli değişiklikleri yapın</li>
                                <li>Sorularınız için destek ekibimizle iletişime geçebilirsiniz</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'https://varmii.com'}/dashboard" 
                               style="display: inline-block; padding: 15px 30px; background-color: #ffc107; color: #212529; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                İlanı Düzenle
                            </a>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 14px; margin: 0;">
                                Anlayışınız için teşekkürler,<br>
                                <strong>Varmii Ekibi</strong>
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        // Create notification if userId is provided
        if (userId) {
            await createNotification(
                userId,
                'listing_rejected',
                'İlanınız Reddedildi',
                `"${listingTitle}" başlıklı ilanınız reddedildi. Sebep: ${reason}`,
                { listingId, listingTitle, reason }
            );
        }
        
        const duration = Date.now() - startTime;
        console.log('✅ Listing rejected email sent successfully after', duration, 'ms');
        console.log('Message ID:', info.messageId);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ Listing rejected email failed after', duration, 'ms:', error);
        throw error;
    }
}

/**
 * Teklif sahibine teklif onaylandı bildirimi gönderir
 */
export async function sendOfferApprovedNotification(
    sellerId: string,
    listingTitle: string,
    offerAmount: number,
    listingId: string
): Promise<{ success: boolean; messageId?: string }> {
    const startTime = Date.now();
    console.log(`📧 Sending offer approved notification to seller ${sellerId}...`);

    try {
        // Get seller details
        const connection = await mysql.createConnection(dbConfig);
        const [sellers] = await connection.execute(
            'SELECT email, firstName, lastName FROM users WHERE id = ?',
            [sellerId]
        ) as any[];
        await connection.end();

        if (!sellers || sellers.length === 0) {
            console.error('❌ Seller not found:', sellerId);
            return { success: false };
        }

        const seller = sellers[0];
        const listingUrl = `${process.env.FRONTEND_URL || 'https://varmii.com'}/listing/${listingId}`;

        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: seller.email,
            subject: 'Teklifiniz Onaylandı!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #10b981; margin: 0; font-size: 28px;">Varmii</h1>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Teklif Onayı</p>
                        </div>
                        
                        <h2 style="color: #333; text-align: center; margin-bottom: 25px; font-size: 24px;">
                            Harika Haber! Teklifiniz Onaylandı!
                        </h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                            Merhaba <strong>${seller.firstName && seller.lastName ? `${seller.firstName} ${seller.lastName}` : 'Değerli Kullanıcı'}</strong>,
                        </p>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            Teklifiniz admin tarafından incelendi ve onaylandı! Artık ilan sahibi teklifinizi görebilir.
                        </p>
                        
                        <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
                            <h3 style="color: #333; margin-top: 0; font-size: 18px;">Teklif Detayları:</h3>
                            <p style="color: #666; margin: 8px 0;"><strong>İlan:</strong> ${listingTitle}</p>
                            <p style="color: #666; margin: 8px 0;">
                                <strong>Teklif Tutarı:</strong> 
                                <span style="color: #10b981; font-size: 20px; font-weight: bold;">${offerAmount} TL</span>
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${listingUrl}" 
                               style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                                      color: white; 
                                      padding: 15px 40px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
                                İlanı Görüntüle
                            </a>
                        </div>
                        
                        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                            <h3 style="color: #333; margin-top: 0; font-size: 18px;">Sonraki Adımlar:</h3>
                            <ul style="color: #666; margin: 0; padding-left: 20px; line-height: 1.8;">
                                <li>İlan sahibi teklifinizi görüntüleyebilir ve kabul edebilir</li>
                                <li>Panelim → Tekliflerim bölümünden durumu takip edebilirsiniz</li>
                                <li>İlan sahibi teklifinizi kabul ederse bildirim alacaksınız</li>
                            </ul>
                        </div>
                        
                        <p style="color: #10b981; font-size: 16px; text-align: center; font-weight: bold; margin: 30px 0;">
                            İyi alışverişler dileriz!
                        </p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                Bu e-posta <strong>noreply@varmii.com</strong> adresinden gönderilmiştir.
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                                © 2024 Varmii - Tüm hakları saklıdır.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        // Create notification
        await createNotification(
            sellerId,
            'offer_approved',
            'Teklifiniz Onaylandı!',
            `"${listingTitle}" ilanına ${offerAmount} TL teklifiniz onaylandı.`,
            { listingId, offerAmount, listingTitle }
        );
        
        const duration = Date.now() - startTime;
        console.log('✅ Offer approved email sent successfully after', duration, 'ms');
        console.log('Message ID:', info.messageId);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ Offer approved email failed after', duration, 'ms:', error);
        throw error;
    }
}

/**
 * Teklif sahibine teklif reddedildi bildirimi gönderir
 */
export async function sendOfferRejectedNotification(
    sellerId: string,
    listingTitle: string,
    offerAmount: number,
    rejectionReason?: string
): Promise<{ success: boolean; messageId?: string }> {
    const startTime = Date.now();
    console.log(`📧 Sending offer rejected notification to seller ${sellerId}...`);

    try {
        // Get seller details
        const connection = await mysql.createConnection(dbConfig);
        const [sellers] = await connection.execute(
            'SELECT email, firstName, lastName FROM users WHERE id = ?',
            [sellerId]
        ) as any[];
        await connection.end();

        if (!sellers || sellers.length === 0) {
            console.error('❌ Seller not found:', sellerId);
            return { success: false };
        }

        const seller = sellers[0];

        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: seller.email,
            subject: 'Teklifiniz Reddedildi',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #ef4444; margin: 0; font-size: 28px;">Varmii</h1>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Teklif Reddi</p>
                        </div>
                        
                        <h2 style="color: #333; text-align: center; margin-bottom: 25px; font-size: 24px;">
                            Teklifiniz Onaylanmadı
                        </h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                            Merhaba <strong>${seller.firstName && seller.lastName ? `${seller.firstName} ${seller.lastName}` : 'Değerli Kullanıcı'}</strong>,
                        </p>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            Teklifiniz admin tarafından incelendi ancak maalesef onaylanmadı.
                        </p>
                        
                        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ef4444;">
                            <h3 style="color: #333; margin-top: 0; font-size: 18px;">Teklif Detayları:</h3>
                            <p style="color: #666; margin: 8px 0;"><strong>İlan:</strong> ${listingTitle}</p>
                            <p style="color: #666; margin: 8px 0;">
                                <strong>Teklif Tutarı:</strong> 
                                <span style="color: #ef4444; font-size: 20px; font-weight: bold;">${offerAmount} TL</span>
                            </p>
                            ${rejectionReason ? `
                            <p style="color: #666; margin: 8px 0;">
                                <strong>Red Nedeni:</strong><br>
                                <span style="color: #991b1b;">${rejectionReason}</span>
                            </p>
                            ` : ''}
                        </div>
                        
                        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                            <h3 style="color: #333; margin-top: 0; font-size: 18px;">Ne Yapabilirsiniz?</h3>
                            <ul style="color: #666; margin: 0; padding-left: 20px; line-height: 1.8;">
                                <li>Teklif detaylarınızı gözden geçirebilirsiniz</li>
                                <li>Uygun olduğunda yeni bir teklif verebilirsiniz</li>
                                <li>Sorularınız için destek ekibimize ulaşabilirsiniz</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 14px; margin: 0;">
                                Anlayışınız için teşekkürler,<br>
                                <strong>Varmii Ekibi</strong>
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        // Create notification
        await createNotification(
            sellerId,
            'offer_rejected',
            'Teklifiniz Reddedildi',
            `"${listingTitle}" ilanına ${offerAmount} TL teklifiniz reddedildi.${rejectionReason ? ` Sebep: ${rejectionReason}` : ''}`,
            { offerAmount, listingTitle, rejectionReason }
        );
        
        const duration = Date.now() - startTime;
        console.log('✅ Offer rejected email sent successfully after', duration, 'ms');
        console.log('Message ID:', info.messageId);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ Offer rejected email failed after', duration, 'ms:', error);
        throw error;
    }
}

// Send order cancelled email (to both buyer and seller)
export async function sendOrderCancelledEmail(
    recipientEmail: string,
    recipientName: string,
    orderId: string,
    cancelReason: string,
    isBuyer: boolean,
    userId: string
) {
    const startTime = Date.now();
    const { orderCancelledTemplate } = await import('../templates/orderCancelled.js');
    
    try {
        console.log('📧 Sending order cancelled email to:', recipientEmail);
        
        const mailOptions = {
            from: `"Varmii" <${process.env.SMTP_USER || 'noreply@varmii.com'}>`,
            to: recipientEmail,
            subject: `Sipariş İptal Edildi - ${orderId}`,
            html: orderCancelledTemplate(recipientName, orderId, cancelReason, isBuyer, isBuyer ? 'buyer' : 'seller')
        };

        const info = await transporter.sendMail(mailOptions);
        
        // Create notification
        await createNotification(
            userId,
            'order_cancelled',
            'Sipariş İptal Edildi',
            `${orderId} numaralı ${isBuyer ? 'siparişiniz' : 'sipariş'} iptal edildi.${cancelReason ? ` Sebep: ${cancelReason}` : ''}`,
            { orderId, cancelReason, isBuyer }
        );
        
        const duration = Date.now() - startTime;
        console.log('✅ Order cancelled email sent successfully after', duration, 'ms');
        console.log('Message ID:', info.messageId);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ Order cancelled email failed after', duration, 'ms:', error);
        throw error;
    }
}

// Send return request email (to seller)
export async function sendReturnRequestEmail(
    sellerEmail: string,
    sellerName: string,
    buyerName: string,
    orderId: string,
    returnReason: string,
    listingTitle: string,
    hasImages: boolean,
    sellerId: string
) {
    const startTime = Date.now();
    const { returnRequestTemplate } = await import('../templates/returnRequest.js');
    
    try {
        console.log('📧 Sending return request email to:', sellerEmail);
        
        const mailOptions = {
            from: `"Varmii" <${process.env.SMTP_USER || 'noreply@varmii.com'}>`,
            to: sellerEmail,
            subject: `İade Talebi Geldi - ${orderId}`,
            html: returnRequestTemplate(sellerName, buyerName, orderId, returnReason, listingTitle, hasImages)
        };

        const info = await transporter.sendMail(mailOptions);
        
        // Notification is already created in the orders.ts endpoint
        
        const duration = Date.now() - startTime;
        console.log('✅ Return request email sent successfully after', duration, 'ms');
        console.log('Message ID:', info.messageId);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ Return request email failed after', duration, 'ms:', error);
        throw error;
    }
}

// Satıcı profili onaylandı email'i
export async function sendSellerProfileApprovedEmail(
    email: string,
    firstName: string,
    storeName: string
) {
    const startTime = Date.now();
    console.log('📧 Sending seller profile approved email to:', email);
    
    try {
        const mailOptions = {
            from: `"Varmii" <${process.env.SMTP_USER || 'noreply@varmii.com'}>`,
            to: email,
            subject: 'Satıcı Profiliniz Onaylandı! 🎉',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            background-color: #f4f4f4;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            background: white;
                            border-radius: 10px;
                            overflow: hidden;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 30px 20px;
                            text-align: center;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 28px;
                        }
                        .content {
                            padding: 30px;
                        }
                        .success-icon {
                            text-align: center;
                            font-size: 60px;
                            margin: 20px 0;
                        }
                        .store-name {
                            background: #f8f9fa;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 20px 0;
                            border-left: 4px solid #667eea;
                        }
                        .store-name strong {
                            color: #667eea;
                        }
                        .info-box {
                            background: #e7f3ff;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 20px 0;
                            border-left: 4px solid #2196F3;
                        }
                        .cta-button {
                            display: inline-block;
                            padding: 15px 30px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-decoration: none;
                            border-radius: 8px;
                            margin: 20px 0;
                            font-weight: bold;
                            text-align: center;
                        }
                        .footer {
                            background: #f8f9fa;
                            padding: 20px;
                            text-align: center;
                            font-size: 14px;
                            color: #666;
                        }
                        ul {
                            padding-left: 20px;
                        }
                        ul li {
                            margin: 10px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Satıcı Profiliniz Onaylandı!</h1>
                        </div>
                        <div class="content">
                            <div class="success-icon">✅</div>
                            
                            <p>Merhaba <strong>${firstName}</strong>,</p>
                            
                            <p>Harika haberlerimiz var! Satıcı profiliniz başarıyla onaylandı ve artık Varmii platformunda teklif verebilirsiniz.</p>
                            
                            <div class="store-name">
                                <strong>Mağaza Adı:</strong> ${storeName}
                            </div>
                            
                            <div class="info-box">
                                <strong>🎯 Artık Neler Yapabilirsiniz?</strong>
                                <ul>
                                    <li>Ürün taleplerini görüntüleyebilir ve teklif verebilirsiniz</li>
                                    <li>Tekliflerinizi yönetebilirsiniz</li>
                                    <li>Siparişlerinizi takip edebilirsiniz</li>
                                    <li>Satıcı profilinizi güncelleyebilirsiniz</li>
                                </ul>
                            </div>
                            
                            <p style="text-align: center;">
                                <a href="${process.env.FRONTEND_URL || 'https://varmii.com.tr'}/profile" class="cta-button">
                                    Profilime Git
                                </a>
                            </p>
                            
                            <p>İlk teklifinizi vermek için hazır mısınız? Hemen ürün taleplerini keşfetmeye başlayın!</p>
                            
                            <p>Başarılar dileriz! 🚀</p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Varmii - Tüm hakları saklıdır.</p>
                            <p>Bu email, satıcı profili onayı nedeniyle gönderilmiştir.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        const duration = Date.now() - startTime;
        console.log('✅ Seller profile approved email sent successfully after', duration, 'ms');
        console.log('Message ID:', info.messageId);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ Seller profile approved email failed after', duration, 'ms:', error);
        throw error;
    }
}

// Satıcı profili reddedildi email'i
export async function sendSellerProfileRejectedEmail(
    email: string,
    firstName: string,
    storeName: string,
    reason: string
) {
    const startTime = Date.now();
    console.log('📧 Sending seller profile rejected email to:', email);
    
    try {
        const mailOptions = {
            from: `"Varmii" <${process.env.SMTP_USER || 'noreply@varmii.com'}>`,
            to: email,
            subject: 'Satıcı Profili Hakkında Bilgilendirme',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            background-color: #f4f4f4;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            background: white;
                            border-radius: 10px;
                            overflow: hidden;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        .header {
                            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                            color: white;
                            padding: 30px 20px;
                            text-align: center;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 28px;
                        }
                        .content {
                            padding: 30px;
                        }
                        .warning-icon {
                            text-align: center;
                            font-size: 60px;
                            margin: 20px 0;
                        }
                        .store-name {
                            background: #f8f9fa;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 20px 0;
                            border-left: 4px solid #f5576c;
                        }
                        .reason-box {
                            background: #fff3cd;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 20px 0;
                            border-left: 4px solid #ffc107;
                        }
                        .reason-box strong {
                            color: #856404;
                        }
                        .info-box {
                            background: #e7f3ff;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 20px 0;
                            border-left: 4px solid #2196F3;
                        }
                        .cta-button {
                            display: inline-block;
                            padding: 15px 30px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-decoration: none;
                            border-radius: 8px;
                            margin: 20px 0;
                            font-weight: bold;
                            text-align: center;
                        }
                        .footer {
                            background: #f8f9fa;
                            padding: 20px;
                            text-align: center;
                            font-size: 14px;
                            color: #666;
                        }
                        ul {
                            padding-left: 20px;
                        }
                        ul li {
                            margin: 10px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Satıcı Profili Hakkında</h1>
                        </div>
                        <div class="content">
                            <div class="warning-icon">⚠️</div>
                            
                            <p>Merhaba <strong>${firstName}</strong>,</p>
                            
                            <p>Satıcı profil başvurunuzu inceledik. Ne yazık ki profil başvurunuz şu anda onaylanamadı.</p>
                            
                            <div class="store-name">
                                <strong>Mağaza Adı:</strong> ${storeName}
                            </div>
                            
                            <div class="reason-box">
                                <strong>Red Nedeni:</strong><br>
                                ${reason}
                            </div>
                            
                            <div class="info-box">
                                <strong>📝 Ne Yapmalısınız?</strong>
                                <ul>
                                    <li>Belirtilen eksiklikleri tamamlayın</li>
                                    <li>Gerekli belgeleri eksiksiz yükleyin</li>
                                    <li>Bilgilerinizi güncelleyin</li>
                                    <li>Profilinizi tekrar gönderin</li>
                                </ul>
                            </div>
                            
                            <p style="text-align: center;">
                                <a href="${process.env.FRONTEND_URL || 'https://varmii.com.tr'}/profile?tab=seller" class="cta-button">
                                    Profilimi Düzenle
                                </a>
                            </p>
                            
                            <p>Düzeltmeleri yaptıktan sonra profilinizi tekrar gönderebilirsiniz. Herhangi bir sorunuz varsa destek ekibimizle iletişime geçebilirsiniz.</p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Varmii - Tüm hakları saklıdır.</p>
                            <p>Bu email, satıcı profili başvurunuz hakkında bilgilendirme amaçlı gönderilmiştir.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        const duration = Date.now() - startTime;
        console.log('✅ Seller profile rejected email sent successfully after', duration, 'ms');
        console.log('Message ID:', info.messageId);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ Seller profile rejected email failed after', duration, 'ms:', error);
        throw error;
    }
}


export async function sendPasswordResetEmail(email: string, resetUrl: string, name?: string) {
    const startTime = Date.now();
    console.log('Sending password reset email to:', email);

    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: email,
            subject: 'Varmii - Sifre Sifirlama',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #9333ea; margin: 0; font-size: 28px;">Varmii</h1>
                        </div>
                        <h2 style="color: #333; text-align: center; margin-bottom: 20px; font-size: 22px;">Sifre Sifirlama</h2>
                        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 10px;">
                            Merhaba${name ? ' ' + name : ''},
                        </p>
                        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                            Varmii hesabiniz icin sifre sifirlama talebinde bulundunuz. Asagidaki butona tiklayarak yeni bir sifre olusturabilirsiniz:
                        </p>
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${resetUrl}"
                               style="background: linear-gradient(135deg, #9333ea 0%, #6366f1 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(147,51,234,0.3);">
                                Sifremi Sifirla
                            </a>
                        </div>
                        <p style="color: #999; font-size: 13px; text-align: center; margin-top: 25px;">
                            Bu link <strong>1 saat</strong> gecerlidir.
                        </p>
                        <p style="color: #999; font-size: 13px; text-align: center;">
                            Eger bu talebi siz yapmadiyseniz bu e-postayi gormezden gelebilirsiniz.
                        </p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                        <p style="color: #ccc; font-size: 11px; text-align: center;">&copy; 2024 Varmii.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        const duration = Date.now() - startTime;
        console.log('Password reset email sent in', duration, 'ms, id:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('Password reset email failed after', duration, 'ms:', error);
        throw error;
    }
}
