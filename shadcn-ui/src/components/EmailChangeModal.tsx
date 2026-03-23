import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/sonner';
import { supabase } from '@/lib/supabase';
import { Mail, Clock, CheckCircle } from 'lucide-react';
import { sendEmailChangeVerification } from '@/lib/directEmailChange';

interface EmailChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  newEmail: string;
  onSuccess: () => void;
}

export default function EmailChangeModal({ isOpen, onClose, currentEmail, newEmail, onSuccess }: EmailChangeModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [emailChanged, setEmailChanged] = useState(false);

  // Modal açılınca state'i sıfırla
  useEffect(() => {
    if (isOpen) {
      setConfirmationSent(false);
      setEmailChanged(false);
      setIsProcessing(false);
      setIsCheckingStatus(false);
    }
  }, [isOpen]);

  // Email confirmation durumunu kontrol et
  const checkEmailChangeStatus = async () => {
    try {
      setIsCheckingStatus(true);
      
      const { data: user, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('[EmailChangeModal] User fetch error:', error);
        
        // Session missing - email change başarılı olmuş olabilir
        if (error.message?.includes('Auth session missing') || error.name === 'AuthSessionMissingError') {
          console.log('[EmailChangeModal] Session missing - email change likely successful');
          
          setEmailChanged(true);
          toast.success('Email değişikliği başarılı! 🎉', {
            description: `Email adresiniz ${newEmail} olarak değiştirildi. Güvenlik için oturumunuz sonlandırıldı.`
          });
          
          // User'ı logout et ve login sayfasına yönlendir
          await supabase.auth.signOut();
          
          setTimeout(() => {
            window.location.href = '/?email-changed=true';
          }, 2000);
          
          onSuccess();
          onClose();
          return;
        }
        
        toast.error('Kullanıcı bilgileri alınamadı');
        return;
      }

      console.log('[EmailChangeModal] Current user email:', user.user?.email);
      
      if (user.user?.email === newEmail) {
        setEmailChanged(true);
        toast.success('Email başarıyla değiştirildi! ✅', {
          description: `Yeni email adresiniz: ${newEmail}`
        });
        onSuccess();
        onClose();
      } else {
        toast.info('Email henüz değişmedi', {
          description: 'Lütfen email kutunuzdaki onay linkine tıklayın'
        });
      }
    } catch (error) {
      console.error('[EmailChangeModal] Email status check error:', error);
      
      // Genel hata durumu - session missing olabilir
      if (error instanceof Error && 
          (error.message?.includes('Auth session missing') || 
           error.name === 'AuthSessionMissingError')) {
        
        setEmailChanged(true);
        toast.success('Email değişikliği tamamlandı! 🎉', {
          description: 'Güvenlik için yeni email adresinizle tekrar giriş yapmanız gerekiyor.'
        });
        
        // Logout ve redirect
        await supabase.auth.signOut();
        setTimeout(() => {
          window.location.href = '/?email-changed=true';
        }, 2000);
        
        onSuccess();
        onClose();
      } else {
        toast.error('Durum kontrolü başarısız');
      }
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const sendEmailChangeRequest = async () => {
    try {
      setIsProcessing(true);
      
      console.log('[EmailChangeModal] Starting custom email change process');
      console.log('[EmailChangeModal] Current:', currentEmail, '→ New:', newEmail);
      
      // Current user'ı al
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }

      // Users tablosundan kullanıcı adını al
      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();
      
      const userName = userData?.name || user.email?.split('@')[0] || 'User';
      
      console.log('[EmailChangeModal] Sending custom email change verification');
      
      // Direct email change verification gönder
      const result = await sendEmailChangeVerification(newEmail);

      if (!result.success) {
        toast.error('Email değişiklik talebi başarısız: ' + result.message);
        return;
      }

      setConfirmationSent(true);
      console.log('[EmailChangeModal] Custom email change verification sent successfully');
      
      toast.success('Email değişiklik onayı gönderildi! 📧', {
        description: `${newEmail} adresine onay linki gönderildi. Email kutunuzu kontrol edin.`
      });

    } catch (error) {
      console.error('[EmailChangeModal] Email change request error:', error);
      toast.error('Email değişiklik talebi başarısız');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Değişikliği
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mevcut ve yeni email bilgisi */}
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Mevcut email:</span>
              <p className="mt-1 p-2 bg-muted rounded text-sm">{currentEmail}</p>
            </div>
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Yeni email:</span>
              <p className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-sm font-medium">
                {newEmail}
              </p>
            </div>
          </div>

          {/* İlk durum: Confirmation gönderme */}
          {!confirmationSent && !emailChanged && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Confirmation Email</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Kaydet butonuna tıkladığınızda yeni email adresinize bir onay linki gönderilecek.
                      Bu linke tıklayarak email değişikliğini tamamlayabilirsiniz.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                >
                  İptal
                </Button>
                <Button 
                  onClick={sendEmailChangeRequest}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Kaydet
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Confirmation gönderildi durumu */}
          {confirmationSent && !emailChanged && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">Email Gönderildi!</h4>
                    <p className="text-sm text-green-700 mt-1">
                      <strong>{newEmail}</strong> adresine onay linki gönderildi.
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Spam klasörünüzü de kontrol etmeyi unutmayın.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">Bekleme Durumu</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Email kutunuzdaki onay linkine tıklayın. Tıkladıktan sonra 
                      "Durumu Kontrol Et" butonu ile değişikliği doğrulayabilirsiniz.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                >
                  Kapat
                </Button>
                <Button 
                  onClick={checkEmailChangeStatus}
                  disabled={isCheckingStatus}
                  className="flex-1"
                >
                  {isCheckingStatus ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Kontrol ediliyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Durumu Kontrol Et
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Email değişimi tamamlandı */}
          {emailChanged && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">Email Değişikliği Tamamlandı! ✅</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Email adresiniz başarıyla <strong>{newEmail}</strong> olarak değiştirildi.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={onClose} className="w-full">
                Tamam
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}