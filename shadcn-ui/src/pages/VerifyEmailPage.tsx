import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import mysqlAPI from '@/lib/mysql-api';
import { CheckCircle, XCircle, Mail, Clock, AlertCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'checking' | 'success' | 'error' | 'pending'>('checking');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }

    if (token) {
      // Token ile verification
      handleTokenVerification(token);
    } else if (emailParam) {
      // Sadece email param varsa - pending durumu
      setStatus('pending');
      setMessage('Email doğrulama bekleniyor. Gelen kutunuzu kontrol edin.');
    } else {
      // Hiçbir param yoksa - hata
      setStatus('error');
      setMessage('Geçersiz doğrulama linki');
    }
  }, [token, emailParam]);

  const handleTokenVerification = async (verificationToken: string) => {
    try {
      console.log('[VerifyEmailPage] Verifying token:', verificationToken);
      
      const result = await mysqlAPI.verifyEmail(verificationToken);
      
      if (result.success) {
        setStatus('success');
        setMessage('Email adresiniz başarıyla doğrulandı! Şimdi giriş yapabilirsiniz.');
        setEmail(result.email || '');
        
        toast.success('Email doğrulandı! Giriş sayfasına yönlendiriliyorsunuz...');
        
        // 3 saniye sonra ana sayfaya yönlendir
        setTimeout(() => {
          navigate('/?login=true');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(result.message || 'Email doğrulama başarısız');
        toast.error(result.message);
      }
    } catch (error) {
      console.error('[VerifyEmailPage] Verification error:', error);
      setStatus('error');
      setMessage('Doğrulama işlemi sırasında bir hata oluştu');
      toast.error('Doğrulama işlemi başarısız');
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      toast.error('Email adresi bulunamadı');
      return;
    }

    setIsResending(true);
    try {
      toast.info('Email tekrar gönderiliyor...');
      
      const result = await mysqlAPI.resendEmailVerification(email);
      
      if (result.success) {
        toast.success('Yeni doğrulama emaili gönderildi');
      } else {
        toast.error(result.error || 'Email tekrar gönderilemedi');
      }
    } catch (error) {
      console.error('[VerifyEmailPage] Resend error:', error);
      toast.error('Email tekrar gönderilemedi');
    } finally {
      setIsResending(false);
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500" />;
      case 'pending':
        return <Mail className="w-16 h-16 text-blue-500" />;
      case 'checking':
      default:
        return <Clock className="w-16 h-16 text-gray-500 animate-spin" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'success':
        return 'Email Doğrulandı!';
      case 'error':
        return 'Doğrulama Başarısız';
      case 'pending':
        return 'Email Doğrulama Bekleniyor';
      case 'checking':
      default:
        return 'Doğrulanıyor...';
    }
  };

  return (
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
            
            {email && (
              <p className="text-sm text-gray-500">
                Email: <span className="font-medium">{email}</span>
              </p>
            )}
            
            <div className="space-y-3">
              {status === 'success' && (
                <Button 
                  onClick={() => navigate('/?login=true')} 
                  className="w-full"
                >
                  Giriş Sayfasına Git
                </Button>
              )}
              
              {status === 'error' && email && (
                <Button 
                  onClick={handleResendEmail}
                  disabled={isResending}
                  variant="outline"
                  className="w-full"
                >
                  {isResending ? 'Gönderiliyor...' : 'Doğrulama Emaili Tekrar Gönder'}
                </Button>
              )}
              
              {(status === 'pending' || status === 'error') && (
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                  className="w-full"
                >
                  Ana Sayfaya Dön
                </Button>
              )}
            </div>
            
            {status === 'pending' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 mb-1">Email doğrulama adımları:</p>
                    <ol className="text-blue-700 space-y-1">
                      <li>1. Email gelen kutunuzu kontrol edin</li>
                      <li>2. Spam klasörünü de kontrol edin</li>
                      <li>3. Doğrulama linkine tıklayın</li>
                      <li>4. Giriş yapabilirsiniz</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}