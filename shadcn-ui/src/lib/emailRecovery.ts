// Email change recovery helper
// Bu dosya email değişikliği sonrası login sorunları için

import { supabase } from '@/lib/supabase';

export async function checkEmailChangeStatus(email: string) {
  try {
    console.log(`[EmailRecover] Checking status for: ${email}`);
    
    // 1. Public users tablosunda email var mı kontrol et
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('email, email_verified, id')
      .eq('email', email)
      .single();
    
    console.log(`[EmailRecover] Public user:`, publicUser);
    console.log(`[EmailRecover] Public error:`, publicError);
    
    // 2. Eğer public user varsa, auth durumunu test et
    let authStatus = null;
    if (publicUser) {
      try {
        // Login attempt ile auth durumunu test et (password olmadan)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: 'dummy-password-for-test'
        });
        
        authStatus = {
          loginAttempted: true,
          errorMessage: signInError?.message || 'Success'
        };
      } catch (e) {
        authStatus = { loginAttempted: false, error: (e as Error).message };
      }
    }
    
    console.log(`[EmailRecover] Auth test:`, authStatus);
    
    return {
      existsInPublic: !!publicUser,
      publicEmailVerified: publicUser?.email_verified,
      authStatus: authStatus,
      userId: publicUser?.id
    };
    
  } catch (error) {
    console.error('[EmailRecover] Check failed:', error);
    return null;
  }
}

export async function resendConfirmationForEmail(email: string) {
  try {
    console.log(`[EmailRecover] Resending confirmation to: ${email}`);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });
    
    if (error) {
      console.error('[EmailRecover] Resend failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('[EmailRecover] Confirmation email sent successfully');
    return { success: true };
    
  } catch (error) {
    console.error('[EmailRecover] Resend error:', error);
    return { success: false, error: (error as Error).message };
  }
}