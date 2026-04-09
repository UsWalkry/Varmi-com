import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Doğrulama token\'ı bulunamadı.');
      return;
    }

    // Backend'e doğrulama isteği gönder
    const verifyEmail = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';
        console.log('🔍 Verifying email with:', { backendUrl, token });
        
        const response = await fetch(`${backendUrl}/api/auth/verify-email/${token}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Verification successful:', data);
          setStatus('success');
          setMessage('Email adresiniz başarıyla doğrulandı!');
          
          // 3 saniye sonra ana sayfaya yönlendir
          setTimeout(() => {
            navigate('/');
          }, 3000);
        } else {
          const errorData = await response.text();
          console.error('❌ Verification failed:', response.status, errorData);
          setStatus('error');
          setMessage('Doğrulama sırasında bir hata oluştu. Token geçersiz veya süresi dolmuş olabilir.');
        }
      } catch (error) {
        console.error('🚨 Email verification error:', error);
        setStatus('error');
        setMessage(`Doğrulama sırasında bir hata oluştu: ${error.message}. Lütfen daha sonra tekrar deneyin.`);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardContent className="p-8 text-center">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Var mıı?
            </h1>
          </div>

          {/* Status Icon */}
          <div className="mb-6">
            {status === 'loading' && (
              <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
              </div>
            )}
            
            {status === 'success' && (
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            )}
            
            {status === 'error' && (
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            {status === 'loading' && 'Email Doğrulanıyor...'}
            {status === 'success' && 'Email Doğrulandı! ✅'}
            {status === 'error' && 'Doğrulama Hatası ❌'}
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-8 leading-relaxed">
            {status === 'loading' && 'Email adresiniz doğrulanıyor, lütfen bekleyin...'}
            {message}
          </p>

          {/* Success Features */}
          {status === 'success' && (
            <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">🎉 Artık Yapabilecekleriniz:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• İlan oluşturun ve ürünlerinizi satın</li>
                <li>• Binlerce ürün arasından alışveriş yapın</li>
                <li>• Güvenli ödeme sistemi ile alışveriş edin</li>
                <li>• Anlık bildirimler alın</li>
              </ul>
            </div>
          )}

          {/* Actions */}
          {status === 'success' && (
            <div className="space-y-3">
              <Button 
                onClick={handleGoHome}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                Ana Sayfaya Git
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-sm text-gray-500">
                3 saniye sonra otomatik olarak yönlendirileceksiniz...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={handleGoHome}
                variant="outline"
                className="w-full"
              >
                Ana Sayfaya Dön
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                Tekrar Dene
              </Button>
            </div>
          )}

          {status === 'loading' && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
              </div>
              <p className="text-sm text-gray-500">Doğrulama işlemi gerçekleştiriliyor...</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              © 2025 varmii.com - Güvenilir alışveriş platformu
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}