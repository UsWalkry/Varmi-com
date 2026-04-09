import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Mail, Smartphone, Key } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Header from '@/components/Header';

export default function SecuritySettings() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [tfaMethod, setTfaMethod] = useState('email');

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('Kullanıcı bilgileri bulunamadı');
        return;
      }

      setUserEmail(user.email);

      // Get 2FA status
      const { data: tfaStatus } = await supabase.rpc('get_user_2fa_status', { 
        user_email: user.email 
      });

      if (tfaStatus?.exists) {
        setTfaEnabled(tfaStatus.two_factor_enabled || false);
        setTfaMethod(tfaStatus.two_factor_method || 'email');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Ayarlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const updateTfaSettings = async (enabled: boolean) => {
    setUpdating(true);
    try {
      const { data: result } = await supabase.rpc('update_user_2fa_settings', {
        user_email: userEmail,
        enabled: enabled,
        method: tfaMethod
      });

      if (result?.success) {
        setTfaEnabled(enabled);
        toast.success(
          enabled 
            ? '2FA email güvenlik aktif edildi' 
            : '2FA email güvenlik devre dışı bırakıldı'
        );
      } else {
        toast.error('Ayarlar güncellenemedi');
      }
    } catch (error) {
      console.error('Failed to update 2FA:', error);
      toast.error('Güvenlik ayarları güncellenemedi');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Güvenlik Ayarları</h1>
          <p className="text-gray-600">Hesabınızın güvenlik ayarlarını yönetin</p>
        </div>

        {/* 2FA Email Settings */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              <CardTitle>İki Faktörlü Doğrulama (2FA)</CardTitle>
            </div>
            <CardDescription>
              Hesabınıza her giriş yaptığınızda email ile doğrulama kodu isteriz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <div>
                  <Label className="text-sm font-medium">Email Doğrulama</Label>
                  <p className="text-sm text-gray-500">
                    Her giriş sırasında email adresinize 6 haneli kod gönderilir
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {tfaEnabled && (
                  <Badge variant="secondary" className="text-green-700 bg-green-100">
                    Aktif
                  </Badge>
                )}
                <Switch
                  checked={tfaEnabled}
                  onCheckedChange={updateTfaSettings}
                  disabled={updating}
                />
              </div>
            </div>

            {tfaEnabled && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 text-orange-800">
                  <Key className="h-4 w-4" />
                  <span className="text-sm font-medium">2FA Aktif</span>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  Hesabınıza her giriş yaptığınızda <strong>{userEmail}</strong> adresine 
                  doğrulama kodu gönderilecek.
                </p>
              </div>
            )}

            {!tfaEnabled && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">Güvenlik Önerisi</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Hesabınızın güvenliği için 2FA aktif etmenizi öneririz.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future Security Features */}
        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-gray-400" />
              <CardTitle className="text-gray-500">SMS Doğrulama</CardTitle>
              <Badge variant="outline">Yakında</Badge>
            </div>
            <CardDescription>
              Telefon numaranıza SMS ile doğrulama kodu (yakında geliyor)
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}