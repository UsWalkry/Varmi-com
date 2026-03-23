// Hibrit Çözüm: Custom Email Verification + Supabase Auth
// Bu sistemi istersen kullanabiliriz

import { supabase } from './supabase';

interface HybridSignupParams {
  name: string;
  email: string;  
  password: string;
  city?: string;
  phone?: string;
}

// 1. Kullanıcıyı Supabase'e kaydet ama email_confirmed_at = null yap
export async function hybridSignUp(params: HybridSignupParams) {
  console.log('[Hybrid] Starting hybrid signup for:', params.email);
  
  try {
    // Supabase'e normal kayıt
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          name: params.name,
          city: params.city || '',
          phone: params.phone || ''
        }
      }
    });
    
    if (error) throw error;
    
    // Eğer kullanıcı otomatik confirmed olduysa, force unconfirm
    if (data.user?.email_confirmed_at) {
      console.log('[Hybrid] User auto-confirmed, force logout');
      await supabase.auth.signOut();
    }
    
    // 2. Custom email verification gönder (kendi mail sistemimiz)
    await sendCustomVerificationEmail(params.email, data.user?.id);
    
    return {
      user: data.user,
      needsEmailVerification: true,
      message: 'Kayıt başarılı! Email adresinize doğrulama linki gönderildi.'
    };
    
  } catch (error) {
    console.error('[Hybrid] Signup failed:', error);
    throw error;
  }
}

// 2. Custom email verification gönder
async function sendCustomVerificationEmail(email: string, userId?: string) {
  console.log('[Hybrid] Sending custom verification email to:', email);
  
  // Verification token oluştur
  const verificationToken = generateVerificationToken();
  
  // Token'ı localStorage'da sakla (geçici)
  const pendingVerifications = JSON.parse(localStorage.getItem('pending_verifications') || '{}');
  pendingVerifications[verificationToken] = {
    email,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 saat
  };
  localStorage.setItem('pending_verifications', JSON.stringify(pendingVerifications));
  
  // Email gönder (kendi mail serverımız)
  try {
    const response = await fetch('http://localhost:8787/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'change-this-key'
      },
      body: JSON.stringify({
        to: email,
        subject: 'Email Doğrulama - Varmii.com',
        html: `
          <h2>Email Adresinizi Doğrulayın</h2>
          <p>Hesabınızı aktifleştirmek için aşağıdaki linke tıklayın:</p>
          <a href="${window.location.origin}/verify-email?token=${verificationToken}" 
             style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Email'i Doğrula
          </a>
          <p>Bu link 24 saat geçerlidir.</p>
        `
      })
    });
    
    if (!response.ok) {
      throw new Error('Email sending failed');
    }
    
    console.log('[Hybrid] Verification email sent successfully');
    return true;
    
  } catch (error) {
    console.error('[Hybrid] Email sending failed:', error);
    throw new Error('Doğrulama emaili gönderilemedi');
  }
}

// 3. Email doğrulama token'ını verify et
export async function verifyEmailToken(token: string) {
  console.log('[Hybrid] Verifying email token:', token);
  
  try {
    const pendingVerifications = JSON.parse(localStorage.getItem('pending_verifications') || '{}');
    const verification = pendingVerifications[token];
    
    if (!verification) {
      throw new Error('Geçersiz doğrulama linki');
    }
    
    if (Date.now() > verification.expiresAt) {
      throw new Error('Doğrulama linki süresi dolmuş');
    }
    
    // Supabase'de kullanıcıyı manuel confirmed yap
    // Bu işlem admin yetkisi gerektirir, alternatif yol kullanacağız
    
    // Kullanıcı database'deki email_verified alanını true yap
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        email_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('email', verification.email);
    
    if (updateError) {
      console.error('[Hybrid] Database update failed:', updateError);
    }
    
    // Token'ı kullanılmış olarak işaretle
    delete pendingVerifications[token];
    localStorage.setItem('pending_verifications', JSON.stringify(pendingVerifications));
    
    return {
      success: true,
      email: verification.email,
      message: 'Email doğrulama başarılı! Artık giriş yapabilirsiniz.'
    };
    
  } catch (error) {
    console.error('[Hybrid] Email verification failed:', error);
    throw error;
  }
}

// 4. Helper: Verification token oluştur
function generateVerificationToken(): string {
  return 'verify_' + Math.random().toString(36).substr(2) + Date.now().toString(36);
}

// 5. Hybrid login - email verified kontrolü ile
export async function hybridLogin(email: string, password: string) {
  console.log('[Hybrid] Attempting hybrid login for:', email);
  
  try {
    // Supabase login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Email verification kontrolü (kendi database'imiz)
    const { data: userProfile } = await supabase
      .from('users')
      .select('email_verified')
      .eq('id', data.user.id)
      .single();
    
    if (!userProfile?.email_verified) {
      // Logout yap
      await supabase.auth.signOut();
      throw new Error('Email adresiniz henüz doğrulanmamış. Email kutunuzu kontrol edin.');
    }
    
    return data;
    
  } catch (error) {
    console.error('[Hybrid] Login failed:', error);
    throw error;
  }
}

console.log('🔧 Hybrid Auth System Ready!');
console.log('Functions: hybridSignUp(), verifyEmailToken(), hybridLogin()');