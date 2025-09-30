import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataManager, cities } from '@/lib/mockData';
import { supabaseAuthAvailable, signInWithSupabase, signUpWithSupabase } from '@/lib/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [loginData, setLoginData] = useState({
    identifier: '',
    password: ''
  });
  const [twoFA, setTwoFA] = useState<{ required: boolean; userId: string | null; code: string }>({ required: false, userId: null, code: '' });

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    city: '',
    phone: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Supabase Auth varsa onu dene, yoksa DataManager akışı
      if (supabaseAuthAvailable()) {
        try {
          await signInWithSupabase({ identifier: loginData.identifier, password: loginData.password || '123456' });
          toast.success('Hoş geldiniz!');
          onAuthSuccess();
          onClose();
          setLoginData({ identifier: '', password: '' });
          setTwoFA({ required: false, userId: null, code: '' });
          return;
        } catch (e) {
          // Supabase başarısızsa DataManager’a düşelim
        }
      }
      const res = DataManager.startLogin(loginData.identifier, loginData.password || '123456');
      if (!res) {
        toast.error('E-posta/telefon veya şifre hatalı');
      } else if (res.status === 'ok') {
        toast.success('Hoş geldiniz!');
        onAuthSuccess();
        onClose();
        setLoginData({ identifier: '', password: '' });
        setTwoFA({ required: false, userId: null, code: '' });
      } else if (res.status === '2fa') {
        setTwoFA({ required: true, userId: res.userId, code: '' });
        toast.message('Doğrulama gerekli', { description: 'Authenticator uygulamanızdaki 6 haneli kodu girin.' });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Giriş yapılırken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFA.userId) return;
    setIsLoading(true);
    try {
  const user = await DataManager.verifyAuthenticatorCode(twoFA.userId, twoFA.code);
      if (user) {
        toast.success(`Hoş geldiniz, ${user.name}!`);
        onAuthSuccess();
        onClose();
        setLoginData({ identifier: '', password: '' });
        setTwoFA({ required: false, userId: null, code: '' });
      } else {
        toast.error('Doğrulama kodu hatalı veya süresi doldu');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
  // Validation
      if (registerData.password !== registerData.confirmPassword) {
        toast.error('Şifreler eşleşmiyor');
        setIsLoading(false);
        return;
      }

      if (!registerData.name || !registerData.email || !registerData.city) {
        toast.error('Lütfen tüm alanları doldurun');
        setIsLoading(false);
        return;
      }

      // Telefonu normalize et (+90 sabit, sadece rakam, 10 hane)
      const digits = (registerData.phone || '').replace(/\D/g, '').replace(/^90/, '').slice(0, 10);
      const normalizedPhone = digits ? `+90${digits}` : '';

  let user: ReturnType<typeof DataManager.getCurrentUser> | null = null;
      if (supabaseAuthAvailable()) {
        try {
          await signUpWithSupabase({ name: registerData.name, email: registerData.email, password: registerData.password, city: registerData.city, phone: normalizedPhone });
          // Local CURRENT_USER, signUp helper içinde garanti altına alınıyor
          user = DataManager.getCurrentUser();
        } catch (e) {
          // Supabase başarısızsa local kayda düşelim
        }
      }
      if (!user) {
        user = DataManager.registerUser({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
          city: registerData.city,
          phone: normalizedPhone
        });
      }

      if (user) {
        toast.success('Hesabınız başarıyla oluşturuldu!');
        onAuthSuccess();
        onClose();
        
        // Reset form
        setRegisterData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          city: '',
          phone: ''
        });
      } else {
        toast.error('Bu e-posta veya telefon zaten kullanımda');
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('Kayıt olurken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Giriş Yap / Kayıt Ol</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Giriş Yap</TabsTrigger>
            <TabsTrigger value="register">Kayıt Ol</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Hesabınıza Giriş Yapın</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={twoFA.required ? handleVerify2FA : handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="identifier">E-posta veya Cep No</Label>
                    <Input
                      id="identifier"
                      type="text"
                      value={loginData.identifier}
                      onChange={(e) => setLoginData(prev => ({ ...prev, identifier: e.target.value }))}
                      placeholder="ornek@email.com ya da 5xx xxx xx xx"
                      disabled={twoFA.required}
                      required
                    />
                  </div>

                  
                  
                  <div>
                    <Label htmlFor="password">Şifre</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Şifrenizi girin"
                      disabled={twoFA.required}
                    />
                    
                  </div>

                  {twoFA.required && (
                    <div>
                      <Label htmlFor="twofa-code">Authenticator Kodu</Label>
                      <Input
                        id="twofa-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={twoFA.code}
                        onChange={(e) => setTwoFA(s => ({ ...s, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                        placeholder="6 haneli kod"
                        required
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (twoFA.required ? 'Doğrulanıyor...' : 'Giriş yapılıyor...') : (twoFA.required ? 'Kodu Doğrula' : 'Giriş Yap')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Yeni Hesap Oluştur</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="register-name">Ad Soyad</Label>
                    <Input
                      id="register-name"
                      type="text"
                      value={registerData.name}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Adınız ve soyadınız"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-email">E-posta</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="ornek@email.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-city">Şehir</Label>
                    <Select 
                      value={registerData.city} 
                      onValueChange={(value) => setRegisterData(prev => ({ ...prev, city: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Şehir seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="register-phone">Telefon</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">+90</span>
                      <Input
                        id="register-phone"
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="pl-12"
                        placeholder="5xx xxx xx xx"
                        value={(registerData.phone || '').replace(/^\+?90/, '').replace(/\D/g, '').slice(0, 10)}
                        onChange={(e)=>{
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setRegisterData(prev => ({ ...prev, phone: digits ? `+90${digits}` : '' }));
                        }}
                        required
                      />
                    </div>
                  </div>

                  {/* Hesap türü (Alıcı/Satıcı) kaldırıldı */}

                  <div>
                    <Label htmlFor="register-password">Şifre</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="En az 6 karakter"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-confirm-password">Şifre Tekrar</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Şifrenizi tekrar girin"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
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