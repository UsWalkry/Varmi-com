import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Mail, Clock, AlertTriangle } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { verifyEmailChangeToken } from '@/lib/directEmailChange';

export default function VerifyEmailChangePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('');
  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    handleEmailChangeVerification();
  }, []);

  const handleEmailChangeVerification = async () => {
    try {
      const token = searchParams.get('token');
      const userId = searchParams.get('user_id');
      const newEmailParam = searchParams.get('new_email');
      
      if (!token || !userId || !newEmailParam) {
        setStatus('error');
        setMessage('Geçersiz doğrulama linki. Parametreler eksik.');
        return;
      }
      
      console.log('[VerifyEmailChangePage] Verifying email change:', { token, userId, newEmailParam });
      
      // Direct email change verification
      const result = await verifyEmailChangeToken(token, userId, newEmailParam);
      
      if (result.success) {
        setStatus('success');
        setMessage('Email adresiniz başarıyla değiştirildi!');
        setOldEmail(result.old_email || '');
        setNewEmail(result.new_email || '');
        
        toast.success('Email adresi değiştirildi!', {
          description: `Yeni email adresiniz: ${result.new_email}`
        });
        
        // User session'ını güncelle (logout/login gerekebilir)
        setTimeout(async () => {
          // Mevcut session'ı sonlandır
          await supabase.auth.signOut();
          
          // Login sayfasına yönlendir
          navigate('/?email-changed=true');
          
          toast.info('Güvenlik için oturumunuz sonlandırıldı', {
            description: 'Yeni email adresinizle tekrar giriş yapın'
          });
        }, 3000);
        
      } else {
        setStatus('error');
        setMessage(result.message || 'Email değişiklik doğrulaması başarısız');
        toast.error(result.message);
      }
      
    } catch (error) {
      console.error('[VerifyEmailChangePage] Verification error:', error);
      setStatus('error');
      setMessage('Email değişiklik doğrulaması sırasında bir hata oluştu');
      toast.error('Doğrulama işlemi başarısız');
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500" />;
      case 'checking':
      default:
        return <Clock className="w-16 h-16 text-gray-500 animate-spin" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'success':
        return 'Email Adresi Değiştirildi!';
      case 'error':
        return 'Email Değişikliği Başarısız';
      case 'checking':
      default:
        return 'Email Değişikliği Doğrulanıyor...';
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {getIcon()}
              </div>
              <CardTitle className="text-2xl">{getTitle()}</CardTitle>
            </CardHeader>
            
            <CardContent className="text-center space-y-6">
              <p className="text-gray-600">
                {message}
              </p>
              
              {status === 'success' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-green-800 mb-2">Email değişikliği tamamlandı!</p>
                      {oldEmail && newEmail && (
                        <div className="text-green-700 space-y-1">
                          <p><span className="font-medium">Eski:</span> {oldEmail}</p>
                          <p><span className="font-medium">Yeni:</span> {newEmail}</p>
                        </div>
                      )}
                      {!oldEmail && <p className="text-green-700">Artık yeni email adresinizle giriş yapabilirsiniz.</p>}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {status === 'success' && (
                  <Button 
                    onClick={() => navigate('/')} 
                    className="w-full"
                  >
                    Ana Sayfaya Git
                  </Button>
                )}
                
                {status === 'error' && (
                  <Button 
                    onClick={() => navigate('/')} 
                    variant="outline"
                    className="w-full"
                  >
                    Ana Sayfaya Dön
                  </Button>
                )}
              </div>
              
              {status === 'success' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left">
                  <div className="flex items-start">
                    <Mail className="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-orange-800 mb-1">Email Güncellendi:</p>
                      <p className="text-orange-700">
                        3 saniye içinde ana sayfaya yönlendirileceksiniz.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}