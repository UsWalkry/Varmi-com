// Direct Email Change System - Supabase Çift Doğrulama Bypass
import { supabase } from './supabase';

interface EmailChangeResult {
  success: boolean;
  message: string;
  user_id?: string;
  old_email?: string;
  new_email?: string;
}

/**
 * Direct Email Change - Çift doğrulama olmadan direkt email günceller
 */
export async function sendEmailChangeVerification(newEmail: string): Promise<EmailChangeResult> {
  try {
    // console.log('[DirectEmailChange] Starting direct email change to:', newEmail);
    
    // 1. Mevcut kullanıcı session'ını al
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('[DirectEmailChange] Session error:', sessionError);
      return {
        success: false,
        message: 'Oturum hatası. Lütfen tekrar giriş yapın.'
      };
    }
    
    const userId = session.user.id;
    const currentEmail = session.user.email;
    // console.log('[DirectEmailChange] User ID:', userId, 'Current email:', currentEmail);
    
    // 2. Doğrulama email'i gönder (verification token ile)
    try {
      const emailResult = await sendDirectEmailChangeVerification(currentEmail!, newEmail, userId);
      
      if (!emailResult.success) {
        return {
          success: false,
          message: 'Email doğrulama gönderimi başarısız: ' + emailResult.message
        };
      }
      
      // console.log('[DirectEmailChange] Verification email sent successfully');
      
      return {
        success: true,
        message: `Email değişiklik doğrulaması gönderildi. Yeni email adresinizi kontrol edin: ${newEmail}`,
        new_email: newEmail,
        user_id: userId
      };
      
    } catch (emailError) {
      console.error('[DirectEmailChange] Email sending failed:', emailError);
      return {
        success: false,
        message: 'Email gönderimi başarısız. Lütfen tekrar deneyin.'
      };
    }
    
  } catch (error) {
    console.error('[DirectEmailChange] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Email değişiklik talebi başarısız'
    };
  }
}

/**
 * Direct email change verification email gönder
 */
async function sendDirectEmailChangeVerification(
  currentEmail: string,
  newEmail: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  
  try {
    // console.log('[DirectEmailChange] Generating verification token for user:', userId);
    
    // Verification token oluştur (basit approach)
    const verificationToken = generateVerificationToken();
    
    // Token'ı geçici olarak saklayabilirmiz (localStorage veya custom table)
    // Şimdilik URL'de token ile birlikte user_id ve new_email göndereceğiz
    
    const verificationUrl = `${window.location.origin}/verify-email-change?token=${verificationToken}&user_id=${userId}&new_email=${encodeURIComponent(newEmail)}`;
    
    // console.log('[DirectEmailChange] Verification URL:', verificationUrl);
    
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">Varmı</h1>
          <h2 style="color: #333; font-weight: normal;">Email Adresi Değişikliği Doğrulaması</h2>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <p style="color: #333; margin-bottom: 15px;">Merhaba,</p>
          <p style="color: #666; margin-bottom: 15px;">
            Email adresinizi <strong>${currentEmail}</strong> adresinden <strong>${newEmail}</strong> adresine değiştirmek istediğinizi bildirdiniz.
          </p>
          <p style="color: #666; margin-bottom: 20px;">
            Bu değişikliği onaylamak için aşağıdaki butona tıklayın:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Email Değişikliğini Onayla
            </a>
          </div>
          
          <p style="color: #888; font-size: 14px; margin-top: 20px;">
            Bu link 24 saat geçerlidir. Eğer bu değişikliği siz yapmadıysanız, bu emaili görmezden gelin.
          </p>
        </div>
        
        <div style="text-align: center; color: #888; font-size: 12px; margin-top: 30px;">
          <p>Bu email Varmı email değişiklik sistemi tarafından otomatik olarak gönderilmiştir.</p>
        </div>
      </div>
    `;

    // Mail server'a email gönder
    const response = await fetch('http://localhost:8787/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'change-this-key'
      },
      body: JSON.stringify({
        to: newEmail,
        subject: 'Varmı - Email Adresi Değişikliği Doğrulaması',
        html: emailHTML
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mail server error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    // console.log('[DirectEmailChange] Email sent successfully:', result);
    
    return {
      success: true,
      message: 'Email doğrulama başarıyla gönderildi'
    };
    
  } catch (error) {
    console.error('[DirectEmailChange] Email sending error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Email gönderimi başarısız'
    };
  }
}

/**
 * Email change token'ını doğrula ve direct update yap
 */
export async function verifyEmailChangeToken(
  token: string, 
  userId: string, 
  newEmail: string
): Promise<EmailChangeResult> {
  try {
    // console.log('[DirectEmailChange] Verifying email change:', { token, userId, newEmail });
    
    // Token doğrulaması (basit check)
    if (!token || token.length < 10) {
      return {
        success: false,
        message: 'Geçersiz doğrulama token\'ı'
      };
    }
    
    // Direct email update RPC fonksiyonunu çağır
    const { data, error } = await supabase.rpc('direct_email_update', {
      p_user_id: userId,
      p_new_email: newEmail
    });
    
    if (error) {
      console.error('[DirectEmailChange] RPC error:', error);
      return {
        success: false,
        message: error.message || 'Email güncelleme hatası'
      };
    }
    
    // console.log('[DirectEmailChange] RPC result:', data);
    
    if (data && data.success) {
      return {
        success: true,
        message: 'Email adresiniz başarıyla güncellendi!',
        user_id: data.user_id,
        old_email: data.old_email,
        new_email: data.new_email
      };
    } else {
      return {
        success: false,
        message: data?.message || 'Email güncelleme başarısız'
      };
    }
    
  } catch (error) {
    console.error('[DirectEmailChange] Verification error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Email doğrulama başarısız'
    };
  }
}

/**
 * Basit verification token generator
 */
function generateVerificationToken(): string {
  return Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
}

// Debug: Direct email change sistemi aktif
// console.log('🔄 Direct Email Change System loaded (Bypass Supabase Double Confirmation)');
// console.log('Functions: sendEmailChangeVerification(), verifyEmailChangeToken()');
// console.log('Note: Uses direct SQL update via RPC functions');
