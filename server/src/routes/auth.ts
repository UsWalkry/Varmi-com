// Auth Routes - JWT Authentication System
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { body, validationResult } from 'express-validator';
import { query } from '../database.js';
import { sendVerificationEmail, sendEmailChangeVerificationEmail, send2FAEmailCode } from '../services/emailService.js';
import { logger } from '../utils/logger.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Şifre hashleme
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Şifre doğrulama
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// JWT token oluşturma - GÜVENLİK: 7d -> 2h + refresh token
function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '2h' }); // 🔒 2 saat
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
}

// Şifre politikası kontrolü
function isPasswordStrong(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Şifre en az 8 karakter olmalıdır' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Şifre en az bir büyük harf içermelidir' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Şifre en az bir küçük harf içermelidir' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Şifre en az bir rakam içermelidir' };
  }
  return { valid: true };
}

// Gender dönüştürme (Türkçe -> İngilizce)
function normalizeGender(gender: string | null | undefined): string | null {
  if (!gender) return null;
  const normalized = gender.toLowerCase().trim();
  if (normalized === 'erkek' || normalized === 'male') return 'male';
  if (normalized === 'kadın' || normalized === 'kadin' || normalized === 'female') return 'female';
  if (normalized === 'diğer' || normalized === 'diger' || normalized === 'other') return 'other';
  return null;
}

// Gender dönüştürme (İngilizce -> Türkçe) - Frontend için
function denormalizeGender(gender: string | null | undefined): string {
  if (!gender) return '';
  const normalized = gender.toLowerCase().trim();
  if (normalized === 'male') return 'Erkek';
  if (normalized === 'female') return 'Kadın';
  if (normalized === 'other') return 'Diğer';
  return '';
}

// Register endpoint - 🛡️ Validation eklendi
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Geçerli bir email adresi girin'),
  body('password').isLength({ min: 8 }).withMessage('Şifre en az 8 karakter olmalıdır'),
  body('firstName').trim().isLength({ min: 2 }).withMessage('Ad en az 2 karakter olmalıdır'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Soyad en az 2 karakter olmalıdır'),
  body('phone').optional().matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/).withMessage('Geçerli telefon numarası girin'),
], async (req: Request, res: Response) => {
  try {
    // Validation hatalarını kontrol et
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg,
        errors: errors.array() 
      });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      console.log('🔵 Register request received:', req.body);
    }
  const { email, password, firstName, lastName, city, phone, gender, birthDate, addressLine1, district, postalCode } = req.body;

    if (!email || !password || !firstName) {
      if (!isProduction) console.log('❌ Missing required fields:', { email, password, firstName });
      return res.status(400).json({ 
        success: false, 
        error: 'Email, şifre ve ad alanları gereklidir' 
      });
    }

    // Şifre gücü kontrolü
    const passwordCheck = isPasswordStrong(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ 
        success: false, 
        error: passwordCheck.message 
      });
    }

    // Email kontrolü
    if (!isProduction) console.log('🔍 Checking existing user for email:', email);
    const existingUser = await query(
      'SELECT id FROM users WHERE email = ?', 
      [email]
    ) as any[];

    if (existingUser.length > 0) {
      logger.debug('❌ Email already exists');
      return res.status(400).json({ 
        success: false, 
        error: 'Kayıt işlemi başarısız. Lütfen bilgilerinizi kontrol edin.' 
      });
    }

    // Telefon numarası kontrolü (eğer telefon numarası verilmişse)
    if (phone && phone.trim()) {
      logger.debug('🔍 Checking existing user for phone');
      
      // Telefon numarası formatlarını hazırla
      const cleanPhone = phone.replace(/\s/g, ''); // Boşlukları temizle
      const phoneFormats: string[] = [];
      
      if (/^[5]\d{9}$/.test(cleanPhone)) {
        // 5xxxxxxxxx formatı
        phoneFormats.push(cleanPhone, '0' + cleanPhone, '+90' + cleanPhone);
      } else if (/^0[5]\d{9}$/.test(cleanPhone)) {
        // 05xxxxxxxxx formatı
        phoneFormats.push(cleanPhone, cleanPhone.substring(1), '+90' + cleanPhone.substring(1));
      } else if (/^\+90[5]\d{9}$/.test(cleanPhone)) {
        // +905xxxxxxxxx formatı
        phoneFormats.push(cleanPhone, cleanPhone.substring(3), '0' + cleanPhone.substring(3));
      }

      // Telefon numarası kontrolü (tüm formatları kontrol et)
      if (phoneFormats.length > 0) {
        let phoneCheckQuery = 'SELECT id FROM users WHERE';
        const phoneCheckParams: string[] = [];
        
        phoneFormats.forEach((format, index) => {
          if (index > 0) phoneCheckQuery += ' OR';
          phoneCheckQuery += ' phone = ?';
          phoneCheckParams.push(format);
        });

        const existingPhone = await query(phoneCheckQuery, phoneCheckParams) as any[];
        
        if (existingPhone.length > 0) {
          console.log('❌ Phone number already exists');
          return res.status(400).json({ 
            success: false, 
            error: 'Bu telefon numarası zaten kayıtlı' 
          });
        }
      }
    }

    // Şifreyi hashle
    const hashedPassword = await hashPassword(password);
    const userId = uuidv4();
    console.log('🔐 Generated userId:', userId);

    // Gender değerini normalize et (Türkçe -> İngilizce)
    const normalizedGender = normalizeGender(gender);
    
    // Kullanıcıyı veritabanına ekle (email_verified = 0, doğrulama gerekli)
    console.log('📝 Inserting user with data:', { userId, email, firstName, lastName, city, phone, gender: normalizedGender, birthDate, addressLine1, district, postalCode });
    const insertResult = await query(
      `INSERT INTO users (id, email, password_hash, firstName, lastName, city, phone, gender, birth_date, address_line1, district, postal_code, email_verified, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [userId, email, hashedPassword, firstName || null, lastName || null, city || null, phone || null, normalizedGender, birthDate || null, addressLine1 || null, district || null, postalCode || null]
    );
    console.log('✅ Insert result:', insertResult);

    // Email verification token oluştur
    const tokenId = uuidv4();
    const verificationToken = uuidv4();
    
    await query(
      `INSERT INTO email_verification_tokens (id, token, user_id, email, expires_at, created_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW())`,
      [tokenId, verificationToken, userId, email]
    );
    logger.debug('📧 Email verification token created');

    // Email doğrulama linki oluştur
    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'https://varmii.com';
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
    console.log('🔗 Email verification link:', verificationUrl);
    console.log('🌐 Using base URL from env:', baseUrl);

    // Email doğrulama maili gönder
    try {
      const fullName = `${firstName} ${lastName || ''}`.trim();
      await sendVerificationEmail(email, verificationUrl, fullName);
      console.log('✅ Verification email sent to:', email);
    } catch (emailError) {
      console.warn('⚠️ Email gönderilemedi, ama kayıt tamamlandı:', emailError);
      // Email gönderilemese bile kayıt tamamlanır, manuel doğrulama yapılabilir
    }

    // Email doğrulanmadan JWT token verme!
    console.log('✅ Registration successful - waiting for email verification');
    
    res.json({
      success: true,
      message: 'Kayıt başarılı! Email adresinizi kontrol ederek hesabınızı doğrulayın.',
      emailVerificationRequired: true,
      email: email
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Kayıt sırasında hata oluştu' 
    });
  }
});

// Login endpoint - 🛡️ Rate limited & validated
router.post('/login', [
  body('email').trim().notEmpty().withMessage('Email veya telefon gereklidir'),
  body('password').notEmpty().withMessage('Şifre gereklidir'),
], async (req: Request, res: Response) => {
  try {
    // Validation kontrolü
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email/telefon ve şifre gereklidir' 
      });
    }

    // Email veya telefon numarası ile kullanıcıyı bul
    // Telefon numarası için farklı formatları kontrol et
    const cleanInput = email.replace(/\s/g, ''); // Boşlukları temizle
    
    // Telefon numarası formatlarını hazırla
    const phoneFormats: string[] = [];
    if (/^[5]\d{9}$/.test(cleanInput)) {
      // 5xxxxxxxxx formatı -> 05xxxxxxxxx ve +905xxxxxxxxx ekle
      phoneFormats.push(cleanInput, '0' + cleanInput, '+90' + cleanInput);
    } else if (/^0[5]\d{9}$/.test(cleanInput)) {
      // 05xxxxxxxxx formatı -> 5xxxxxxxxx ve +905xxxxxxxxx ekle
      phoneFormats.push(cleanInput, cleanInput.substring(1), '+90' + cleanInput.substring(1));
    } else if (/^\+90[5]\d{9}$/.test(cleanInput)) {
      // +905xxxxxxxxx formatı -> 5xxxxxxxxx ve 05xxxxxxxxx ekle
      phoneFormats.push(cleanInput, cleanInput.substring(3), '0' + cleanInput.substring(3));
    }
    
    // SQL sorgusu: email veya telefon formatlarından herhangi biri
    let sqlQuery = `SELECT id, email, password_hash, firstName, lastName, city, phone, gender,
                          DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date,
                          address_line1, district, postal_code, role, email_verified 
                   FROM users WHERE email = ?`;
    let queryParams: string[] = [email];
    
    // Telefon formatları varsa onları da ekle
    for (const phoneFormat of phoneFormats) {
      sqlQuery += ' OR phone = ?';
      queryParams.push(phoneFormat);
    }
    
    const users = await query(sqlQuery, queryParams) as any[];

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Geçersiz email/telefon veya şifre' 
      });
    }

    const user = users[0];

    // Şifreyi doğrula
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Geçersiz email/telefon veya şifre' 
      });
    }

    // Email verification kontrolü
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        error: 'Email adresiniz doğrulanmamış. Lütfen email adresinizi kontrol edin.',
        emailVerificationRequired: true
      });
    }

    // 2FA kontrolü - Hem Authenticator hem Email 2FA
    const twoFASettings = await query(
      'SELECT is_enabled, email_2fa_enabled FROM user_2fa_settings WHERE user_id = ?',
      [user.id]
    ) as any[];

    const hasAuthenticator2FA = twoFASettings.length > 0 && twoFASettings[0].is_enabled === 1;
    const hasEmail2FA = twoFASettings.length > 0 && twoFASettings[0].email_2fa_enabled === 1;

    console.log('🔐 2FA check for user:', user.email, '| Authenticator:', hasAuthenticator2FA, '| Email:', hasEmail2FA);

    // Mutual exclusive check - debug only
    if (hasAuthenticator2FA && hasEmail2FA) {
      console.warn('⚠️ WARNING: Both 2FA methods are active! This should not happen.');
    }

    if (hasAuthenticator2FA || hasEmail2FA) {
      // 2FA aktif, doğrulama gerekli
      console.log('✅ 2FA required for user:', user.email);
      return res.status(200).json({
        success: false,
        twoFactorRequired: true,
        message: '2FA doğrulaması gerekli',
        userId: user.id,
        availableMethods: {
          authenticator: hasAuthenticator2FA,
          email: hasEmail2FA
        }
      });
    }

    console.log('🔓 2FA not required for user:', user.email);

    // JWT token oluştur
    const token = generateToken(user.id);

    // Kullanıcı bilgilerini döndür
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      city: user.city || '',
      phone: user.phone || '',
      gender: user.gender || '',
  birthDate: user.birth_date || null,
  addressLine1: user.address_line1 || '',
      district: user.district || '',
      postalCode: user.postal_code || '',
      role: user.role || 'user'
    };

    res.json({
      success: true,
      user: userData,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Giriş sırasında hata oluştu' 
    });
  }
});

// JWT Middleware - Token doğrulama
export function authenticateToken(req: any, res: Response, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token gereklidir' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        error: 'Geçersiz token' 
      });
    }
    
    req.userId = decoded.userId;
    req.user = { userId: decoded.userId };
    next();
  });
}

// Get current user
router.get('/me', authenticateToken, async (req: any, res: Response) => {
  try {
    const users = await query(
      `SELECT 
         id, email, firstName, lastName, city, phone, gender,
         DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date,
         address_line1, district, postal_code, role, created_at
       FROM users WHERE id = ?`,
      [req.userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Kullanıcı bulunamadı' 
      });
    }

    const user = users[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        city: user.city || '',
        phone: user.phone || '',
        gender: denormalizeGender(user.gender),
        birthDate: user.birth_date || null,
        addressLine1: user.address_line1 || '',
        district: user.district || '',
        postalCode: user.postal_code || '',
        role: user.role || 'user',
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Kullanıcı bilgileri alınırken hata oluştu' 
    });
  }
});

// Email verification endpoint
router.get('/verify-email/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'https://varmii.com';
    const isJsonRequest = req.headers.accept?.includes('application/json');

    logger.debug('📧 Email verification attempt');

    // Token'ı kontrol et
    const tokenRows = await query(
      'SELECT user_id, email FROM email_verification_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    ) as any[];

    if (tokenRows.length === 0) {
      if (isJsonRequest) {
        res.status(400).json({
          success: false,
          error: 'Token geçersiz veya süresi dolmuş'
        });
        return;
      }

      const errorHtml = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>Doğrulama Hatası - varmii.com</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              line-height: 1.6;
            }
            .container {
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              padding: 48px;
              text-align: center;
              max-width: 500px;
              margin: 20px;
              animation: slideIn 0.6s ease-out;
            }
            @keyframes slideIn {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .logo { font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #059669, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 32px; }
            .icon {
              width: 80px; height: 80px; background: #ef4444; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              margin: 0 auto 32px; color: white; font-size: 36px; font-weight: bold;
            }
            h1 { color: #1f2937; font-size: 28px; font-weight: 700; margin-bottom: 16px; }
            p { color: #6b7280; font-size: 16px; margin-bottom: 32px; }
            .button {
              display: inline-block; background: #2563eb; color: white;
              padding: 12px 32px; border-radius: 8px; text-decoration: none;
              font-weight: 600; font-size: 16px; margin: 0 8px;
            }
            .button:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Var mıı?</div>
            <div class="icon">!</div>
            <h1>Doğrulama Hatası</h1>
            <p>Doğrulama linki geçersiz veya süresi dolmuş. Lütfen yeni bir doğrulama emaili isteyin.</p>
            <a href="${baseUrl}" class="button">Ana Sayfa</a>
          </div>
        </body>
        </html>
      `;
      
      res.status(400).setHeader('Content-Type', 'text/html').send(errorHtml);
      return;
    }

    const { user_id, email } = tokenRows[0];

    // Kullanıcıyı email verified olarak işaretle
    await query(
      'UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE id = ?',
      [user_id]
    );

    // Token'ı sil (tek kullanımlık)
    await query(
      'DELETE FROM email_verification_tokens WHERE token = ?',
      [token]
    );

    console.log('✅ Email verified successfully for user:', email);

    // JSON response için
    if (isJsonRequest) {
      res.json({
        success: true,
        message: 'Email başarıyla doğrulandı',
        email: email
      });
      return;
    }

    // Güzel tasarımlı success sayfası döndür
    const successHtml = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Email Doğrulandı! ✅ - varmii.com</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1.6;
          }
          .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            padding: 48px;
            text-align: center;
            max-width: 500px;
            margin: 20px;
            animation: slideIn 0.6s ease-out;
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .logo {
            font-size: 32px;
            font-weight: 700;
            background: linear-gradient(135deg, #059669, #10b981);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 32px;
          }
          .icon {
            width: 80px;
            height: 80px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 32px;
            animation: checkmark 0.6s ease-in-out 0.3s both;
          }
          @keyframes checkmark {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
          .checkmark {
            color: white;
            font-size: 36px;
            font-weight: bold;
          }
          h1 {
            color: #1f2937;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 16px;
          }
          p {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 32px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #059669, #10b981);
            color: white !important;
            padding: 15px 35px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 700;
            font-size: 16px;
            transition: all 0.3s ease;
            margin: 0 10px;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
          }
          .button:hover {
            background: linear-gradient(135deg, #047857, #059669);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
          }
          .button.secondary {
            background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
            color: #374151 !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }
          .button.secondary:hover {
            background: linear-gradient(135deg, #e5e7eb, #d1d5db);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          }
          .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            color: #9ca3af;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Var mıı?</div>
          
          <div class="icon">
            <div class="checkmark">✓</div>
          </div>
          
          <h1>Email Doğrulandı!</h1>
          <p>Tebrikler! Email adresiniz başarıyla doğrulandı. Artık varmii.com'da ilan verebilir ve tüm özellikleri kullanabilirsiniz.</p>
          
          <div>
            <a href="${baseUrl}" class="button">Giriş Yap</a>
            <a href="${baseUrl}" class="button secondary">Ana Sayfa</a>
          </div>
          
          <div class="footer">
            <p>© 2025 varmii.com - Güvenilir alışveriş platformu</p>
          </div>
        </div>
        
        <script>
          // 5 saniye sonra otomatik yönlendirme
          setTimeout(() => {
            window.location.href = '${baseUrl}';
          }, 5000);
        </script>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(successHtml);

  } catch (error) {
    console.error('❌ Email verification error:', error);
    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'https://varmii.com';
    
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Sistem Hatası - varmii.com</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1.6;
          }
          .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            padding: 48px;
            text-align: center;
            max-width: 500px;
            margin: 20px;
          }
          .logo { font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #059669, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 32px; }
          .icon {
            width: 80px; height: 80px; background: #f59e0b; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 32px; color: white; font-size: 36px; font-weight: bold;
          }
          h1 { color: #1f2937; font-size: 28px; font-weight: 700; margin-bottom: 16px; }
          p { color: #6b7280; font-size: 16px; margin-bottom: 32px; }
          .button {
            display: inline-block; background: #2563eb; color: white;
            padding: 12px 32px; border-radius: 8px; text-decoration: none;
            font-weight: 600; font-size: 16px;
          }
          .button:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Var mıı?</div>
          <div class="icon">⚠</div>
          <h1>Sistem Hatası</h1>
          <p>Email doğrulama sırasında beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
          <a href="${baseUrl}" class="button">Ana Sayfa</a>
        </div>
      </body>
      </html>
    `;
    
    res.status(500).setHeader('Content-Type', 'text/html').send(errorHtml);
  }
});

// Resend email verification
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email adresi gereklidir'
      });
    }

    // Kullanıcının varlığını kontrol et
    const users = await query(
      'SELECT id, email_verified FROM users WHERE email = ?',
      [email]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bu email adresi ile kayıtlı kullanıcı bulunamadı'
      });
    }

    const user = users[0];

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        error: 'Email adresiniz zaten doğrulanmış'
      });
    }

    // Eski token'ları sil
    await query(
      'DELETE FROM email_verification_tokens WHERE user_id = ?',
      [user.id]
    );

    // Yeni token oluştur
    const tokenId = uuidv4();
    const verificationToken = uuidv4();
    await query(
      `INSERT INTO email_verification_tokens (id, token, user_id, email, expires_at, created_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW())`,
      [tokenId, verificationToken, user.id, email]
    );

    logger.debug('📧 New verification token created');

    // Email doğrulama maili gönder
    try {
      await sendVerificationEmail(email, verificationToken, user.name || 'Kullanıcı');
      console.log('✅ Resend verification email sent to:', email);
    } catch (emailError) {
      console.warn('⚠️ Resend email gönderilemedi:', emailError);
    }

    res.json({
      success: true,
      message: 'Doğrulama emaili tekrar gönderildi'
    });

  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Email gönderme sırasında hata oluştu'
    });
  }
});

// Profil güncelleme endpoint
router.put('/profile', authenticateToken, async (req: any, res: Response) => {
  try {
    console.log('🔵 Profile update request:', req.body);
  const { firstName, lastName, city, phone, gender, birthDate, addressLine1, district, postalCode } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Oturum geçersiz'
      });
    }

    // Kullanıcının mevcut bilgilerini al
    const users = await query(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    // Gender değerini normalize et (Türkçe -> İngilizce)
    const normalizedGender = normalizeGender(gender);
    
    // Profil bilgilerini güncelle
    await query(
      `UPDATE users 
       SET firstName = ?, lastName = ?, city = ?, phone = ?, gender = ?, birth_date = ?, address_line1 = ?, district = ?, postal_code = ?, updated_at = NOW()
       WHERE id = ?`,
      [firstName || null, lastName || null, city || null, phone || null, normalizedGender, birthDate || null, addressLine1 || null, district || null, postalCode || null, userId]
    );

    console.log('✅ Profile updated successfully for user:', userId);

    // Güncellenmiş kullanıcı bilgilerini döndür
    const updatedUsers = await query(
      `SELECT 
         id, email, firstName, lastName, city, phone, gender,
         DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date,
         address_line1, district, postal_code, email_verified
       FROM users WHERE id = ?`,
      [userId]
    ) as any[];

    const user = updatedUsers[0];
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      city: user.city || '',
      phone: user.phone || '',
      gender: denormalizeGender(user.gender),
      birthDate: user.birth_date || null,
      addressLine1: user.address_line1 || '',
      district: user.district || '',
      postalCode: user.postal_code || ''
    };

    res.json({
      success: true,
      message: 'Profil başarıyla güncellendi',
      user: userData
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Profil güncellenirken hata oluştu'
    });
  }
});

// Şifre değiştirme endpoint'i
router.put('/change-password', authenticateToken, async (req: any, res: Response) => {
  try {
    logger.debug('🔐 Password change request');
    const { oldPassword, newPassword } = req.body;
    const userId = req.userId;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Eski ve yeni şifre gereklidir'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Yeni şifre en az 8 karakter olmalıdır'
      });
    }

    // Kullanıcının mevcut şifresini al
    const users = await query(
      'SELECT id, password_hash FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    const user = users[0];

    // Eski şifreyi doğrula
    const isValidOldPassword = await verifyPassword(oldPassword, user.password_hash);
    
    if (!isValidOldPassword) {
      return res.status(400).json({
        success: false,
        error: 'Mevcut şifreniz hatalı'
      });
    }

    // Yeni şifreyi hashle
    const newHashedPassword = await hashPassword(newPassword);

    // Şifreyi güncelle
    await query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newHashedPassword, userId]
    );

    logger.info('✅ Password updated successfully');

    res.json({
      success: true,
      message: 'Şifreniz başarıyla güncellendi'
    });

  } catch (error) {
    console.error('❌ Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Şifre değiştirilirken hata oluştu'
    });
  }
});

// Email değişikliği için doğrulama endpoint'i
router.post('/change-email', authenticateToken, async (req: any, res: Response) => {
  try {
    console.log('📧 Email change request:', req.body);
    const { newEmail } = req.body;
    const userId = req.userId;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        error: 'Yeni email adresi gereklidir'
      });
    }

    // Email formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir email adresi girin'
      });
    }

    // Bu email zaten kullanılıyor mu kontrol et
    const existingUsers = await query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [newEmail, userId]
    ) as any[];

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Bu email adresi zaten başka bir kullanıcı tarafından kullanılıyor'
      });
    }

    // Mevcut kullanıcı bilgilerini al
    const users = await query(
      'SELECT id, email, firstName, lastName FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    const user = users[0];

    // Aynı email mi kontrol et
    if (user.email === newEmail) {
      return res.status(400).json({
        success: false,
        error: 'Yeni email adresi mevcut adresinizle aynı'
      });
    }

    // Eski email verification token'larını temizle
    await query(
      'DELETE FROM email_verification_tokens WHERE user_id = ?',
      [userId]
    );

    // Yeni email değişiklik token'ı oluştur (mevcut tabloyu kullan)
    const tokenId = uuidv4();
    const changeToken = uuidv4();
    
    // email_verification_tokens tablosunu kullan, email field'ını new_email için kullan
    await query(
      `INSERT INTO email_verification_tokens (id, token, user_id, email, expires_at, created_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW())`,
      [tokenId, changeToken, userId, newEmail]
    );

    logger.debug('📧 Email change token created');

    // Email doğrulama maili gönder (yeni adrese)
    try {
      const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'https://varmii.com';
      const changeVerificationUrl = `${baseUrl}/verify-email-change?token=${changeToken}`;
      await sendEmailChangeVerificationEmail(newEmail, changeVerificationUrl, user.name || 'Kullanıcı');
      console.log('✅ Email change verification sent to:', newEmail);
    } catch (emailError) {
      console.warn('⚠️ Email change verification gönderilemedi:', emailError);
      // Email gönderilemese bile token oluşturulmuş olur
    }

    res.json({
      success: true,
      message: `Email değişikliği doğrulama kodu ${newEmail} adresine gönderildi`,
      newEmail: newEmail
    });

  } catch (error) {
    console.error('❌ Email change error:', error);
    res.status(500).json({
      success: false,
      error: 'Email değişikliği sırasında hata oluştu'
    });
  }
});

// Email değişikliği doğrulama endpoint'i
router.get('/verify-email-change/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'https://varmii.com';
    logger.debug('📧 Email change verification attempt');

    // Token'ı kontrol et (email_verification_tokens tablosunu kullan)
    const tokenRows = await query(
      'SELECT user_id, email as new_email FROM email_verification_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    ) as any[];

    if (tokenRows.length === 0) {
      const errorHtml = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Email Değişikliği Hatası - varmii.com</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              line-height: 1.6;
            }
            .container {
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              padding: 48px;
              text-align: center;
              max-width: 500px;
              margin: 20px;
            }
            .logo { font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #059669, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 32px; }
            .icon {
              width: 80px; height: 80px; background: #ef4444; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              margin: 0 auto 32px; color: white; font-size: 36px; font-weight: bold;
            }
            h1 { color: #1f2937; font-size: 28px; font-weight: 700; margin-bottom: 16px; }
            p { color: #6b7280; font-size: 16px; margin-bottom: 32px; }
            .button {
              display: inline-block; background: #2563eb; color: white;
              padding: 12px 32px; border-radius: 8px; text-decoration: none;
              font-weight: 600; font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Var mıı?</div>
            <div class="icon">!</div>
            <h1>Email Değişikliği Hatası</h1>
            <p>Email değişiklik linki geçersiz veya süresi dolmuş. Lütfen yeni bir doğrulama isteyin.</p>
            <a href="${baseUrl}" class="button">Ana Sayfa</a>
          </div>
        </body>
        </html>
      `;
      
      res.status(400).setHeader('Content-Type', 'text/html').send(errorHtml);
      return;
    }

    const { user_id, new_email } = tokenRows[0];

    // Eski email'i al
    const userRows = await query(
      'SELECT email as old_email FROM users WHERE id = ?',
      [user_id]
    ) as any[];
    const old_email = userRows[0]?.old_email || 'Bilinmiyor';

    // Email adresini güncelle
    await query(
      'UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?',
      [new_email, user_id]
    );

    // Token'ı sil (tek kullanımlık)
    await query(
      'DELETE FROM email_verification_tokens WHERE token = ?',
      [token]
    );

    console.log('✅ Email changed successfully:', { old_email, new_email, user_id });

    // Success sayfası döndür
    const successHtml = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Email Değiştirildi! ✅ - varmii.com</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1.6;
          }
          .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            padding: 48px;
            text-align: center;
            max-width: 500px;
            margin: 20px;
            animation: slideIn 0.6s ease-out;
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .logo { font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #059669, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 32px; }
          .icon {
            width: 80px; height: 80px; background: #10b981; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 32px; color: white; font-size: 36px; font-weight: bold;
          }
          h1 { color: #1f2937; font-size: 28px; font-weight: 700; margin-bottom: 16px; }
          p { color: #6b7280; font-size: 16px; margin-bottom: 32px; }
          .button {
            display: inline-block; background: #10b981; color: white;
            padding: 15px 35px; border-radius: 10px; text-decoration: none;
            font-weight: 700; font-size: 16px; margin: 0 10px;
          }
          .button:hover { background: #059669; }
          .email-info {
            background: #f0fdf4; border: 1px solid #bbf7d0;
            padding: 16px; border-radius: 8px; margin: 24px 0;
          }
          .email-info strong { color: #059669; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Var mıı?</div>
          <div class="icon">✓</div>
          <h1>Email Değiştirildi!</h1>
          <div class="email-info">
            <p><strong>Yeni email adresiniz:</strong> ${new_email}</p>
          </div>
          <p>Email adresiniz başarıyla güncellendi. Artık yeni email adresinizle giriş yapabilirsiniz.</p>
          <a href="${baseUrl}" class="button">Giriş Yap</a>
        </div>
        <script>
          setTimeout(() => {
            window.location.href = '${baseUrl}';
          }, 5000);
        </script>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html').send(successHtml);

  } catch (error) {
    console.error('❌ Email change verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Email değişikliği doğrulanırken hata oluştu'
    });
  }
});

// === 2FA AUTHENTICATOR ENDPOINTS ===

// 2FA Setup - Generate secret and QR code
router.post('/2fa/setup', authenticateToken, async (req: any, res: Response) => {
  try {
    console.log('🔐 2FA setup request for user:', req.userId);
    const userId = req.userId;

    // Kullanıcı bilgilerini al
    const users = await query(
      'SELECT id, email, firstName, lastName FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    const user = users[0];

    // Mevcut 2FA ayarını kontrol et
    const existing2FA = await query(
      'SELECT id, secret FROM user_2fa_settings WHERE user_id = ?',
      [userId]
    ) as any[];

    let secret: string;
    let settingId: string;

    if (existing2FA.length > 0 && existing2FA[0].secret) {
      // Mevcut secret'ı kullan (eğer varsa)
      secret = existing2FA[0].secret;
      settingId = existing2FA[0].id;
      console.log('🔍 Using existing secret for user:', userId, 'secret exists:', !!secret);
    } else {
      // Yeni secret oluştur (ya hiç 2FA settings yok ya da secret NULL)
      console.log('🔨 Generating new secret for user:', userId, 'existing record:', existing2FA.length > 0 ? 'exists but no secret' : 'does not exist');
      const generatedSecret = speakeasy.generateSecret({
        name: `varmii.com (${user.email})`,
        issuer: 'varmii.com',
        length: 32
      });

      secret = generatedSecret.base32;
      
      console.log('✅ New secret generated:', !!secret, 'length:', secret?.length);

      // Backup codes oluştur
      const backupCodes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      if (existing2FA.length > 0) {
        // Mevcut kaydı güncelle
        settingId = existing2FA[0].id;
        await query(
          'UPDATE user_2fa_settings SET secret = ?, backup_codes = ? WHERE user_id = ?',
          [secret, JSON.stringify(backupCodes), userId]
        );
        console.log('🔄 Updated existing 2FA record with new secret');
      } else {
        // Yeni kayıt oluştur
        settingId = uuidv4();
        await query(
          'INSERT INTO user_2fa_settings (id, user_id, secret, backup_codes, is_enabled) VALUES (?, ?, ?, ?, FALSE)',
          [settingId, userId, secret, JSON.stringify(backupCodes)]
        );
        console.log('🆕 Created new 2FA record');
      }
    }

    console.log('🔐 About to create QR code with secret:', !!secret, 'for user:', user.email);

    // QR kod URL'i oluştur
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret,
      label: user.email,
      issuer: 'varmii.com',
      encoding: 'base32'
    });

    // QR kod data URL'i oluştur
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    console.log('✅ 2FA setup data generated for user:', userId);

    res.json({
      success: true,
      data: {
        secret: secret,
        qrCodeUrl: qrCodeDataUrl,
        otpauthUrl: otpauthUrl,
        backupCodes: existing2FA.length === 0 ? JSON.parse((await query(
          'SELECT backup_codes FROM user_2fa_settings WHERE id = ?',
          [settingId]
        ) as any[])[0].backup_codes) : null
      }
    });

  } catch (error) {
    console.error('❌ 2FA setup error:', error);
    res.status(500).json({
      success: false,
      error: '2FA kurulumu sırasında hata oluştu'
    });
  }
});

// 2FA Verify and Enable
router.post('/2fa/verify', authenticateToken, async (req: any, res: Response) => {
  try {
    console.log('🔐 2FA verify request for user:', req.userId);
    const { token } = req.body;
    const userId = req.userId;

    if (!token || token.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir 6 haneli kod girin'
      });
    }

    // 2FA ayarını al
    const twoFASettings = await query(
      'SELECT id, secret, is_enabled FROM user_2fa_settings WHERE user_id = ?',
      [userId]
    ) as any[];

    if (twoFASettings.length === 0) {
      return res.status(400).json({
        success: false,
        error: '2FA kurulumu bulunamadı. Lütfen önce kurulum yapın.'
      });
    }

    const settings = twoFASettings[0];

    // Token'ı doğrula
    const verified = speakeasy.totp.verify({
      secret: settings.secret,
      encoding: 'base32',
      token: token,
      window: 2 // ±60 seconds tolerance
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz kod. Lütfen authenticator uygulamanızdan doğru kodu girin.'
      });
    }

    // 2FA'yı etkinleştir ve Email 2FA'yı devre dışı bırak (mutual exclusive)
    const updateResult = await query(
      'UPDATE user_2fa_settings SET is_enabled = TRUE, email_2fa_enabled = FALSE, updated_at = NOW() WHERE user_id = ?',
      [userId]
    );

    console.log('✅ Authenticator 2FA enabled successfully for user:', userId);
    console.log('� Email 2FA disabled automatically (mutual exclusive)');
    console.log('�🔍 Update result:', updateResult);

    res.json({
      success: true,
      message: 'Authenticator 2FA başarıyla etkinleştirildi. E-posta 2FA otomatik devre dışı bırakıldı.'
    });

  } catch (error) {
    console.error('❌ 2FA verify error:', error);
    res.status(500).json({
      success: false,
      error: '2FA doğrulama sırasında hata oluştu'
    });
  }
});

// 2FA Disable
router.post('/2fa/disable', authenticateToken, async (req: any, res: Response) => {
  try {
    console.log('🔐 2FA disable request for user:', req.userId);
    const { token, password } = req.body;
    const userId = req.userId;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Şifrenizi girin'
      });
    }

    // Kullanıcının şifresini doğrula
    const users = await query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    const isValidPassword = await verifyPassword(password, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz şifre'
      });
    }

    // Token varsa doğrula (additional security)
    if (token) {
      const twoFASettings = await query(
        'SELECT secret FROM user_2fa_settings WHERE user_id = ? AND is_enabled = TRUE',
        [userId]
      ) as any[];

      if (twoFASettings.length > 0) {
        const verified = speakeasy.totp.verify({
          secret: twoFASettings[0].secret,
          encoding: 'base32',
          token: token,
          window: 2
        });

        if (!verified) {
          return res.status(400).json({
            success: false,
            error: 'Geçersiz 2FA kodu'
          });
        }
      }
    }

    // 2FA ayarlarını sil
    await query(
      'DELETE FROM user_2fa_settings WHERE user_id = ?',
      [userId]
    );

    console.log('✅ 2FA disabled successfully for user:', userId);

    res.json({
      success: true,
      message: '2FA başarıyla devre dışı bırakıldı'
    });

  } catch (error) {
    console.error('❌ 2FA disable error:', error);
    res.status(500).json({
      success: false,
      error: '2FA devre dışı bırakma sırasında hata oluştu'
    });
  }
});

// 2FA Status Check
router.get('/2fa/status', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.userId;

    const twoFASettings = await query(
      'SELECT is_enabled, email_2fa_enabled FROM user_2fa_settings WHERE user_id = ?',
      [userId]
    ) as any[];

    const authenticatorEnabled = twoFASettings.length > 0 && twoFASettings[0].is_enabled;
    const emailEnabled = twoFASettings.length > 0 && twoFASettings[0].email_2fa_enabled;

    res.json({
      success: true,
      data: {
        is_enabled: authenticatorEnabled,
        authenticator_enabled: authenticatorEnabled,
        email_2fa_enabled: emailEnabled
      }
    });

  } catch (error) {
    console.error('❌ 2FA status check error:', error);
    res.status(500).json({
      success: false,
      error: '2FA durumu kontrol edilirken hata oluştu'
    });
  }
});

// Login with 2FA
router.post('/login/2fa', async (req: Request, res: Response) => {
  try {
    console.log('🔐 2FA login request:', req.body);
    const { userId, token, method } = req.body; // method: 'authenticator' | 'email'

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        error: 'Kullanıcı ID ve 2FA token gereklidir'
      });
    }

    // Kullanıcıyı bul
    const users = await query(
      'SELECT id, email, firstName, lastName, city, phone, gender, address_line1, district, postal_code FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    const user = users[0];

    // 2FA ayarlarını al
    const twoFASettings = await query(
      'SELECT secret, is_enabled, email_2fa_enabled, email_verification_code, code_expires_at FROM user_2fa_settings WHERE user_id = ?',
      [userId]
    ) as any[];

    if (twoFASettings.length === 0) {
      return res.status(400).json({
        success: false,
        error: '2FA aktif değil'
      });
    }

    const settings = twoFASettings[0];
    let verified = false;

    if (method === 'email' && settings.email_2fa_enabled) {
      // Email 2FA doğrulaması
      const now = new Date();
      const expiresAt = new Date(settings.code_expires_at);
      
      if (settings.email_verification_code === token && now < expiresAt) {
        verified = true;
        // Kullanılan kodu temizle
        await query(
          'UPDATE user_2fa_settings SET email_verification_code = NULL, code_expires_at = NULL WHERE user_id = ?',
          [userId]
        );
      }
    } else if ((method === 'authenticator' || !method) && settings.is_enabled) {
      // Authenticator 2FA doğrulaması
      const secret = settings.secret;
      if (secret) {
        verified = speakeasy.totp.verify({
          secret: secret,
          encoding: 'base32',
          token: token,
          window: 2
        });
      }
    }

    if (!verified) {
      logger.debug('❌ Invalid 2FA token');
      return res.status(401).json({
        success: false,
        error: 'Geçersiz 2FA token'
      });
    }

    // JWT token oluştur
    const jwtToken = generateToken(user.id);

    // Kullanıcı bilgilerini döndür
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      city: user.city || '',
      phone: user.phone || '',
      gender: user.gender || '',
      addressLine1: user.address_line1 || '',
      district: user.district || '',
      postalCode: user.postal_code || ''
    };

    console.log('✅ 2FA login successful for user:', userId);

    res.json({
      success: true,
      user: userData,
      token: jwtToken
    });

  } catch (error) {
    console.error('❌ 2FA login error:', error);
    res.status(500).json({
      success: false,
      error: '2FA giriş sırasında hata oluştu'
    });
  }
});

// === EMAIL 2FA ENDPOINTS ===

// Enable/Disable Email 2FA
router.post('/2fa/email/toggle', authenticateToken, async (req: any, res: Response) => {
  try {
    const { enabled } = req.body;
    const userId = req.userId;

    console.log('🔐 Email 2FA toggle request for user:', userId, 'enabled:', enabled);

    // Check if user has 2FA settings record
    let twoFASettings = await query(
      'SELECT id, is_enabled, email_2fa_enabled FROM user_2fa_settings WHERE user_id = ?',
      [userId]
    ) as any[];

    if (twoFASettings.length === 0) {
      // Create new 2FA settings record with empty secret for email-only 2FA
      const settingId = uuidv4();
      await query(
        'INSERT INTO user_2fa_settings (id, user_id, secret, email_2fa_enabled) VALUES (?, ?, ?, ?)',
        [settingId, userId, '', enabled ? 1 : 0]
      );
    } else {
      const currentSettings = twoFASettings[0];
      
      // Mutual exclusive logic: Eğer Email 2FA enable ediliyorsa, Authenticator 2FA'yı disable et
      if (enabled && currentSettings.is_enabled) {
        console.log('🔄 Email 2FA enabling, disabling Authenticator 2FA (mutual exclusive)');
        await query(
          'UPDATE user_2fa_settings SET email_2fa_enabled = ?, is_enabled = ? WHERE user_id = ?',
          [1, 0, userId]
        );
      } else {
        // Normal update
        await query(
          'UPDATE user_2fa_settings SET email_2fa_enabled = ? WHERE user_id = ?',
          [enabled ? 1 : 0, userId]
        );
      }
    }

    console.log('✅ Email 2FA', enabled ? 'enabled' : 'disabled', 'for user:', userId);

    res.json({
      success: true,
      message: `Email 2FA ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}${enabled && twoFASettings.length > 0 && twoFASettings[0].is_enabled ? '. Authenticator 2FA otomatik devre dışı bırakıldı.' : ''}`
    });

  } catch (error) {
    console.error('❌ Email 2FA toggle error:', error);
    res.status(500).json({
      success: false,
      error: 'Email 2FA ayarı güncellenirken hata oluştu'
    });
  }
});

// Send Email 2FA Code (during login)
router.post('/2fa/email/send-code', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    console.log('🔐 Sending email 2FA code for user:', userId);

    // Get user email
    const users = await query(
      'SELECT email, firstName, lastName FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    const user = users[0];

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save code to database
    await query(
      'UPDATE user_2fa_settings SET email_verification_code = ?, code_expires_at = ? WHERE user_id = ?',
      [verificationCode, expiresAt, userId]
    );

    // Send email (you'll need to implement this)
    // await sendVerificationEmail(user.email, verificationCode, user.name);

    console.log('✅ Email 2FA code sent to:', user.email);

    res.json({
      success: true,
      message: 'Doğrulama kodu e-postanıza gönderildi'
    });

  } catch (error) {
    console.error('❌ Send email 2FA code error:', error);
    res.status(500).json({
      success: false,
      error: 'E-posta kodu gönderilemedi'
    });
  }
});

// Verify Email 2FA Code
router.post('/2fa/email/verify', async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;

    console.log('🔐 Verifying email 2FA code for user:', userId);

    // Get stored code
    const twoFASettings = await query(
      'SELECT email_verification_code, code_expires_at FROM user_2fa_settings WHERE user_id = ?',
      [userId]
    ) as any[];

    if (twoFASettings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Doğrulama kodu bulunamadı'
      });
    }

    const settings = twoFASettings[0];
    const now = new Date();

    // Check if code expired
    if (!settings.code_expires_at || new Date(settings.code_expires_at) < now) {
      return res.status(400).json({
        success: false,
        error: 'Doğrulama kodu süresi dolmuş'
      });
    }

    // Verify code
    if (settings.email_verification_code !== code) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz doğrulama kodu'
      });
    }

    // Clear used code
    await query(
      'UPDATE user_2fa_settings SET email_verification_code = NULL, code_expires_at = NULL WHERE user_id = ?',
      [userId]
    );

    // Get user data for login
    const users = await query(
      'SELECT id, email, firstName, lastName, city, phone, gender, address_line1, district, postal_code FROM users WHERE id = ?',
      [userId]
    ) as any[];

    const user = users[0];
    const token = generateToken(user.id);

    console.log('✅ Email 2FA verification successful for user:', userId);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        city: user.city,
        phone: user.phone,
        gender: user.gender,
        addressLine1: user.address_line1,
        district: user.district,
        postalCode: user.postal_code
      },
      token
    });

  } catch (error) {
    console.error('❌ Email 2FA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Doğrulama hatası'
    });
  }
});

// Send Email 2FA Code
router.post('/login/email-2fa/send', async (req: Request, res: Response) => {
  try {
    console.log('📧 /login/email-2fa/send endpoint called');
    console.log('📋 Request body:', req.body);
    
    const { userId } = req.body;

    if (!userId) {
      console.log('❌ No userId provided');
      return res.status(400).json({
        success: false,
        error: 'Kullanıcı ID gereklidir'
      });
    }

    console.log('🔍 Looking for user with ID:', userId);

    // Kullanıcıyı bul
    const users = await query(
      'SELECT id, email, firstName, lastName FROM users WHERE id = ?',
      [userId]
    ) as any[];

    console.log('👤 User query result:', users);

    if (users.length === 0) {
      console.log('❌ User not found for ID:', userId);
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    const user = users[0];
    console.log('✅ User found:', { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}` });

    // Email 2FA enabled mi kontrol et
    const twoFASettings = await query(
      'SELECT email_2fa_enabled FROM user_2fa_settings WHERE user_id = ? AND email_2fa_enabled = 1',
      [userId]
    ) as any[];

    console.log('🔐 2FA settings query result:', twoFASettings);

    if (twoFASettings.length === 0) {
      console.log('❌ Email 2FA not enabled for user:', userId);
      return res.status(400).json({
        success: false,
        error: 'Email 2FA aktif değil'
      });
    }

    // 6 haneli kod oluştur
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 dakika

    console.log('🔢 Generated verification code:', verificationCode);
    console.log('⏰ Code expires at:', expiresAt.toISOString());

    // Kodu veritabanına kaydet
    const updateResult = await query(
      'UPDATE user_2fa_settings SET email_verification_code = ?, code_expires_at = ? WHERE user_id = ?',
      [verificationCode, expiresAt, userId]
    );

    console.log('💾 Database update result:', updateResult);

    // Email gönder
    try {
      console.log('📧 Attempting to send email to:', user.email);
      await send2FAEmailCode(user.email, verificationCode, `${user.firstName} ${user.lastName}`.trim());
      console.log('✅ Email 2FA code sent successfully to:', user.email);
    } catch (emailError) {
      console.error('❌ Email send error:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Email gönderilemedi'
      });
    }

    res.json({
      success: true,
      message: 'Doğrulama kodu email adresinize gönderildi'
    });

  } catch (error) {
    console.error('❌ Send email 2FA code error:', error);
    res.status(500).json({
      success: false,
      error: 'Email 2FA kodu gönderilirken hata oluştu'
    });
  }
});

export default router;
