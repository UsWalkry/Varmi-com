import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataManager, cities } from '@/lib/mockData';
import { supabaseAuthAvailable, signInWithSupabase } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { sendCustomEmailVerification, enforceEmailVerification } from '@/lib/customEmailVerification';

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

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    city: '',
    phone: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  // LOGIN HANDLER - Custom email verification ile
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (supabaseAuthAvailable()) {
        // Supabase ile giriş yap
        await signInWithSupabase({ 
          identifier: loginData.identifier, 
          password: loginData.password 
        });
        
        // Supabase session'ını al
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // CUSTOM EMAIL VERIFICATION KONTROLÜ
          const verificationResult = await enforceEmailVerification(user.id);
          
          if (!verificationResult.verified) {
            toast.error(verificationResult.message);
            return;
          }
        }
        
        toast.success('Hoş geldiniz!');
        onAuthSuccess();
        onClose();
        setLoginData({ identifier: '', password: '' });
        
      } else {
        // Fallback to local storage
        const user = DataManager.loginUser(loginData.identifier, loginData.password);
        if (!user) {
          toast.error('E-posta/telefon veya şifre hatalı');
        } else {
          toast.success('Hoş geldiniz!');
          onAuthSuccess();
          onClose();
          setLoginData({ identifier: '', password: '' });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Giriş yapılırken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // REGISTER HANDLER - Custom email verification ile
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!registerData.name.trim()) {
      toast.error('Ad Soyad zorunludur');
      return;
    }
    
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(registerData.email)) {
      toast.error('Geçerli bir e-posta adresi girin');
      return;
    }
    
    if (registerData.password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır');
      return;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(registerData.password)) {
      toast.error('Şifre büyük harf, küçük harf ve rakam içermelidir');
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    
    if (!registerData.phone || registerData.phone.length < 10) {
      toast.error('Telefon numarası en az 10 haneli olmalıdır');
      return;
    }
    
    if (!registerData.city) {
      toast.error('Şehir seçimi zorunludur');
      return;
    }

    setIsLoading(true);

    try {
      if (supabaseAuthAvailable()) {
        // 🔥 CUSTOM EMAIL VERIFICATION SYSTEM
        console.log('[AuthModal] Starting custom signup process');
        
        // 1. Supabase'e kayıt ol (Supabase email sistemini by-pass et)
        const { data, error } = await supabase.auth.signUp({
          email: registerData.email,
          password: registerData.password,
          options: {
            data: {
              name: registerData.name,
              city: registerData.city,
              phone: registerData.phone
            }
          }
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('Bu email adresi zaten kayıtlı');
          }
          throw new Error(error.message);
        }
        
        if (!data.user) {
          throw new Error('Kullanıcı oluşturulamadı');
        }
        
        console.log('[AuthModal] User created in Supabase:', data.user.id);
        
        // 2. ZORLA LOGOUT - Supabase auto-login'i engelle
        if (data.session) {
          console.log('[AuthModal] Forcing logout to prevent auto-login');
          await supabase.auth.signOut();
        }
        
        // 3. Users tablosuna kullanıcı bilgilerini ekle
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: registerData.email,
            name: registerData.name,
            city: registerData.city,
            phone: registerData.phone,
            email_verified: false,
            created_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error('[AuthModal] User insert error:', insertError);
          // Bu hata kritik değil, devam et
        }
        
        // 4. CUSTOM EMAIL VERIFICATION GÖNDER
        console.log('[AuthModal] Sending custom email verification');
        
        const verificationResult = await sendCustomEmailVerification(
          data.user.id,
          registerData.email,
          registerData.name
        );
        
        if (!verificationResult.success) {
          throw new Error('Email doğrulama gönderilirken hata: ' + verificationResult.message);
        }
        
        // 5. Başarı - Verification sayfasına yönlendir
        toast.success('Kayıt başarılı! Email adresinize doğrulama linki gönderildi.');
        onClose();
        
        // Verification sayfasına yönlendir
        const url = `/verify-email?email=${encodeURIComponent(registerData.email)}`;
        window.location.href = url;
        
        // Form'u temizle
        setRegisterData({ 
          name: '', email: '', password: '', confirmPassword: '', city: '', phone: '' 
        });
        
      } else {
        // Fallback to local storage
        const user = DataManager.registerUser({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
          city: registerData.city,
          phone: registerData.phone
        });
        
        if (user) {
          toast.success('Kayıt başarılı! Hoş geldiniz!');
          onAuthSuccess();
          onClose();
          setRegisterData({ 
            name: '', email: '', password: '', confirmPassword: '', city: '', phone: '' 
          });
        } else {
          toast.error('Bu e-posta adresi zaten kayıtlı');
        }
      }
    } catch (error) {
      console.error('[AuthModal] Register error:', error);
      const message = error instanceof Error ? error.message : 'Kayıt işlemi başarısız';
      toast.error(message);
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
          
          {/* LOGIN TAB */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Giriş Yap</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-identifier">E-posta</Label>
                    <Input
                      id="login-identifier"
                      type="email"
                      value={loginData.identifier}
                      onChange={(e) => {
                        const emailValue = e.target.value.toLowerCase().trim();
                        setLoginData(prev => ({ ...prev, identifier: emailValue }));
                      }}
                      placeholder="ornek@email.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="login-password">Şifre</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Şifreniz"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* REGISTER TAB */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Kayıt Ol</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="register-name">Ad Soyad</Label>
                    <Input
                      id="register-name"
                      value={registerData.name}
                      onChange={(e) => {
                        const nameValue = e.target.value.replace(/[^a-zA-ZçğıöşüÇĞIİÖŞÜ\s]/g, '');
                        setRegisterData(prev => ({ ...prev, name: nameValue }));
                      }}
                      placeholder="Adınız Soyadınız"
                      maxLength={50}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-email">E-posta</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => {
                        const emailValue = e.target.value.toLowerCase().trim();
                        setRegisterData(prev => ({ ...prev, email: emailValue }));
                      }}
                      placeholder="ornek@email.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-city">Şehir</Label>
                    <Select value={registerData.city} onValueChange={(value) => setRegisterData(prev => ({ ...prev, city: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Şehir seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="register-phone">Telefon</Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      value={registerData.phone}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, '');
                        setRegisterData(prev => ({ ...prev, phone: numericValue }));
                      }}
                      placeholder="05XXXXXXXXX"
                      maxLength={11}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-password">Şifre</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="En az 8 karakter, büyük/küçük harf ve rakam"
                      minLength={8}
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