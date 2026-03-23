import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Bell, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth-mysql';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal-mysql';

interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
}

export default function ProfileSettings() {
  const { user: authUser } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    sms_notifications: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreateListingModalOpen, setIsCreateListingModalOpen] = useState(false);

  // Kullanıcı bildirim ayarlarını yükle
  useEffect(() => {
    if (authUser) {
      loadNotificationSettings();
    } else {
      setLoading(false);
    }
  }, [authUser]);

  const loadNotificationSettings = async () => {
    try {
  const token = localStorage.getItem('mysql-auth-token');
      const response = await fetch('/api/notifications/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        const errorText = await response.text();
        console.log('API yanıt hatası:', response.status, errorText);
        console.log('Varsayılan ayarlar kullanılıyor');
      }
    } catch (error) {
      console.error('Bildirim ayarları yüklenemedi:', error);
      toast.error('Ayarlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    loadNotificationSettings();
  };

  const testServerConnection = async () => {
    try {
      const response = await fetch('/api/auth/health', {
        method: 'GET'
      });
      
      if (response.ok) {
        console.log('✅ Server bağlantısı başarılı');
        return true;
      } else {
        console.log('⚠️ Server yanıt veriyor ama hata:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Server bağlantı hatası:', error);
      return false;
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      console.log('🔍 Kaydedilecek ayarlar:', settings);
      console.log('🔍 Auth user:', authUser);
      
  const token = localStorage.getItem('mysql-auth-token');
  console.log('🔍 Token mevcut:', token ? 'Evet' : 'Hayır');
      
      if (!token) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        setIsAuthModalOpen(true);
        return;
      }

      // Server bağlantısını test et
      console.log('🔍 Server bağlantısı test ediliyor...');
      const serverOnline = await testServerConnection();
      if (!serverOnline) {
        toast.error('🚫 Backend server çalışmıyor. Lütfen server\'ı başlatın.');
        return;
      }

      console.log('🔍 API çağrısı yapılıyor...');
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      console.log('🔍 API yanıtı:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Başarılı yanıt:', result);
        toast.success('✅ Bildirim ayarlarınız kaydedildi!');
      } else {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        
        if (response.status === 401) {
          toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
          setIsAuthModalOpen(true);
          return;
        }
        
        throw new Error(`Ayarlar kaydedilemedi: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Ayar kaydetme hatası:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('🚫 Sunucuya bağlanılamıyor. Backend server çalışıyor mu?');
      } else {
        toast.error(`Ayarlar kaydedilirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Authentication required message
  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />
        
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Settings className="w-12 h-12 text-gray-400 mx-auto" />
                <h2 className="text-xl font-semibold mb-4">🔐 Profil Ayarları Erişimi</h2>
                <p className="text-gray-600 mb-4">
                  Bildirim ayarlarına erişmek için giriş yapmanız gerekiyor.
                </p>
                <Button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                >
                  Giriş Yap
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Ayarlar yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />
      
      <div className="max-w-2xl mx-auto p-6 space-y-6 pt-20">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Profil Ayarları</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Bildirim Ayarları
          </CardTitle>
          <CardDescription>
            Hangi durumlarda bildirim almak istediğinizi seçin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Email Bildirimleri Ana Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                Email Bildirimleri
              </Label>
              <p className="text-sm text-gray-500">
                Tüm email bildirimlerini açar/kapatır
              </p>
            </div>
            <Switch
              checked={settings.email_notifications}
              onCheckedChange={(checked) => handleSettingChange('email_notifications', checked)}
            />
          </div>

          <Separator />

          {/* SMS Bildirimleri */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">SMS Bildirimleri</Label>
              <p className="text-sm text-gray-500">
                SMS ile bildirim almak istiyorsanız açın
              </p>
            </div>
            <Switch
              checked={settings.sms_notifications}
              onCheckedChange={(checked) => handleSettingChange('sms_notifications', checked)}
            />
          </div>



          <Separator />

          {/* Debug ve Kaydet Butonları */}
          <div className="space-y-3">
            {/* Debug: Server Test Butonu */}
            <Button 
              onClick={async () => {
                const isOnline = await testServerConnection();
                toast.info(isOnline ? '✅ Server çalışıyor' : '❌ Server çalışmıyor');
              }} 
              variant="outline"
              className="w-full"
            >
              🔧 Server Bağlantısını Test Et
            </Button>

            {/* Kaydet Butonu */}
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Kaydediliyor...
                </>
              ) : (
                'Ayarları Kaydet'
              )}
            </Button>
          </div>

          {/* Bilgilendirme */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">📧 Bildirim Tercihleri Hakkında</p>
                <p className="text-blue-700">
                  • Email bildirimleri: Tüm bildirimleri email ile alın<br />
                  • SMS bildirimleri: Önemli bildirimleri SMS ile alın<br />
                  • Ayarlarınızı istediğiniz zaman değiştirebilirsiniz
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}