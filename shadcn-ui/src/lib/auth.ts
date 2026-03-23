import { supabase } from './supabase';
import { supabaseEnabled, ensureCurrentUserId } from './sbApi';

export function supabaseAuthAvailable() {
  return supabaseEnabled();
}

function normalizePhone(input?: string) {
  const digits = (input || '').replace(/\D/g, '').replace(/^90/, '').slice(0, 10);
  return digits ? `+90${digits}` : '';
}

// Ensure user exists in public.users table (replaced localStorage DataManager calls)
async function ensureUserInDatabase(email: string, name?: string, city?: string, phone?: string) {
  try {
    await ensureCurrentUserId(); // This will create the user if needed
    console.log('[Auth] User ensured in database:', email);
  } catch (error) {
    console.warn('[Auth] Failed to ensure user in database:', error);
  }
}

// Supabase varsayılan email doğrulama akışını kullan
export async function signUpWithSupabase(params: { name: string; email: string; password: string; city?: string; phone?: string; }) {
  if (!supabaseAuthAvailable()) throw new Error('supabase-auth-disabled');
  const { name, email, password, city, phone } = params;
  
  console.log('[Auth] Attempting Supabase signup for:', email);
  
  // Supabase'in kendi email doğrulama sistemiyle kayıt ol - EMAIL CONFIRMATION ZORUNLU
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { 
        name, 
        city: city || '', 
        phone: normalizePhone(phone)
      },
      // EMAIL CONFIRMATION ZORUNLU - redirect URL belirt
      emailRedirectTo: `${window.location.origin}/verify-email?email=${encodeURIComponent(email)}`,
      // Confirmation email gönderilmesini zorla
      captchaToken: undefined
    },
  });
  
  if (error) {
    console.error('[Auth] Signup error:', error);
    
    if (error.message.includes('already registered')) {
      throw new Error('Bu email adresi zaten kayıtlı');
    } else if (error.message.includes('Password should be at least')) {
      throw new Error('Şifre en az 8 karakter olmalı');
    } else if (error.message.includes('Invalid email')) {
      throw new Error('Geçersiz email adresi');
    } else {
      throw new Error(error.message || 'Kayıt oluşturulamadı');
    }
  }
  
  console.log('[Auth] Signup successful, checking session status');
  
  // KRITIK: Confirm email açıkken session null olur!
  if (!data.session) {
    console.log('[Auth] No session returned - email confirmation required');
    return { 
      ...data,
      needsEmailVerification: true,
      message: 'Kayıt başarılı! Email adresinize gönderilen doğrulama linkine tıklayın.'
    };
  } else {
    console.log('[Auth] Session returned - user auto-confirmed (this should not happen)');
    return { 
      ...data,
      needsEmailVerification: false,
      message: 'Kayıt başarılı! Hoş geldiniz!'
    };
  }
}

export async function signInWithSupabase(params: { identifier: string; password: string; }) {
  if (!supabaseAuthAvailable()) throw new Error('supabase-auth-disabled');
  const { identifier, password } = params;
  if (!identifier.includes('@')) throw new Error('email-required');
  
  console.log('[Auth] Attempting login for:', identifier);
  
  // Check if 2FA was just completed
  const tfaVerified = sessionStorage.getItem('2fa_verified');
  if (tfaVerified === identifier) {
    console.log('[Auth] 2FA already verified, allowing bypass');
    sessionStorage.removeItem('2fa_verified');
    // We'll still do normal login but skip 2FA check
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({ email: identifier, password });
  
  if (error) {
    console.error('[Auth] Login error:', error);
    
    // Provide user-friendly error messages  
    if (error.message.includes('Invalid login credentials')) {
      // Email format kontrolü - yeni email olabilir
      const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      
      if (isEmailFormat) {
        // Yeni email adresi ile giriş denemesi olabilir - confirmation kontrol et
        try {
          console.log('[Auth] Checking if email needs confirmation:', identifier);
          
          // Email confirmation durumunu kontrol et
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: identifier
          });
          
          if (!resendError) {
            throw new Error(`Bu email adresi henüz doğrulanmamış olabilir. ${identifier} adresine doğrulama emaili gönderildi. Email kutunuzu kontrol edin.`);
          }
        } catch (resendErr) {
          console.log('[Auth] Resend attempt result:', resendErr);
        }
      }
      
      throw new Error('Email veya şifre hatalı. Eğer yakın zamanda email değiştirdiyseniz, eski email adresinizle giriş yapın.');
    } else if (error.message.includes('Email logins are disabled')) {
      throw new Error('Email girişi şu anda devre dışı. Lütfen sistem yöneticisi ile iletişime geçin.');
    } else if (error.message.includes('Email not confirmed')) {
      // Automatically send verification code
      await sendVerificationCode(identifier);
      
      // Redirect to verification page
      const url = `/verify-email?email=${encodeURIComponent(identifier)}`;
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
      
      throw new Error('REDIRECT_TO_VERIFICATION');
    } else if (error.message.includes('Too many requests')) {
      throw new Error('Çok fazla deneme. Lütfen biraz bekleyin');
    } else if (error.message.includes('Signup is disabled')) {
      throw new Error('Yeni kayıt şu anda devre dışı.');
    } else {
      throw new Error(error.message || 'Giriş yapılamadı');
    }
  }
  
  // Successful login - check email confirmation first
  if (data.user) {
    console.log('[Auth] Login successful, checking email confirmation for:', identifier);
    
    // Email confirmation kontrolü
    if (!data.user.email_confirmed_at) {
      console.log('[Auth] Email not confirmed, sending verification');
      
      // Sign out the user
      await supabase.auth.signOut();
      
      // Send verification email
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: identifier
      });
      
      if (!resendError) {
        throw new Error(`Email adresiniz henüz doğrulanmamış! ${identifier} adresine doğrulama linki gönderildi. Email kutunuzu kontrol edin.`);
      } else {
        throw new Error('Email doğrulaması gerekli. Email adresinize gönderilen doğrulama linkine tıklayın.');
      }
    }
  }

  // Email confirmed - check if user has 2FA enabled (unless just completed 2FA)
  if (data.user && tfaVerified !== identifier) {
    console.log('[Auth] Email confirmed, checking 2FA status for:', identifier);
    
    try {
      // Primary: check via public.users by auth_user_id
      let twoFaEnabled = false;
      let twoFaMethod: string | undefined = undefined;
      try {
        const { data: twofaRow } = await supabase
          .from('users')
          .select('two_factor_enabled, two_factor_method')
          .eq('auth_user_id', data.user.id)
          .maybeSingle();
        twoFaEnabled = !!twofaRow?.two_factor_enabled;
        twoFaMethod = twofaRow?.two_factor_method as string | undefined;
      } catch (e) {
        // ignore and fallback to RPC
      }
      // Fallback: RPC by email if direct select didn't return
      if (!twoFaEnabled) {
        const { data: tfaStatus } = await supabase.rpc('get_user_2fa_status', { 
          user_email: identifier 
        });
        if (tfaStatus?.exists) {
          twoFaEnabled = !!tfaStatus.two_factor_enabled;
          twoFaMethod = tfaStatus.two_factor_method;
        }
      }

      if (twoFaEnabled) {
        console.log('[Auth] 2FA enabled for user, sending verification code');
        
        // Send verification code for 2FA
        await sendVerificationCode(identifier);
        // Persist current session tokens to restore after verification (better UX)
        try {
          const acc = data.session?.access_token;
          const ref = data.session?.refresh_token as string | undefined;
          if (acc && ref) {
            sessionStorage.setItem('2fa_pending_session', JSON.stringify({ access_token: acc, refresh_token: ref }));
          }
        } catch (e) { if (import.meta.env.DEV) console.debug('auth: persist 2fa session failed', e); }

        // Sign out temporarily until 2FA is completed
        await supabase.auth.signOut();
        
        // Redirect to verification page
        const url = `/verify-email?email=${encodeURIComponent(identifier)}&type=2fa`;
        if (typeof window !== 'undefined') {
          window.location.href = url;
        }
        
        throw new Error('2FA_VERIFICATION_REQUIRED');
      }
    } catch (tfaError) {
      console.warn('[Auth] Failed to check 2FA status:', tfaError);
      // Continue with normal login if 2FA check fails
    }
  }
  
  console.log('[Auth] Login successful for:', identifier);
  
  try { 
    const userId = await ensureCurrentUserId();
    console.log('[Auth] User ID obtained:', userId);
  } catch (err) { 
    console.warn('[Auth] Failed to get user ID:', err);
  }
  
  const meta = data.user?.user_metadata as { name?: string; city?: string; phone?: string } | undefined;
  await ensureUserInDatabase(identifier, meta?.name, meta?.city, meta?.phone);
  return data;
}

export async function sendVerificationCode(email: string) {
  if (!supabaseAuthAvailable()) throw new Error('supabase-auth-disabled');
  
  console.log('[Auth] Sending verification code to:', email);
  
  // Generate 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store verification code temporarily (you might want to store this in Supabase)
  sessionStorage.setItem(`verification_code_${email}`, JSON.stringify({
    code: verificationCode,
    timestamp: Date.now(),
    expires: Date.now() + (10 * 60 * 1000) // 10 minutes
  }));
  
  // Send email via your mail server
  try {
    const response = await fetch('http://localhost:8787/api/send', {
      method: 'POST',
      mode: 'cors', // Explicit CORS mode
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'change-this-key',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        from: 'noreply@varmii.com',
        subject: 'varmii.com - Email Doğrulama Kodu',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Doğrulama Kodu</h2>
            <p>Merhaba,</p>
            <p>varmii.com hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px;">${verificationCode}</span>
            </div>
            <p>Bu kod 10 dakika süreyle geçerlidir.</p>
            <p>Eğer bu işlemi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #888; font-size: 12px;">varmii.com ekibi</p>
          </div>
        `
      })
    });
    
    if (!response.ok) {
      // Fallback: If email failed, show code in console for testing
      console.log('🔑 EMAIL GÖNDERİLEMEDİ - DOĞRULAMA KODU:', verificationCode);
      console.log('📧 Email:', email);
      return { success: true, message: `Email gönderilemedi, ancak test için kod console'da gösteriliyor. Kod: ${verificationCode}` };
    }
    
    console.log('[Auth] Verification code sent to:', email);
    return { success: true, message: 'Doğrulama kodu email adresinize gönderildi' };
  } catch (error) {
    console.error('[Auth] Failed to send verification email:', error);
    // Fallback: Show code in console for testing
    console.log('🔑 EMAIL HATASI - DOĞRULAMA KODU:', verificationCode);
    console.log('📧 Email:', email);
    return { success: true, message: `Email server hatası, ancak test için kod: ${verificationCode}` };
  }
}

export async function verifyEmailCode(email: string, code: string) {
  if (!supabaseAuthAvailable()) throw new Error('supabase-auth-disabled');
  
  console.log('[Auth] Verifying code for:', email);
  
  // Get stored verification code
  const storedData = sessionStorage.getItem(`verification_code_${email}`);
  if (!storedData) {
    throw new Error('Doğrulama kodu bulunamadı. Yeni kod talep edin.');
  }

  const { code: storedCode, expires } = JSON.parse(storedData);

  // Check if code expired
  if (Date.now() > expires) {
    sessionStorage.removeItem(`verification_code_${email}`);
    throw new Error('Doğrulama kodu süresi dolmuş. Yeni kod talep edin.');
  }
  
  // Verify code
  if (code.trim() !== storedCode) {
    throw new Error('Doğrulama kodu hatalı.');
  }
  
  // Code is correct, clean up verification code
  sessionStorage.removeItem(`verification_code_${email}`);
  
  console.log('[Auth] Email verified successfully for:', email);
  return { success: true, message: 'Email başarıyla doğrulandı' };
}

// Doğru doğrulama akışı - URL'den token ile doğrulama
export async function completeVerificationFromUrl() {
  const params = new URLSearchParams(location.search);
  const token_hash = params.get('token_hash');
  const email = params.get('email');
  const type = params.get('type');

  console.log('[Auth] Completing verification from URL:', { token_hash: !!token_hash, email, type });

  if (token_hash && email) {
    // OTP token ile doğrulama (Supabase varsayılan)
    const { data, error } = await supabase.auth.verifyOtp({
      type: type === 'email_change' ? 'email_change' : 'signup',
      token_hash,
      email,
    });
    if (error) {
      console.error('[Auth] OTP verification error:', error);
      throw new Error(error.message || 'Doğrulama başarısız');
    }
    console.log('[Auth] OTP verification successful');
    return data;
  }

  // Magic link / hash için session kontrol et
  const { data: session } = await supabase.auth.getSession();
  if (session?.session) {
    console.log('[Auth] Active session found');
    return { session: session.session, user: session.session.user };
  }
  
  throw new Error('Doğrulama bilgisi bulunamadı. Lütfen email linkine tekrar tıklayın.');
}

export async function resendConfirmationEmail(email: string) {
  // Use our custom verification code system instead
  return await sendVerificationCode(email);
}

export async function signOutSupabase() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    if (import.meta.env.DEV) console.debug('auth: signOut failed', e);
  }
}
