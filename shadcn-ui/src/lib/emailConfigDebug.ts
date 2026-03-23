import { supabase } from './supabase';

export const debugEmailConfiguration = async () => {
  console.group('🔍 Supabase Email Configuration Debug');
  
  try {
    // 1. Current user bilgilerini al
    const { data: user, error: userError } = await supabase.auth.getUser();
    
    if (userError?.message === 'Auth session missing!') {
      console.log('🚨 GİRİŞ YAPMANIZ GEREKİYOR!');
      console.log('❌ Email değişikliği için önce hesabınıza giriş yapın');
      console.log('📍 Header\'daki "Giriş Yap" butonunu kullanın');
      console.groupEnd();
      return;
    }
    
    console.log('Current User:', {
      email: user?.user?.email,
      emailConfirmed: user?.user?.email_confirmed_at,
      id: user?.user?.id,
      error: userError
    });

    // 2. Auth settings'leri test et
    console.log('Supabase Client Config:', {
      clientInitialized: !!supabase ? '✅ Available' : '❌ Missing',
      authInitialized: !!supabase.auth ? '✅ Available' : '❌ Missing'
    });

    // 3. Email change test isteği gönder (gerçek değil, sadece response kontrol)
    try {
      // Sahte bir email ile test - sadece error response'u görmek için
      const testResponse = await supabase.auth.updateUser({
        email: 'test@invalid-domain-for-testing.com'
      });
      
      console.log('Test Email Change Response:', {
        data: testResponse.data,
        error: testResponse.error
      });
    } catch (testError) {
      console.log('Email Change Test Error (Expected):', testError);
    }

    // 4. Session bilgileri
    const { data: session } = await supabase.auth.getSession();
    console.log('Current Session:', {
      accessToken: session?.session?.access_token ? '✅ Available' : '❌ Missing',
      refreshToken: session?.session?.refresh_token ? '✅ Available' : '❌ Missing',
      expiresAt: session?.session?.expires_at
    });

  } catch (error) {
    console.error('Debug Error:', error);
  }
  
  console.groupEnd();
  
  // Dashboard URL'lerini göster
  console.log('📋 Supabase Dashboard Links to Check:');
  console.log('1. Authentication → Email Templates');
  console.log('2. Authentication → Settings → Email');
  console.log('3. Authentication → Settings → SMTP Settings');
  console.log('Project ID: lwpwjfuobqtfhneroqza');
  console.log('Dashboard: https://supabase.com/dashboard/project/lwpwjfuobqtfhneroqza');
  console.log('');
  console.log('🔍 ÖNEMLİ KONTROLLER:');
  console.log('• Authentication → Email Templates → "Change Email" template aktif mi?');
  console.log('• Authentication → Settings → "Enable email change confirmations" açık mı?');
  console.log('• Template içeriği boş değil mi?');
};

export const testEmailChangeFlow = async (testEmail: string) => {
  console.group('🧪 Email Change Flow Test');
  
  try {
    // Önce session kontrol et
    const { data: user, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError?.message === 'Auth session missing!') {
      console.log('🚨 GİRİŞ YAPMANIZ GEREKİYOR!');
      console.log('❌ Email değişikliği için önce hesabınıza giriş yapın');
      console.groupEnd();
      return;
    }
    
    console.log(`Testing email change from ${user?.user?.email} to: ${testEmail}`);
    
    const { data, error } = await supabase.auth.updateUser({
      email: testEmail
    });
    
    if (error) {
      console.error('❌ Email change failed:', error);
      console.log('Error details:', {
        message: error.message,
        status: error.status,
        details: error
      });
    } else {
      console.log('✅ Email change request sent successfully');
      console.log('Response data:', data);
      console.log('📧 Check your email inbox for confirmation link');
    }
    
  } catch (error) {
    console.error('Exception during email change:', error);
  }
  
  console.groupEnd();
};

// Global window fonksiyonları olarak ekle
declare global {
  interface Window {
    debugEmailConfig: () => Promise<void>;
    testEmailChange: (email: string) => Promise<void>;
    checkSupabaseSettings: () => Promise<void>;
  }
}

export const checkSupabaseEmailSettings = async () => {
  console.group('⚙️ Supabase Email Settings Check');
  
  try {
    // Auth config'ini kontrol et
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      console.log('❌ No active session - please login first');
      console.groupEnd();
      return;
    }

    console.log('🔍 Checking Supabase email functionality...');
    
    // Test password reset (email template test için)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail('test-non-existent@example.com');
      console.log('Password reset test result:', error ? 'Failed' : 'Success');
      if (error) {
        console.log('Password reset error (expected for non-existent email):', error.message);
      }
    } catch (e) {
      console.log('Password reset exception:', e);
    }

    console.log('');
    console.log('📧 Email Template Status Check:');
    console.log('1. Dashboard → Authentication → Email Templates');
    console.log('2. "Change Email" template must be enabled');
    console.log('3. "Recovery" template should work (test above)');
    
  } catch (error) {
    console.error('Settings check error:', error);
  }
  
  console.groupEnd();
};

if (typeof window !== 'undefined') {
  window.debugEmailConfig = debugEmailConfiguration;
  window.testEmailChange = testEmailChangeFlow;
  window.checkSupabaseSettings = checkSupabaseEmailSettings;
}