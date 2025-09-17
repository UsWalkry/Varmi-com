import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataManager, cities } from '@/lib/mockData';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'both',
    city: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      toast.error('E-posta ve şifre gereklidir');
      return;
    }

    setIsSubmitting(true);

    try {
      // Mock login - in real app, this would be API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user = DataManager.loginUser(loginData.email, loginData.password);
      if (user) {
        toast.success('Giriş başarılı!');
        onAuthSuccess();
        onClose();
      } else {
        toast.error('E-posta veya şifre hatalı');
      }
    } catch (error) {
      toast.error('Giriş yapılırken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerData.name || !registerData.email || !registerData.password || !registerData.city) {
      toast.error('Tüm alanları doldurun');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    if (registerData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setIsSubmitting(true);

    try {
      // Mock registration - in real app, this would be API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user = DataManager.registerUser({
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
        role: registerData.role as 'buyer' | 'seller' | 'both',
        city: registerData.city
      });

      if (user) {
        toast.success('Kayıt başarılı! Giriş yapıldı.');
        onAuthSuccess();
        onClose();
      } else {
        toast.error('Bu e-posta adresi zaten kullanılıyor');
      }
    } catch (error) {
      toast.error('Kayıt olurken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForms = () => {
    setLoginData({ email: '', password: '' });
    setRegisterData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'both',
      city: ''
    });
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Var mı?'ya Hoş Geldiniz</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Giriş Yap</TabsTrigger>
            <TabsTrigger value="register">Üye Ol</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">E-posta</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="login-password">Şifre</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
              
              <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                <p className="font-medium mb-1">Demo hesaplar:</p>
                <p>• ahmet@example.com / 123456</p>
                <p>• ayse@example.com / 123456</p>
                <p>• mehmet@example.com / 123456</p>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </Button>
            </form>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="register-name">Ad Soyad</Label>
                <Input
                  id="register-name"
                  placeholder="Adınız Soyadınız"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="register-email">E-posta</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="register-city">Şehir</Label>
                <Select value={registerData.city} onValueChange={(value) => setRegisterData({ ...registerData, city: value })}>
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
                <Label htmlFor="register-role">Hesap Türü</Label>
                <Select value={registerData.role} onValueChange={(value) => setRegisterData({ ...registerData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Sadece Alıcı</SelectItem>
                    <SelectItem value="seller">Sadece Satıcı</SelectItem>
                    <SelectItem value="both">Alıcı & Satıcı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="register-password">Şifre</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="En az 6 karakter"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="register-confirm">Şifre Tekrar</Label>
                <Input
                  id="register-confirm"
                  type="password"
                  placeholder="Şifrenizi tekrar girin"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Kayıt olunuyor...' : 'Üye Ol'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}