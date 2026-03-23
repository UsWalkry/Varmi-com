import { useEffect } from 'react';import React, { useState, useEffect } from 'react';import React from 'react';import { useState, useEffect } from 'react';import { useState, useEffect } from 'react';import { useState, useEffect } from 'react';import { useState, useEffect } from 'react';import { useState, useEffect } from 'react';

import { useSearchParams } from 'react-router-dom';

import { useSearchParams, useNavigate } from 'react-router-dom';

export default function EmailVerification() {

  const [searchParams] = useSearchParams();import { mysqlAPI } from '@/lib/mysql-api';



  useEffect(() => {import { toast } from 'sonner';

    const token = searchParams.get('token');

    import { CheckCircle, XCircle, Loader2 } from 'lucide-react';export default function EmailVerification() {import { useSearchParams, useNavigate } from 'react-router-dom';

    if (token) {

      // Backend'in direkt HTML endpoint'ine yönlendirimport { Button } from '@/components/ui/button';

      window.location.href = `http://46.1.54.105:8787/api/auth/verify-email/${token}`;

    } else {import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';  return (

      // Token yoksa ana sayfaya yönlendir

      window.location.href = 'http://46.1.54.105:5173';

    }

  }, [searchParams]);const EmailVerification = () => {    <div>import { mysqlAPI } from '@/lib/mysql-api';import { useSearchParams, useNavigate } from 'react-router-dom';



  return (  const [searchParams] = useSearchParams();

    <div className="min-h-screen flex items-center justify-center">

      <div className="text-center">  const navigate = useNavigate();      <h1>Email Verification</h1>

        <h2 className="text-xl font-semibold mb-2">Email Doğrulanıyor...</h2>

        <p className="text-muted-foreground">Lütfen bekleyin...</p>  const [status, setStatus] = useState('loading');

      </div>

    </div>  const [message, setMessage] = useState('');      <p>Test</p>import { toast } from 'sonner';

  );

}

  useEffect(() => {    </div>

    const token = searchParams.get('token');

      );import { CheckCircle, XCircle, Loader2 } from 'lucide-react';import { mysqlAPI } from '@/lib/mysql-api';import { useNavigate, useSearchParams } from 'react-router-dom';

    if (!token) {

      setStatus('error');}

      setMessage('Doğrulama linki geçersiz. Token bulunamadı.');import { Button } from '@/components/ui/button';

      return;

    }import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';import { toast } from 'sonner';



    verifyEmailToken(token);

  }, [searchParams]);

export default function EmailVerification() {import { CheckCircle, XCircle, Loader2 } from 'lucide-react';import { Button } from '@/components/ui/button';import { useNavigate, useSearchParams } from 'react-router-dom';import { useNavigate, useSearchParams } from 'react-router-dom';

  const verifyEmailToken = async (token) => {

    try {  const [searchParams] = useSearchParams();

      setStatus('loading');

        const navigate = useNavigate();import { Button } from '@/components/ui/button';

      const response = await mysqlAPI.verifyEmail(token);

        const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

      if (response.success) {

        setStatus('success');  const [message, setMessage] = useState('');import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

        setMessage('Email adresiniz başarıyla doğrulandı! Artık hesabınızı kullanabilirsiniz.');

        toast.success('Email doğrulandı!');

        

        setTimeout(() => {  useEffect(() => {

          navigate('/');

        }, 3000);    const token = searchParams.get('token');

      } else {

        setStatus('error');    export default function EmailVerification() {import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react';import { Button } from '@/components/ui/button';import { Button } from '@/components/ui/button';

        setMessage(response.message || 'Email doğrulama başarısız oldu.');

        toast.error('Doğrulama hatası');    if (!token) {

      }

    } catch (error) {      setStatus('error');  const [searchParams] = useSearchParams();

      console.error('Email verification error:', error);

      setStatus('error');      setMessage('Doğrulama linki geçersiz. Token bulunamadı.');

      setMessage(error.message || 'Doğrulama sırasında bir hata oluştu.');

      toast.error('Doğrulama hatası');      return;  const navigate = useNavigate();import { toast } from 'sonner';

    }

  };    }



  const handleGoHome = () => {  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    navigate('/');

  };    verifyEmailToken(token);



  return (  }, [searchParams]);  const [message, setMessage] = useState('');import Header from '@/components/Header';import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">

      <Card className="w-full max-w-md">

        <CardHeader className="text-center">

          <div className="mx-auto mb-4">  const verifyEmailToken = async (token: string) => {

            {status === 'loading' && (

              <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />    try {

            )}

            {status === 'success' && (      setStatus('loading');  useEffect(() => {

              <CheckCircle className="h-16 w-16 text-green-500" />

            )}      

            {status === 'error' && (

              <XCircle className="h-16 w-16 text-red-500" />      const response = await mysqlAPI.verifyEmail(token);    const token = searchParams.get('token');

            )}

          </div>      

          

          <CardTitle className="text-2xl font-bold">      if (response.success) {    export default function EmailVerification() {import { Loader2, Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react';import { Loader2, Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

            {status === 'loading' && 'Email Doğrulanıyor...'}

            {status === 'success' && 'Email Doğrulandı!'}        setStatus('success');

            {status === 'error' && 'Doğrulama Hatası'}

          </CardTitle>        setMessage('Email adresiniz başarıyla doğrulandı! Artık hesabınızı kullanabilirsiniz.');    if (!token) {

          

          <CardDescription className="text-center mt-2">        toast.success('Email doğrulandı!');

            {message}

          </CardDescription>              setStatus('error');  const [searchParams] = useSearchParams();

        </CardHeader>

                setTimeout(() => {

        <CardContent className="text-center">

          {status === 'success' && (          navigate('/');      setMessage('Doğrulama linki geçersiz. Token bulunamadı.');

            <div className="space-y-4">

              <p className="text-sm text-muted-foreground">        }, 3000);

                3 saniye içinde ana sayfaya yönlendirileceksiniz...

              </p>      } else {      return;  const navigate = useNavigate();import { toast } from 'sonner';import { supabase } from '@/lib/supabase';

              <Button onClick={handleGoHome} className="w-full">

                Ana Sayfaya Git        setStatus('error');

              </Button>

            </div>        setMessage(response.message || 'Email doğrulama başarısız oldu.');    }

          )}

                  toast.error('Doğrulama hatası');

          {status === 'error' && (

            <div className="space-y-4">      }  const email = searchParams.get('email') || '';

              <Button onClick={handleGoHome} variant="outline" className="w-full">

                Ana Sayfaya Dön    } catch (error: any) {

              </Button>

              <Button       console.error('Email verification error:', error);    verifyEmailToken(token);

                onClick={() => window.location.reload()} 

                className="w-full"      setStatus('error');

              >

                Tekrar Dene      setMessage(error.message || 'Doğrulama sırasında bir hata oluştu.');  }, [searchParams]);  import Header from '@/components/Header';import { toast } from 'sonner';

              </Button>

            </div>      toast.error('Doğrulama hatası');

          )}

              }

          {status === 'loading' && (

            <p className="text-sm text-muted-foreground">  };

              Lütfen bekleyin...

            </p>  const verifyEmailToken = async (token: string) => {  const [isVerifying, setIsVerifying] = useState(false);

          )}

        </CardContent>  const handleGoHome = () => {

      </Card>

    </div>    navigate('/');    try {

  );

};  };



export default EmailVerification;      setStatus('loading');  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'checking' | 'success' | 'error'>('pending');import Header from '@/components/Header';

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">      

      <Card className="w-full max-w-md">

        <CardHeader className="text-center">      const response = await mysqlAPI.verifyEmail(token);  const [message, setMessage] = useState('');

          <div className="mx-auto mb-4">

            {status === 'loading' && (      

              <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />

            )}      if (response.success) {export default function EmailVerification() {import { verifyEmailToken, sendCustomEmailVerification } from '@/lib/customEmailVerification';

            {status === 'success' && (

              <CheckCircle className="h-16 w-16 text-green-500" />        setStatus('success');

            )}

            {status === 'error' && (        setMessage('Email adresiniz başarıyla doğrulandı! Artık hesabınızı kullanabilirsiniz.');  useEffect(() => {

              <XCircle className="h-16 w-16 text-red-500" />

            )}        toast.success('Email doğrulandı!');

          </div>

                      const handleTokenVerification = async () => {  const [searchParams] = useSearchParams();

          <CardTitle className="text-2xl font-bold">

            {status === 'loading' && 'Email Doğrulanıyor...'}        // 3 saniye sonra ana sayfaya yönlendir

            {status === 'success' && 'Email Doğrulandı!'}

            {status === 'error' && 'Doğrulama Hatası'}        setTimeout(() => {      const token = searchParams.get('token');

          </CardTitle>

                    navigate('/');

          <CardDescription className="text-center mt-2">

            {message}        }, 3000);        const navigate = useNavigate();export default function EmailVerification() {

          </CardDescription>

        </CardHeader>      } else {

        

        <CardContent className="text-center">        setStatus('error');      if (token) {

          {status === 'success' && (

            <div className="space-y-4">        setMessage(response.message || 'Email doğrulama başarısız oldu.');

              <p className="text-sm text-muted-foreground">

                3 saniye içinde ana sayfaya yönlendirileceksiniz...        toast.error('Doğrulama hatası');        console.log('[EmailVerification] Token found:', token);  const email = searchParams.get('email') || '';  const [searchParams] = useSearchParams();

              </p>

              <Button onClick={handleGoHome} className="w-full">      }

                Ana Sayfaya Git

              </Button>    } catch (error: any) {        setIsVerifying(true);

            </div>

          )}      console.error('Email verification error:', error);

          

          {status === 'error' && (      setStatus('error');        setVerificationStatus('checking');    const navigate = useNavigate();

            <div className="space-y-4">

              <Button onClick={handleGoHome} variant="outline" className="w-full">      setMessage(error.message || 'Doğrulama sırasında bir hata oluştu.');

                Ana Sayfaya Dön

              </Button>      toast.error('Doğrulama hatası');        

              <Button 

                onClick={() => window.location.reload()}     }

                className="w-full"

              >  };        try {  const [isVerifying, setIsVerifying] = useState(false);  const email = searchParams.get('email') || '';

                Tekrar Dene

              </Button>

            </div>

          )}  const handleGoHome = () => {          const response = await fetch(`/api/auth/verify-email/${token}`);

          

          {status === 'loading' && (    navigate('/');

            <p className="text-sm text-muted-foreground">

              Lütfen bekleyin...  };            const [isVerified, setIsVerified] = useState(false);  

            </p>

          )}

        </CardContent>

      </Card>  return (          if (response.ok) {

    </div>

  );    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">

}
      <Card className="w-full max-w-md">            console.log('[EmailVerification] ✅ Verification successful');  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'checking' | 'success' | 'error'>('pending');  const [isVerifying, setIsVerifying] = useState(false);

        <CardHeader className="text-center">

          <div className="mx-auto mb-4">            setVerificationStatus('success');

            {status === 'loading' && (

              <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />            setMessage('E-posta adresiniz başarıyla doğrulandı!');  const [message, setMessage] = useState('');  const [isVerified, setIsVerified] = useState(false);

            )}

            {status === 'success' && (            

              <CheckCircle className="h-16 w-16 text-green-500" />

            )}            toast.success('✅ E-posta doğrulama başarılı!');  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'checking' | 'success' | 'error'>('pending');

            {status === 'error' && (

              <XCircle className="h-16 w-16 text-red-500" />            setTimeout(() => navigate('/'), 2000);

            )}

          </div>          } else {  useEffect(() => {  const [message, setMessage] = useState('');

          

          <CardTitle className="text-2xl font-bold">            console.error('[EmailVerification] ❌ Verification failed');

            {status === 'loading' && 'Email Doğrulanıyor...'}

            {status === 'success' && 'Email Doğrulandı!'}            setVerificationStatus('error');    const handleTokenVerification = async () => {

            {status === 'error' && 'Doğrulama Hatası'}

          </CardTitle>            setMessage('Doğrulama linki geçersiz veya süresi dolmuş.');

          

          <CardDescription className="text-center mt-2">          }      const token = searchParams.get('token');  useEffect(() => {

            {message}

          </CardDescription>        } catch (error) {

        </CardHeader>

                  console.error('[EmailVerification] ❌ Network error:', error);          const handleTokenVerification = async () => {

        <CardContent className="text-center">

          {status === 'success' && (          setVerificationStatus('error');

            <div className="space-y-4">

              <p className="text-sm text-muted-foreground">          setMessage('Doğrulama sırasında bir hata oluştu.');      if (token) {      const token = searchParams.get('token');

                3 saniye içinde ana sayfaya yönlendirileceksiniz...

              </p>        } finally {

              <Button onClick={handleGoHome} className="w-full">

                Ana Sayfaya Git          setIsVerifying(false);        console.log('[EmailVerification] MySQL token found:', token);      

              </Button>

            </div>        }

          )}

                } else if (email) {        setIsVerifying(true);      if (token) {

          {status === 'error' && (

            <div className="space-y-4">        setVerificationStatus('pending');

              <Button onClick={handleGoHome} variant="outline" className="w-full">

                Ana Sayfaya Dön        setMessage('E-posta doğrulama bekleniyor.');        setVerificationStatus('checking');        console.log('[EmailVerification] MySQL token found:', token);

              </Button>

              <Button       }

                onClick={() => window.location.reload()} 

                className="w-full"    };                setIsVerifying(true);

              >

                Tekrar Dene

              </Button>

            </div>    handleTokenVerification();        try {        setVerificationStatus('checking');

          )}

            }, [searchParams, navigate, email]);

          {status === 'loading' && (

            <p className="text-sm text-muted-foreground">          // MySQL backend verify endpoint'ine direkt GET request        

              Lütfen bekleyin...

            </p>  const getStatusIcon = () => {

          )}

        </CardContent>    switch (verificationStatus) {          const response = await fetch(`/api/auth/verify-email/${token}`);        try {

      </Card>

    </div>      case 'checking':

  );

}        return <Loader2 className="h-16 w-16 text-blue-500 animate-spin mx-auto" />;                    // MySQL backend verify endpoint'ine direkt GET request

      case 'success':

        return <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />;          if (response.ok) {          const response = await fetch(`/api/auth/verify-email/${token}`);

      case 'error':

        return <XCircle className="h-16 w-16 text-red-500 mx-auto" />;            console.log('[EmailVerification] ✅ Email verification successful');          

      default:

        return <Mail className="h-16 w-16 text-blue-500 mx-auto" />;            setIsVerified(true);          if (response.ok) {

    }

  };            setVerificationStatus('success');            console.log('[EmailVerification] ✅ Email verification successful');



  return (            setMessage('E-posta adresiniz başarıyla doğrulandı!');            setIsVerified(true);

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">

      <Header onCreateListingClick={() => {}} />                        setVerificationStatus('success');

      

      <div className="container mx-auto px-4 py-8 max-w-md">            toast.success('✅ E-posta doğrulama başarılı!', {            setMessage('E-posta adresiniz başarıyla doğrulandı!');

        <Card className="w-full">

          <CardHeader className="text-center">              description: 'Artık hesabınıza giriş yapabilirsiniz.'            

            {getStatusIcon()}

            <CardTitle className="text-2xl font-bold mt-4">            });            toast.success('✅ E-posta doğrulama başarılı!', {

              {verificationStatus === 'success' && 'Doğrulama Başarılı!'}

              {verificationStatus === 'error' && 'Doğrulama Hatası'}                          description: 'Artık hesabınıza giriş yapabilirsiniz.'

              {verificationStatus === 'checking' && 'Doğrulanıyor...'}

              {verificationStatus === 'pending' && 'E-posta Doğrulama'}            // 2 saniye sonra login sayfasına yönlendir            });

            </CardTitle>

            <CardDescription>            setTimeout(() => navigate('/'), 2000);            

              {message}

            </CardDescription>          } else {            // 2 saniye sonra login sayfasına yönlendir

          </CardHeader>

                      const errorData = await response.text();            setTimeout(() => navigate('/'), 2000);

          <CardContent className="text-center">

            <Button             console.error('[EmailVerification] ❌ Verification failed:', errorData);          } else {

              variant="default" 

              onClick={() => navigate('/')}            setVerificationStatus('error');            const errorData = await response.text();

              className="w-full"

            >            setMessage('Doğrulama linki geçersiz veya süresi dolmuş.');            console.error('[EmailVerification] ❌ Verification failed:', errorData);

              Ana Sayfaya Dön

            </Button>          }            setVerificationStatus('error');

          </CardContent>

        </Card>        } catch (error) {            setMessage('Doğrulama linki geçersiz veya süresi dolmuş.');

      </div>

    </div>          console.error('[EmailVerification] ❌ Network error:', error);          }

  );

}          setVerificationStatus('error');        } catch (error) {

          setMessage('Doğrulama sırasında bir hata oluştu.');          console.error('[EmailVerification] ❌ Network error:', error);

        } finally {          setVerificationStatus('error');

          setIsVerifying(false);          setMessage('Doğrulama sırasında bir hata oluştu.');

        }        } finally {

      } else if (email) {          setIsVerifying(false);

        setVerificationStatus('pending');        }

        setMessage('E-posta doğrulama bekleniyor. Gelen kutunuzu kontrol edin.');      }

      }    };

    };

    handleTokenVerification();

    handleTokenVerification();          setMessage('Doğrulama işlemi sırasında bir hata oluştu');

  }, [searchParams, navigate, email]);          toast.error('Doğrulama işlemi başarısız');

        } finally {

  const resendVerification = async () => {          setIsVerifying(false);

    if (!email) return;        }

          } else if (email) {

    setIsVerifying(true);        // Sadece email param varsa - pending durumu

    try {        setVerificationStatus('pending');

      toast.success('Doğrulama e-postası yeniden gönderildi');        setMessage('Email doğrulama bekleniyor. Gelen kutunuzu kontrol edin.');

    } catch (error) {      }

      toast.error('E-posta gönderilemedi');    };

    } finally {

      setIsVerifying(false);    handleCustomTokenVerification();

    }  }, [searchParams, navigate, email]);

  };

  return (

  const getStatusIcon = () => {    <>

    switch (verificationStatus) {      <Header />

      case 'checking':      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">

        return <Loader2 className="h-16 w-16 text-blue-500 animate-spin mx-auto" />;        <Card className="w-full max-w-md">

      case 'success':          <CardHeader className="text-center">

        return <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />;            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">

      case 'error':              {verificationStatus === 'success' ? (

        return <XCircle className="h-16 w-16 text-red-500 mx-auto" />;                <CheckCircle className="w-6 h-6 text-green-600" />

      default:              ) : verificationStatus === 'error' ? (

        return <Mail className="h-16 w-16 text-blue-500 mx-auto" />;                <XCircle className="w-6 h-6 text-red-600" />

    }              ) : verificationStatus === 'checking' ? (

  };                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />

              ) : (

  return (                <Mail className="w-6 h-6 text-blue-600" />

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">              )}

      <Header onCreateListingClick={() => {}} />            </div>

                  <CardTitle>

      <div className="container mx-auto px-4 py-8 max-w-md">              {verificationStatus === 'success' ? 'Email Doğrulandı!' :

        <Card className="w-full">               verificationStatus === 'error' ? 'Doğrulama Başarısız' :

          <CardHeader className="text-center">               verificationStatus === 'checking' ? 'Doğrulanıyor...' : 'Email Doğrulama'}

            {getStatusIcon()}            </CardTitle>

            <CardTitle className="text-2xl font-bold mt-4">            <CardDescription>

              {verificationStatus === 'success' && 'Doğrulama Başarılı!'}              {verificationStatus === 'success' ? 'Hesabınız başarıyla aktifleştirildi!' :

              {verificationStatus === 'error' && 'Doğrulama Hatası'}               verificationStatus === 'error' ? 'Doğrulama işlemi başarısız oldu' :

              {verificationStatus === 'checking' && 'Doğrulanıyor...'}               verificationStatus === 'checking' ? 'Token doğrulanıyor...' : 'Email doğrulaması bekleniyor...'}

              {verificationStatus === 'pending' && 'E-posta Doğrulama'}            </CardDescription>

            </CardTitle>          </CardHeader>

            <CardDescription>

              {message}          <CardContent className="text-center space-y-4">

            </CardDescription>            <p className="text-sm text-gray-600">

          </CardHeader>              {message || (isVerified ? 'Hesabınız aktifleşti!' : `${email} adresine gönderilen doğrulama linkine tıklayın`)}

                      </p>

          <CardContent className="text-center space-y-4">            

            {verificationStatus === 'pending' && email && (            {email && (

              <div className="space-y-4">              <p className="text-xs text-gray-500">

                <p className="text-sm text-gray-600">                Email: <span className="font-medium">{email}</span>

                  <strong>{email}</strong> adresine doğrulama e-postası gönderildi.              </p>

                </p>            )}

                <Button 

                  variant="outline"             <div className="space-y-3">

                  onClick={resendVerification}              {verificationStatus === 'success' && (

                  disabled={isVerifying}                <Button onClick={() => navigate('/')} className="w-full">

                  className="w-full"                  Ana Sayfaya Dön

                >                </Button>

                  {isVerifying ? (              )}

                    <>              

                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />              {(verificationStatus === 'pending' || verificationStatus === 'error') && (

                      Gönderiliyor...                <Button variant="outline" onClick={() => navigate('/')} className="w-full">

                    </>                  Ana Sayfa

                  ) : (                </Button>

                    'Yeniden Gönder'              )}

                  )}            </div>

                </Button>            

              </div>            {verificationStatus === 'pending' && (

            )}              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">

                <div className="flex items-start">

            <Button                   <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />

              variant="default"                   <div className="text-sm">

              onClick={() => navigate('/')}                    <p className="font-medium text-blue-800 mb-1">Email doğrulama adımları:</p>

              className="w-full"                    <ol className="text-blue-700 space-y-1">

            >                      <li>1. Email gelen kutunuzu kontrol edin</li>

              Ana Sayfaya Dön                      <li>2. Spam klasörünü de kontrol edin</li>

            </Button>                      <li>3. Doğrulama linkine tıklayın</li>

          </CardContent>                      <li>4. Giriş yapabilirsiniz</li>

        </Card>                    </ol>

      </div>                  </div>

    </div>                </div>

  );              </div>

}            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
