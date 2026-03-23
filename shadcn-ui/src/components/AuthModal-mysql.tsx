import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { mysqlAPI } from '@/lib/mysql-api';

// Turkish cities list
const cities = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 
  'Şanlıurfa', 'Gaziantep', 'Kocaeli', 'Mersin', 'Diyarbakır', 'Hatay',
  'Manisa', 'Kayseri', 'Samsun', 'Balıkesir', 'Kahramanmaraş', 'Van',
  'Aydın', 'Denizli', 'Sakarya', 'Muğla', 'Tekirdağ', 'Trabzon'
];

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  defaultTab?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, defaultTab = 'login' }: AuthModalProps) {
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [loginError, setLoginError] = useState<string | null>(null);

  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [availableMethods, setAvailableMethods] = useState<{authenticator: boolean, email: boolean}>({authenticator: false, email: false});
  const [selectedMethod, setSelectedMethod] = useState<'authenticator' | 'email'>('authenticator');

  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    gender: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);

  // defaultTab değiştiğinde activeTab'ı güncelle
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  // Şifre görünürlük state'leri
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // LOGIN HANDLER - MySQL API ile
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null); // Önceki hataları temizle

    try {
      // Validation
      if (!loginData.email || !loginData.password) {
        setLoginError('Lütfen email/telefon ve şifrenizi girin.');
        setIsLoading(false);
        return;
      }

      // Email veya telefon formatı kontrolü
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^(\+90|0)?[5]\d{9}$|^[5]\d{9}$/; // 05xxxxxxxxx, +905xxxxxxxxx veya 5xxxxxxxxx formatları
      
      if (!emailRegex.test(loginData.email) && !phoneRegex.test(loginData.email.replace(/\s/g, ''))) {
        setLoginError('Lütfen geçerli bir email adresi veya telefon numarası girin.');
        setIsLoading(false);
        return;
      }

      console.log('🟡 Sending login request:', { email: loginData.email });

      // MySQL API ile giriş yap
      const result = await mysqlAPI.login(loginData.email, loginData.password);

      console.log('🟢 Login result received:', result);

      if (result.success) {
        toast.success('🎉 Giriş başarılı!', {
          description: 'Hoş geldiniz! Anasayfaya yönlendiriliyorsunuz...'
        });
        onAuthSuccess();
        onClose();
        
        // Sayfayı yenile (auth state'i güncellemek için)
        window.location.reload();
      } else if (result.twoFactorRequired) {
        // 2FA gerekli, userId'yi kaydet ve 2FA adımına geç
        console.log('🔐 2FA required, saving userId:', result.userId);
        
        if (result.userId) {
          localStorage.setItem('pendingUserId', result.userId);
          console.log('✅ pendingUserId saved to localStorage');
        } else {
          console.log('❌ No userId received for 2FA');
        }
        
        // Available methods'u kaydet
        if (result.availableMethods) {
          setAvailableMethods(result.availableMethods);
          console.log('📱 Available 2FA methods:', result.availableMethods);
          
          // Default method seç (email öncelikli)
          if (result.availableMethods.email) {
            setSelectedMethod('email');
          } else if (result.availableMethods.authenticator) {
            setSelectedMethod('authenticator');
          }
        }
        
        setTwoFactorStep(true);
        
        const methodText = selectedMethod === 'email' ? 'Email adresinize gönderilen 6 haneli kodu girin.' : 'Authenticator uygulamanızdan 6 haneli kodu girin.';
        toast.info('🔐 2FA Doğrulaması', {
          description: methodText,
          duration: 4000
        });
      } else {
        if (result.emailVerificationRequired) {
          setLoginError('Email adresiniz doğrulanmamış. Lütfen email adresinizi kontrol edin ve doğrulama linkine tıklayın.');
          
          // Toast ile de bilgilendir
          toast.info('📧 Email Doğrulaması Gerekli', {
            description: 'Email doğrulama sayfasına yönlendiriliyorsunuz...',
            duration: 3000
          });
          
          // 2 saniye sonra yönlendir
          setTimeout(() => {
            const verifyUrl = `/verify-email?email=${encodeURIComponent(loginData.email)}`;
            window.location.href = verifyUrl;
          }, 2000);
        } else {
          // Hatalı email/şifre için spesifik mesaj
          if (result.error && result.error.includes('Geçersiz email veya şifre')) {
            setLoginError('Email adresiniz veya şifreniz yanlış. Lütfen kontrol edip tekrar deneyin.');
          } else {
            setLoginError(result.error || 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
          }
        }
      }

    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError('Giriş sırasında teknik bir sorun oluştu. Lütfen sayfayı yenileyip tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2FA TOKEN HANDLER
  const handle2FALogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!twoFactorToken || twoFactorToken.length !== 6) {
        toast.error('🔐 Geçersiz Token', {
          description: 'Lütfen 6 haneli doğrulama kodunu girin.',
          duration: 3000
        });
        setIsLoading(false);
        return;
      }

      // localStorage'dan userId al (login sırasında kaydedilecek)
      const userId = localStorage.getItem('pendingUserId');
      if (!userId) {
        toast.error('❌ Oturum Hatası', {
          description: 'Giriş bilgileri bulunamadı. Lütfen tekrar deneyin.',
          duration: 3000
        });
        setTwoFactorStep(false);
        setIsLoading(false);
        return;
      }

      const result = await mysqlAPI.loginWith2FA(userId, twoFactorToken, selectedMethod);

      console.log('🔐 2FA Login result:', result);

      if (result.success) {
        // Başarılı giriş
        console.log('✅ 2FA successful, cleaning up...');
        localStorage.removeItem('pendingUserId'); // Temizle
        toast.success('🎉 2FA Doğrulama Başarılı!', {
          description: 'Hoş geldiniz! Anasayfaya yönlendiriliyorsunuz...'
        });
        console.log('📞 Calling onAuthSuccess()...');
        onAuthSuccess();
        console.log('🚪 Calling onClose()...');
        onClose();
        
        // State'leri sıfırla
        setTwoFactorStep(false);
        setTwoFactorToken('');
        
        console.log('🔄 Reloading page...');
        // Sayfayı yenile
        window.location.reload();
      } else {
        console.log('❌ 2FA failed:', result);
        toast.error('❌ Doğrulama Başarısız', {
          description: result.error || 'Geçersiz doğrulama kodu. Lütfen tekrar deneyin.',
          duration: 4000
        });
      }

    } catch (error: any) {
      console.error('2FA login error:', error);
      toast.error('⚡ Beklenmeyen Hata', {
        description: '2FA doğrulama sırasında hata oluştu. Lütfen tekrar deneyin.',
        duration: 4000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Email 2FA kodu gönder
  const sendEmail2FACode = async () => {
    const userId = localStorage.getItem('pendingUserId');
    console.log('🔍 sendEmail2FACode called, userId from localStorage:', userId);
    
    if (!userId) {
      console.log('❌ No pendingUserId found in localStorage');
      return;
    }

    try {
      console.log('📧 Sending email 2FA code for userId:', userId);
      await mysqlAPI.sendEmail2FACode(userId);
      toast.success('📧 Kod Gönderildi', {
        description: 'Doğrulama kodu email adresinize gönderildi.',
        duration: 3000
      });
    } catch (error) {
      console.error('❌ sendEmail2FACode error:', error);
      toast.error('❌ Email Hatası', {
        description: 'Email gönderilirken hata oluştu.',
        duration: 3000
      });
    }
  };

  // Email method seçildiğinde otomatik kod gönder
  useEffect(() => {
    if (twoFactorStep && selectedMethod === 'email' && availableMethods.email) {
      sendEmail2FACode();
    }
  }, [selectedMethod, twoFactorStep]);

  // REGISTER HANDLER - MySQL API ile
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation
      if (!registerData.firstName || !registerData.lastName || !registerData.email || !registerData.phone || !registerData.password) {
        toast.error('📝 Eksik Bilgiler', {
          description: 'Lütfen tüm gerekli alanları doldurun.',
          duration: 3000
        });
        setIsLoading(false);
        return;
      }

      if (registerData.password !== registerData.confirmPassword) {
        toast.error('🔒 Şifreler Eşleşmiyor', {
          description: 'Lütfen aynı şifreyi her iki alana da girin.',
          duration: 3000
        });
        setIsLoading(false);
        return;
      }

      if (registerData.password.length < 6) {
        toast.error('🔐 Şifre Çok Kısa', {
          description: 'Şifreniz en az 6 karakter olmalıdır.',
          duration: 3000
        });
        setIsLoading(false);
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(registerData.email)) {
        toast.error('📧 Geçersiz Email', {
          description: 'Lütfen geçerli bir email adresi girin (ornek@email.com).',
          duration: 3000
        });
        setIsLoading(false);
        return;
      }

      // Telefon validation - 10 haneli olmalı
      if (registerData.phone.length !== 10) {
        toast.error('📱 Geçersiz Telefon', {
          description: 'Telefon numarası 10 haneli olmalıdır (5XX XXX XX XX).',
          duration: 3000
        });
        setIsLoading(false);
        return;
      }

      // Telefon 5 ile başlamalı (Türk cep telefonu)
      if (!registerData.phone.startsWith('5')) {
        toast.error('📱 Geçersiz Cep Telefonu', {
          description: 'Türk cep telefonu numarası 5 ile başlamalıdır (5XX XXX XX XX).',
          duration: 4000
        });
        setIsLoading(false);
        return;
      }

      // MySQL API ile kayıt ol
      console.log('🟡 Sending register request:', {
        email: registerData.email,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        phone: registerData.phone,
        hasPassword: !!registerData.password, // Don't log actual password
        gender: registerData.gender
      });
      
      const result = await mysqlAPI.register(
        registerData.email, 
        registerData.password, 
        registerData.firstName,
        registerData.lastName,
        null, // city yok
        `+90${registerData.phone}`, // +90 prefix'i ekle
        registerData.gender || null // cinsiyet
      );

      console.log('🟢 Register result received:', result);

      if (result.success) {
        if (result.emailVerificationRequired) {
          toast.success('🎉 Kayıt Başarılı!', {
            description: '📧 Email adresinize doğrulama linki gönderildi. Lütfen gelen kutunuzu kontrol edin.',
            duration: 6000
          });
          
          // Modal'ı kapat ama sayfaya yönlendirme
          onClose();
        } else {
          // Email doğrulama gerekmiyorsa direkt giriş yap
          toast.success('🎉 Kayıt Başarılı!', {
            description: 'Hesabınız oluşturuldu ve giriş yapıldı!'
          });
          onClose();
        }
      } else {
        // Farklı hata türlerine göre mesaj
        if (result.error && result.error.includes('email adresi zaten kayıtlı')) {
          toast.error('📧 Email Zaten Kayıtlı', {
            description: 'Bu email adresi ile zaten bir hesap var. Giriş yapmayı deneyin.',
            duration: 4000
          });
        } else if (result.error && result.error.includes('telefon numarası zaten kayıtlı')) {
          toast.error('📱 Telefon Numarası Zaten Kayıtlı', {
            description: 'Bu telefon numarası ile zaten bir hesap var. Giriş yapmayı deneyin.',
            duration: 4000
          });
        } else if (result.error && result.error.includes('Tüm alanlar gereklidir')) {
          toast.error('📝 Eksik Bilgiler', {
            description: 'Lütfen tüm gerekli alanları doldurun.',
            duration: 3000
          });
        } else {
          toast.error('❌ Kayıt Başarısız', {
            description: result.error || 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.',
            duration: 4000
          });
        }
      }

    } catch (error: any) {
      console.error('Register error:', error);
      
      // Artık mysql-api düzgün error response döndürecek, bu catch sadece JavaScript hatalarını yakalar
      toast.error('⚡ Beklenmeyen Hata', {
        description: 'Kayıt sırasında teknik bir sorun oluştu. Lütfen sayfayı yenileyip tekrar deneyin.',
        duration: 4000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Giriş Yap veya Kayıt Ol</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Giriş Yap</TabsTrigger>
            <TabsTrigger value="register">Kayıt Ol</TabsTrigger>
          </TabsList>

          {/* LOGIN TAB */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>{twoFactorStep ? '2FA Doğrulama' : 'Giriş Yap'}</CardTitle>
              </CardHeader>
              <CardContent>
                {!twoFactorStep ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email veya Telefon</Label>
                      <Input
                        id="email"
                        type="text"
                        placeholder="ornek@email.com veya 5551234567"
                        value={loginData.email}
                        onChange={(e) => {
                          setLoginData({...loginData, email: e.target.value});
                          setLoginError(null); // Hata mesajını temizle
                        }}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Şifre</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={(e) => {
                            setLoginData({...loginData, password: e.target.value});
                            setLoginError(null); // Hata mesajını temizle
                          }}
                          className="pr-10"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                        >
                          {showLoginPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>

                  {/* Login Error Message */}
                  {loginError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">✕</span>
                      <p className="text-sm text-red-600 flex-1">{loginError}</p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                  </Button>
                </form>
                ) : (
                  <form onSubmit={handle2FALogin} className="space-y-4">
                    {/* Method Selection */}
                    {(availableMethods.authenticator && availableMethods.email) && (
                      <div className="space-y-2">
                        <Label>Doğrulama Yöntemi</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            type="button"
                            variant={selectedMethod === 'email' ? 'default' : 'outline'}
                            onClick={() => {
                              setSelectedMethod('email');
                              sendEmail2FACode();
                            }}
                            className="text-sm"
                          >
                            📧 Email
                          </Button>
                          <Button 
                            type="button"
                            variant={selectedMethod === 'authenticator' ? 'default' : 'outline'}
                            onClick={() => setSelectedMethod('authenticator')}
                            className="text-sm"
                          >
                            📱 Authenticator
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <p className="text-sm text-muted-foreground">
                        {selectedMethod === 'email' 
                          ? 'Email adresinize gönderilen 6 haneli kodu girin.'
                          : 'Authenticator uygulamanızdan 6 haneli doğrulama kodunu girin.'
                        }
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twoFactorToken">Doğrulama Kodu</Label>
                      <Input
                        id="twoFactorToken"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="000000"
                        value={twoFactorToken}
                        onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                      />
                      {selectedMethod === 'email' && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={sendEmail2FACode}
                          className="w-full text-xs"
                        >
                          📧 Kodu Tekrar Gönder
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex-1" 
                        onClick={() => {
                          setTwoFactorStep(false);
                          setTwoFactorToken('');
                          localStorage.removeItem('pendingUserId');
                        }}
                      >
                        Geri
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1" 
                        disabled={isLoading || twoFactorToken.length !== 6}
                      >
                        {isLoading ? 'Doğrulanıyor...' : 'Doğrula'}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* REGISTER TAB */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Yeni Hesap Oluştur</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Ad</Label>
                      <Input
                        id="firstName"
                        placeholder="Adınız"
                        value={registerData.firstName}
                        onChange={(e) => setRegisterData({...registerData, firstName: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Soyad</Label>
                      <Input
                        id="lastName"
                        placeholder="Soyadınız"
                        value={registerData.lastName}
                        onChange={(e) => setRegisterData({...registerData, lastName: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerEmail">Email</Label>
                    <Input
                      id="registerEmail"
                      type="email"
                      placeholder="ornek@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <div className="flex">
                      <span className="flex items-center px-3 text-sm bg-muted border border-r-0 rounded-l-md">
                        +90
                      </span>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="5051234567"
                        value={registerData.phone}
                        onChange={(e) => {
                          // Sadece rakam girişine izin ver
                          const value = e.target.value.replace(/\D/g, '');
                          // Maksimum 10 hane
                          if (value.length <= 10) {
                            setRegisterData({...registerData, phone: value});
                          }
                        }}
                        maxLength={10}
                        className="rounded-l-none"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">10 haneli telefon numaranızı girin</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Cinsiyet (İsteğe bağlı)</Label>
                    <Select 
                      value={registerData.gender} 
                      onValueChange={(value) => setRegisterData({...registerData, gender: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Cinsiyet seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kadın">👩 Kadın</SelectItem>
                        <SelectItem value="Erkek">👨 Erkek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerPassword">Şifre</Label>
                    <div className="relative">
                      <Input
                        id="registerPassword"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                        className="pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      >
                        {showRegisterPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                        className="pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}