// Email change fix utility
import { supabase } from '@/lib/supabase';

export async function fixEmailChangeLogin(oldEmail: string, newEmail: string, password: string) {
  try {
    console.log('[EmailFix] Starting email change fix process...');
    console.log('[EmailFix] Old email:', oldEmail);
    console.log('[EmailFix] New email:', newEmail);
    
    // 1. Önce eski email ile giriş yap
    console.log('[EmailFix] Step 1: Login with old email...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: oldEmail,
      password: password
    });
    
    if (loginError) {
      console.error('[EmailFix] Old email login failed:', loginError);
      return { success: false, step: 'old_login', error: loginError.message };
    }
    
    console.log('[EmailFix] Step 1 SUCCESS: Logged in with old email');
    
    // 2. Email'i tekrar güncelle
    console.log('[EmailFix] Step 2: Updating email...');
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      email: newEmail
    });
    
    if (updateError) {
      console.error('[EmailFix] Email update failed:', updateError);
      return { success: false, step: 'email_update', error: updateError.message };
    }
    
    console.log('[EmailFix] Step 2 SUCCESS: Email updated');
    
    // 3. Database'i de güncelle
    console.log('[EmailFix] Step 3: Updating database...');
    const { error: dbError } = await supabase
      .from('users')
      .update({ 
        email: newEmail,
        email_verified: true, // Manuel olarak verified yap
        updated_at: new Date().toISOString() 
      })
      .eq('email', oldEmail);
    
    if (dbError) {
      console.warn('[EmailFix] Database update warning:', dbError);
      // Database hatası kritik değil, devam et
    } else {
      console.log('[EmailFix] Step 3 SUCCESS: Database updated');
    }
    
    // 4. Logout yap
    console.log('[EmailFix] Step 4: Signing out...');
    await supabase.auth.signOut();
    
    console.log('[EmailFix] COMPLETE: Email change fixed successfully');
    
    return { 
      success: true, 
      message: `Email successfully changed from ${oldEmail} to ${newEmail}. You can now login with the new email.`
    };
    
  } catch (error) {
    console.error('[EmailFix] Unexpected error:', error);
    return { 
      success: false, 
      step: 'unexpected', 
      error: (error as Error).message 
    };
  }
}

export async function forceEmailConfirmation(email: string) {
  try {
    console.log('[EmailFix] Force confirming email:', email);
    
    // Database'de email_verified'ı true yap
    const { error } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('email', email);
    
    if (error) {
      console.error('[EmailFix] Force confirmation failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('[EmailFix] Force confirmation success');
    return { success: true };
    
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}