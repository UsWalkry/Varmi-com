// Custom Email Change Verification System
import { supabase } from './supabase';

interface EmailChangeResult {
  success: boolean;
  message: string;
  user_id?: string;
  old_email?: string;
  new_email?: string;
}

/**
 * Email değişikliği için hybrid verification gönder
 * Supabase auth API + custom notification
 */
export async function sendEmailChangeVerification(
  userId: string,
  currentEmail: string,
  newEmail: string,
  userName: string = 'User'
): Promise<{ success: boolean; message: string }> {
  
  try {
    console.log('[EmailChangeVerification] Starting HYBRID email change process');
    console.log('[EmailChangeVerification] Current:', currentEmail, '→ New:', newEmail);
    
    // METHOD 1: Use Supabase Auth API (this updates auth.users)
    console.log('[EmailChangeVerification] Step 1: Using Supabase auth.updateUser');
    
    const { error: updateError } = await supabase.auth.updateUser({
      email: newEmail
    });
    
    if (updateError) {
      console.error('[EmailChangeVerification] Supabase updateUser failed:', updateError);
      throw new Error('Supabase email güncellemesi başarısız: ' + updateError.message);
    }
    
    console.log('[EmailChangeVerification] Step 2: Supabase email change initiated');
    
    // METHOD 2: Send custom notification email (to new email)
    console.log('[EmailChangeVerification] Step 3: Sending custom notification email');
    
    const emailResult = await sendCustomEmailChangeNotification(
      currentEmail,
      newEmail, 
      userName
    );
    
    if (!emailResult.success) {
      console.warn('[EmailChangeVerification] Custom notification failed:', emailResult.message);
      // Don't fail the whole process, Supabase will send its own email
    }

    console.log('[EmailChangeVerification] Hybrid email change process completed');
    
    return {
      success: true,
      message: 'Email değişiklik işlemi başlatıldı'
    };

  } catch (error) {
    console.error('[EmailChangeVerification] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Email değişiklik talebi başarısız'
    };
  }
}

/**
 * Custom email change notification gönder
 */
async function sendCustomEmailChangeNotification(
  currentEmail: string,
  newEmail: string,
  userName: string
): Promise<{ success: boolean; message: string }> {
  
  try {
    console.log('[EmailChangeVerification] Sending notification email to:', newEmail);
    
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">Varmı</h1>
          <h2 style="color: #333; font-weight: normal;">Email Adresi Değişikliği Bildirimi</h2>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <p style="color: #333; margin-bottom: 15px;">Merhaba <strong>${userName}</strong>,</p>
          <p style="color: #666; margin-bottom: 15px;">
            Email adresiniz başarıyla <strong>${currentEmail}</strong> adresinden <strong>${newEmail}</strong> adresine değiştirildi.
          </p>
          <p style="color: #666; margin-bottom: 20px;">
            Supabase gelen kutunuzda ayrıca bir doğrulama emaili bulacaksınız. 
            Bu doğrulama emailindeki linke tıklayarak email değişikliğinizi tamamlayın.
          </p>
        </div>
        
        <div style="background-color: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0288d1; margin: 20px 0;">
          <p style="color: #01579b; margin: 0; font-size: 14px;">
            <strong>Önemli:</strong> Email değişikliği tamamlandıktan sonra güvenlik için oturumunuz sonlandırılacak. 
            Yeni email adresinizle tekrar giriş yapmanız gerekecektir.
          </p>
        </div>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>Güvenlik Uyarısı:</strong> Bu değişikliği siz yapmadıysanız, derhal iletişime geçin ve şifrenizi değiştirin.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #666; font-size: 12px;">
            varmii.com - Hybrid Email Change System
          </p>
        </div>
      </div>
    `;

    const response = await fetch('http://localhost:8788/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'change-this-key'
      },
      body: JSON.stringify({
        to: newEmail,
        subject: 'Email Adresi Değişikliği Onayı - Varmı',
        html: emailHTML
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Email gönderim hatası: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    console.log('[EmailChangeVerification] Email sent:', result);

    return {
      success: true,
      message: 'Email başarıyla gönderildi'
    };

  } catch (error) {
    console.error('[EmailChangeVerification] Email send error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Email gönderilemedi'
    };
  }
}

// Debug: Hybrid email change verification sistemi aktif
console.log('🔄 Hybrid Email Change System loaded (Supabase Auth + Custom Notification)');
console.log('Functions: sendEmailChangeVerification()');
console.log('Note: Uses Supabase auth.updateUser() for email change, custom notification for UX');