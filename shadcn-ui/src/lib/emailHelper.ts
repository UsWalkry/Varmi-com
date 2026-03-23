// Email change confirmation helper
// Bu dosya email değişikliği sonrası durumu test etmek için

import { supabase } from '@/lib/supabase';

export async function checkEmailChangeStatus() {
  try {
    // Mevcut kullanıcı bilgilerini al
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user found');
      return null;
    }

    console.log('Current user info:', {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata
    });

    return user;
  } catch (error) {
    console.error('Error checking email status:', error);
    return null;
  }
}

export async function resendEmailConfirmation(email: string) {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });

    if (error) {
      console.error('Resend confirmation error:', error);
      return { success: false, error: error.message };
    }

    console.log('Confirmation email resent successfully');
    return { success: true };
  } catch (error) {
    console.error('Resend confirmation failed:', error);
    return { success: false, error: (error as Error).message };
  }
}