// CUSTOM EMAIL VERIFICATION SYSTEM
// Supabase'den tamamen bağımsız email verification sistemi

import { supabase } from './supabase';

export interface EmailVerificationResult {
  success: boolean;
  message: string;
  token?: string;
}

export interface EmailVerifyResult {
  success: boolean;
  message: string;
  user_id?: string;
  email?: string;
}

/**
 * Kullanıcı kayıt olduktan sonra email verification token oluştur ve email gönder
 */
export async function sendCustomEmailVerification(
  userId: string, 
  email: string, 
  name?: string
): Promise<EmailVerificationResult> {
  console.log('[CustomEmailVerification] Starting verification for:', email);
  
  try {
    // 1. Database'de verification token oluştur
    const { data, error } = await supabase.rpc('generate_email_verification_token', {
      p_user_id: userId,
      p_email: email,
      p_ip_address: getClientIP(),
      p_user_agent: navigator.userAgent
    });
    
    if (error) {
      console.error('[CustomEmailVerification] Token generation failed:', error);
      throw new Error('Token oluşturulamadı: ' + error.message);
    }
    
    const token = data;
    console.log('[CustomEmailVerification] Token generated:', token);
    
    // 2. Email gönder (kendi mail serverimiz)
    const emailSent = await sendVerificationEmail(email, token, name);
    
    if (!emailSent) {
      throw new Error('Email gönderilemedi');
    }
    
    console.log('[CustomEmailVerification] Email sent successfully');
    
    return {
      success: true,
      message: 'Doğrulama emaili gönderildi',
      token
    };
    
  } catch (error) {
    console.error('[CustomEmailVerification] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Bilinmeyen hata'
    };
  }
}

/**
 * Email verification token'ını doğrula
 */
export async function verifyEmailToken(token: string): Promise<EmailVerifyResult> {
  console.log('[CustomEmailVerification] Verifying token:', token);
  
  try {
    const { data, error } = await supabase.rpc('verify_email_token', {
      p_token: token
    });
    
    if (error) {
      console.error('[CustomEmailVerification] Verification failed:', error);
      throw new Error('Doğrulama başarısız: ' + error.message);
    }
    
    const result = data[0]; // RPC returns array
    
    if (!result.success) {
      return {
        success: false,
        message: result.message
      };
    }
    
    console.log('[CustomEmailVerification] Email verified successfully:', result.email);
    
    return {
      success: true,
      message: result.message,
      user_id: result.user_id,
      email: result.email
    };
    
  } catch (error) {
    console.error('[CustomEmailVerification] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Doğrulama başarısız'
    };
  }
}

/**
 * Kullanıcının email verification durumunu kontrol et
 */
export async function checkEmailVerificationStatus(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email_verified')
      .eq('id', userId);
    
    if (error) {
      console.error('[CustomEmailVerification] Status check failed:', error);
      return false;
    }
    
    // User kaydı yoksa false dön
    if (!data || data.length === 0) {
      console.log('[CustomEmailVerification] No user record found for:', userId);
      return false;
    }
    
    return data[0]?.email_verified === true;
    
  } catch (error) {
    console.error('[CustomEmailVerification] Status check error:', error);
    return false;
  }
}

/**
 * Email verification zorunluluğu - kullanıcının giriş yapmasını engelle
 */
export async function enforceEmailVerification(userId: string): Promise<{verified: boolean, message?: string}> {
  try {
    console.log('[CustomEmailVerification] Checking verification status for user:', userId);
    
    // User'ı auth'dan al
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { verified: false, message: 'Kullanıcı bulunamadı' };
    }
    
    // Users tablosunda kayıt var mı kontrol et
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('id', userId);
    
    if (userError || !userData || userData.length === 0) {
      console.log('[CustomEmailVerification] User not found in public.users, creating record...');
      
      // User kaydı yoksa oluştur
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email_verified: false,
          created_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('[CustomEmailVerification] Failed to create user record:', insertError);
      }
      
      return {
        verified: false,
        message: 'Email adresinizi doğrulamanız gerekiyor. Email kutunuzu kontrol edin.'
      };
    }
    
    const isCustomVerified = userData[0]?.email_verified === true;
    
    // ÖNCE Supabase native email_confirmed_at kontrolü yap
    const { data: authUser } = await supabase.auth.getUser();
    const isSupabaseVerified = authUser.user?.email_confirmed_at !== null;
    
    console.log('[CustomEmailVerification] Custom verified:', isCustomVerified);
    console.log('[CustomEmailVerification] Supabase verified:', isSupabaseVerified);
    
    // Eğer Supabase'de verified ise custom verification'ı da güncelle
    if (isSupabaseVerified && !isCustomVerified) {
      console.log('[CustomEmailVerification] Syncing custom verification with Supabase...');
      await supabase
        .from('users')
        .update({ email_verified: true })
        .eq('id', userId);
    }
    
    const finallyVerified = isSupabaseVerified || isCustomVerified;
    
    if (!finallyVerified) {
      console.log('[CustomEmailVerification] User email not verified, signing out...');
      
      // Kullanıcıyı logout et
      await supabase.auth.signOut();
      
      return {
        verified: false,
        message: 'Email adresinizi doğrulamanız gerekiyor. Email kutunuzu kontrol edin.'
      };
    }
    
    console.log('[CustomEmailVerification] User email verified successfully');
    return { verified: true };
    
  } catch (error) {
    console.error('[CustomEmailVerification] Enforce verification error:', error);
    return { 
      verified: false, 
      message: 'Email doğrulama kontrolü yapılırken hata oluştu'
    };
  }
}

/**
 * Email gönderme fonksiyonu (mail serverimiz)
 */
async function sendVerificationEmail(email: string, token: string, name?: string): Promise<boolean> {
  console.log('[CustomEmailVerification] Sending email to:', email);
  
  const verificationUrl = `${window.location.origin}/verify-email?token=${token}`;
  
  try {
    const response = await fetch('http://localhost:8787/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'change-this-key'
      },
      body: JSON.stringify({
        to: email,
        subject: 'Email Doğrulama - Varmii',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">📧 Email Doğrulama</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Varmii hesabınızı aktifleştirin</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              ${name ? `<p>Merhaba <strong>${name}</strong>,</p>` : '<p>Merhaba,</p>'}
              
              <p>Varmii hesabınızı oluşturduğunuz için teşekkürler! Hesabınızı aktifleştirmek için aşağıdaki butona tıklayın:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                  ✅ Email Adresimi Doğrula
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Eğer buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırın:<br>
                <code style="background: #e9ecef; padding: 5px; border-radius: 3px; word-break: break-all;">${verificationUrl}</code>
              </p>
              
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
              
              <p style="color: #666; font-size: 12px;">
                • Bu link 24 saat geçerlidir<br>
                • Eğer bu işlemi siz yapmadıysanız, bu emaili dikkate almayın<br>
                • Hesabınıza giriş yapabilmek için email doğrulaması zorunludur
              </p>
            </div>
          </div>
        `
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CustomEmailVerification] Email send failed:', response.status, errorText);
      return false;
    }
    
    const result = await response.json();
    console.log('[CustomEmailVerification] Email send result:', result);
    
    return result.ok === true;
    
  } catch (error) {
    console.error('[CustomEmailVerification] Email send error:', error);
    return false;
  }
}

/**
 * Client IP address al (approximate)
 */
function getClientIP(): string | null {
  // Bu browser'da tam olarak alınamaz, server-side gerekir
  // Şimdilik null döndürüyoruz
  return null;
}

/**
 * Email verification için yardımcı fonksiyonlar
 */
export const EmailVerificationUtils = {
  /**
   * Token'dan email çıkar (URL'den)
   */
  extractTokenFromURL(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  },
  
  /**
   * Email'den token çıkar (URL'den) - eski sistem uyumluluğu için
   */
  extractEmailFromURL(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('email');
  },
  
  /**
   * Verification sayfasına yönlendir
   */
  redirectToVerification(email?: string, token?: string): void {
    let url = '/verify-email';
    const params = new URLSearchParams();
    
    if (email) params.set('email', email);
    if (token) params.set('token', token);
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    window.location.href = url;
  }
};

console.log('🔒 Custom Email Verification System loaded');
console.log('Functions: sendCustomEmailVerification(), verifyEmailToken(), checkEmailVerificationStatus()');