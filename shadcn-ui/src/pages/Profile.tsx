import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import CreateListingModal from '@/components/CreateListingModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataManager, User } from '@/lib/mockData';
import { useAuth } from '@/hooks/use-auth-mysql';
import { mysqlAPI } from '@/lib/mysql-api';
import { toast } from '@/lib/sonner';

import AuthModal from '@/components/AuthModal-mysql';
import GeneralInfoForm from '@/components/profile/GeneralInfoForm-mysql';
import AuthenticatorSetupDialog from '@/components/AuthenticatorSetupDialog';
import AddressBook from '@/components/profile/AddressBook';
import SellerProfileTab from '@/components/profile/SellerProfileTab';

export default function Profile() {
  const navigate = useNavigate();
  const { user: authUser, login } = useAuth();
  
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL LOGIC
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hesap, setHesap] = useState({
    oldPassword: '',
    newPassword: '',
    newPassword2: '',
    twoFactor: {
      sms: false,
      authenticator: false,
      email: true,
    },
  });
  const [bildirim, setBildirim] = useState({ email: true, sms: false });
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'genel'|'adresler'|'guvenlik'|'bildirimler'>('genel');
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean; action: 'password'|'delete'|'freeze'|null}>({open:false, action:null});

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authenticatorDialogOpen, setAuthenticatorDialogOpen] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState<boolean>(false);
  const [disablePasswordDialog, setDisablePasswordDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [isCreateListingModalOpen, setIsCreateListingModalOpen] = useState(false);
  
  // URL'den tab parametresini oku
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['genel', 'adresler', 'guvenlik', 'bildirimler'].includes(tab)) {
      setActiveTab(tab as 'genel'|'adresler'|'guvenlik'|'bildirimler');
    }
  }, [searchParams]);
  
  // Load user data on component mount
  useEffect(() => {
    const loadUser = async () => {
      console.log('🔄 loadUser useEffect tetiklendi!');
      console.log('👤 authUser durumu:', authUser);
      
      try {
        // Check if user is authenticated using MySQL auth system
        if (!authUser) {
          console.log('❌ Profile: No authenticated user, showing login message');
          setLoading(false);
          return;
        }
        
        console.log('✅ User authenticated, loading profile data...');

        // Kullanıcı ayarlarını veritabanından ve localStorage'dan yükle
        let userSettings = {
          twoFactor: { sms: false, authenticator: false, email: true },
          notifications: { email: true, sms: false }
        };

        // Önce localStorage'dan yükle
        const settingsKey = `user_settings_${authUser.id}`;
        const savedSettings = localStorage.getItem(settingsKey);
        
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            userSettings = { ...userSettings, ...parsed };
          } catch (error) {
            console.warn('Failed to parse user settings:', error);
          }
        }

        // Bildirim ayarlarını veritabanından yükle
        try {
          const notificationData = await mysqlAPI.getNotificationSettings();
          if (notificationData?.email_notifications !== undefined) {
            userSettings.notifications = {
              email: Boolean(notificationData.email_notifications),
              sms: Boolean(notificationData.sms_notifications)
            };
          } else if (notificationData?.data) {
            userSettings.notifications = {
              email: Boolean(notificationData.data.email_notifications),
              sms: Boolean(notificationData.data.sms_notifications)
            };
          }
        } catch (error) {
          console.warn('Bildirim ayarları yüklenemedi:', error);
        }
        
        // User is authenticated, set user data directly from auth context
        setUser({
          id: authUser.id,
          name: `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() || authUser.email.split('@')[0],
          email: authUser.email,
          phone: authUser.phone || '',
          city: authUser.city || '',
          rating: 5.0,
          reviewCount: 0,
          createdAt: authUser.createdAt || new Date().toISOString(),
          avatarUrl: '',
          twoFactor: userSettings.twoFactor,
          notifications: userSettings.notifications
        });

        setHesap(prev => ({
          ...prev,
          twoFactor: userSettings.twoFactor
        }));
        
        setBildirim(userSettings.notifications);

      } catch (error) {
        console.error('Profile: Error loading user data:', error);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, [authUser?.id]); // Sadece user ID değiştiğinde çalışsın

  // Load 2FA status from backend and sync with localStorage
  useEffect(() => {
    if (authUser) {
      const load2FAStatus = async () => {
        try {
          console.log('🔐 Loading 2FA status from backend...');
          const response = await mysqlAPI.get2FAStatus();
          console.log('🔐 2FA status response:', response);
          if (response.success) {
            const authenticatorEnabled = response.data.authenticator_enabled || false;
            const emailEnabled = response.data.email_2fa_enabled || false;
            
            console.log('🔐 Backend Authenticator enabled:', authenticatorEnabled);
            console.log('🔐 Backend Email 2FA enabled:', emailEnabled);
            
            setTwoFactorStatus(authenticatorEnabled);
            setHesap(prev => ({
              ...prev,
              twoFactor: {
                ...prev.twoFactor,
                authenticator: authenticatorEnabled,
                email: emailEnabled
              }
            }));
            
            // localStorage'ı backend ile senkronize et
            save2FASettings(authenticatorEnabled);
            console.log('🔐 2FA status updated - Authenticator:', authenticatorEnabled, 'Email:', emailEnabled);
          }
        } catch (error) {
          console.error('Error loading 2FA status:', error);
        }
      };
      
      load2FAStatus();
    }
  }, [authUser]);

  // Basit ve hızlı şifre denetçisi
  function assessPasswordStrength(pw: string, oldPw?: string, email?: string) {
    const issues: string[] = [];
    const length = pw.length;
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);
    const categories = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
    const repeats = /(.)\1{2,}/.test(pw); // aynı karakter 3+ tekrar
    const sequential = /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(pw);
    const emailLocal = (email || '').split('@')[0] || '';
    const containsEmailLocal = !!emailLocal && pw.toLowerCase().includes(emailLocal.toLowerCase());
    const sameAsOld = !!oldPw && pw === oldPw;

    if (length < 8) issues.push('En az 8 karakter olmalı');
    if (categories < 3) issues.push('Küçük, büyük harf, rakam ve sembolden en az 3 tür içermeli');
    if (repeats) issues.push('Aynı karakteri art arda tekrarlamayın');
    if (sequential) issues.push('Sıralı karakterleri kullanmayın (örn. 123, abc)');
    if (containsEmailLocal) issues.push('E-posta kullanıcı adını şifreye eklemeyin');
    if (sameAsOld) issues.push('Yeni şifre eski şifreyle aynı olamaz');

    // Skor: 0-4
    let score = 0;
    if (length >= 8) score++;
    if (categories >= 2) score++;
    if (categories >= 3) score++;
    if (!repeats && !sequential) score++;
    if (length >= 12 && categories === 4) score++;
    if (sameAsOld) score = Math.max(0, score - 2);
    if (containsEmailLocal) score = Math.max(0, score - 1);
    if (score > 4) score = 4;

    const labels = ['Çok Zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok Güçlü'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-600'];
    const textColors = ['text-red-600', 'text-orange-600', 'text-yellow-700', 'text-green-600', 'text-emerald-700'];
    const label = labels[score];
    const barClass = colors[score];
    const textClass = textColors[score];

    const strongEnough = length >= 8 && categories >= 3 && !sameAsOld && !containsEmailLocal;
    return { score, label, barClass, textClass, issues, strongEnough };
  }

  const strength = assessPasswordStrength(hesap.newPassword, hesap.oldPassword, user?.email);

  const handleAuthSuccess = () => {
    // User will be updated via useAuth hook
    console.log('Profile: Auth success handled');
  };

  // 2FA settings'i localStorage'a kaydet
  const save2FASettings = (authenticatorEnabled: boolean) => {
    if (authUser) {
      const settingsKey = `user_settings_${authUser.id}`;
      const currentSettings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
      const updatedSettings = {
        ...currentSettings,
        twoFactor: {
          ...currentSettings.twoFactor,
          authenticator: authenticatorEnabled
        }
      };
      localStorage.setItem(settingsKey, JSON.stringify(updatedSettings));
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      toast.error('Şifrenizi girin');
      return;
    }

    try {
  const response = await mysqlAPI.disable2FA('', disablePassword);
      if (response.success) {
        setTwoFactorStatus(false);
        setHesap(v => ({...v, twoFactor: {...v.twoFactor, authenticator: false}}));
        save2FASettings(false); // localStorage'a kaydet
        toast.success('2FA Authenticator devre dışı bırakıldı');
        setDisablePasswordDialog(false);
        setDisablePassword('');
      } else {
        toast.error('2FA devre dışı bırakılamadı: ' + (response.error || 'Bilinmeyen hata'));
      }
    } catch (error) {
      console.error('2FA disable error:', error);
      toast.error('2FA devre dışı bırakılırken hata oluştu');
    }
  };

  // Check authentication first
  if (!authUser && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-xl font-semibold mb-4">🔐 Profil Erişimi</h2>
                <p className="text-gray-600 mb-6">
                  Profil sayfasına erişmek için giriş yapmanız gerekiyor.
                </p>
                <Button onClick={() => setAuthModalOpen(true)} className="bg-green-600 hover:bg-green-700">
                  Giriş Yap
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <AuthModal 
          isOpen={authModalOpen} 
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
        <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />
        <div className="flex items-center justify-center p-8">
          <div className="text-center">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
        <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Profil sayfasına erişmek için giriş yapın.</p>
            <Button onClick={() => navigate('/?login=true')}>Giriş Yap</Button>
          </div>
        </div>
      </div>
    );
  }

  // Genel bilgiler yükleme akışı GeneralInfoForm içinde yönetiliyor

  // Genel bilgiler kaydet/iptal GeneralInfoForm içinde yönetiliyor

  const saveSettings = async () => {
    try {
      // 2FA ve bildirim ayarlarını localStorage'a kaydet (geçici çözüm)
      const settingsKey = `user_settings_${authUser?.id}`;
      const settings = {
        twoFactor: hesap.twoFactor,
        notifications: bildirim,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      
      // Local user state'ini güncelle
      setUser(prev => prev ? {
        ...prev,
        twoFactor: hesap.twoFactor,
        notifications: bildirim
      } : null);

      toast.success('🔐 Güvenlik ayarları güncellendi', {
        description: '2FA ve bildirim tercihleri başarıyla kaydedildi.'
      });
    } catch (error) {
      console.error('Settings update error:', error);
      toast.error('❌ Ayarlar güncellenirken bir hata oluştu');
    }
  };

  const changePassword = () => {
    // Demo: sadece doğrulama pop-up'ı
    setConfirmDialog({open:true, action:'password'});
  };

  const confirmCritical = async () => {
    if (confirmDialog.action === 'delete') {
      DataManager.deleteCurrentUser();
      setConfirmDialog({open:false, action:null});
      navigate('/');
      return;
    }
    if (confirmDialog.action === 'password') {
      // Basic validations
      if (!hesap.oldPassword || !hesap.newPassword || !hesap.newPassword2) {
        toast.error('Lütfen tüm şifre alanlarını doldurun');
        return;
      }
      if (hesap.newPassword !== hesap.newPassword2) {
        toast.error('Yeni şifreler eşleşmiyor');
        return;
      }
      if (hesap.newPassword.length < 8) {
        toast.error('Yeni şifre en az 8 karakter olmalı');
        return;
      }
      if (!strength.strongEnough) {
        const tip = strength.issues[0] || 'Daha güçlü bir şifre deneyin';
        toast.error('Şifre zayıf: ' + tip);
        return;
      }
      try {
        // MySQL API ile şifre değiştir
        const response = await mysqlAPI.changePassword(hesap.oldPassword, hesap.newPassword);
        
        if (response.success) {
          toast.success('🔑 Şifre başarıyla güncellendi', {
            description: 'Yeni şifreniz ile giriş yapabilirsiniz.'
          });
          setHesap(h => ({ ...h, oldPassword: '', newPassword: '', newPassword2: '' }));
          setConfirmDialog({open: false, action: null});
        } else {
          toast.error('❌ Şifre değiştirme başarısız', {
            description: response.error || 'Beklenmeyen bir hata oluştu'
          });
        }
      } catch (error) {
        console.error('Change password error:', error);
        toast.error('❌ Şifre değiştirilirken bir hata oluştu');
      }
      return;
    }
    // freeze/demo: sadece dialog kapat
    setConfirmDialog({open:false, action:null});
  };

  // Güvenlik & Gizlilik ayarları kaldırıldı

  const saveNotifications = async () => {
    try {
      const result = await mysqlAPI.updateNotificationSettings({
        email_notifications: bildirim.email,
        sms_notifications: bildirim.sms
      });
      if (result?.success !== false) {
        // also persist to localStorage for quick UI restore
        const settingsKey = `user_settings_${authUser?.id}`;
        const existingSettings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
        localStorage.setItem(settingsKey, JSON.stringify({
          ...existingSettings,
          notifications: { ...bildirim }
        }));
        toast.success('✅ Bildirim tercihleri kaydedildi!');
      } else {
        toast.error('Tercihleri kaydetme sırasında hata oluştu');
      }
    } catch (error) {
      console.error('Bildirim kaydetme hatası:', error);
      toast.error('Tercihleri kaydetme sırasında hata oluştu');
    }
  };

  // E-posta doğrulama ve avatar yükleme akışları GeneralInfoForm içinde yönetiliyor

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCreateListingClick={() => setIsCreateListingModalOpen(true)} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Sticky user bar */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-orange-500 flex items-center justify-center text-white font-semibold">
            {user?.name?.[0] || user?.email?.[0] || 'U'}
          </div>
          <div>
            <div className="text-lg font-semibold">{user?.name || user?.email?.split('@')[0]}</div>
            <div className="text-sm text-muted-foreground">Hesabım / Profilim</div>
          </div>
        </div>

        {/* İki Panel Sistemi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. KULLANICI PROFİLİ */}
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-indigo-50">
              <CardTitle className="text-2xl flex items-center gap-2">
                👤 Kullanıcı Profili
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={(v)=>setActiveTab(v as any)} className="w-full">
                <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
                  <TabsTrigger value="genel">Genel</TabsTrigger>
                  <TabsTrigger value="adresler">Adresler</TabsTrigger>
                  <TabsTrigger value="guvenlik">Güvenlik</TabsTrigger>
                  <TabsTrigger value="bildirimler">Bildirimler</TabsTrigger>
                </TabsList>

                <TabsContent value="genel" className="space-y-4 mt-6">
                  <GeneralInfoForm user={user} />
                </TabsContent>

                <TabsContent value="adresler" className="space-y-4 mt-6">
                  <AddressBook />
                </TabsContent>

                <TabsContent value="guvenlik" className="mt-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Şifre Değiştir</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label>Eski şifre</Label>
                          <Input type="password" value={hesap.oldPassword} onChange={(e)=>setHesap(v=>({...v, oldPassword:e.target.value}))} />
                        </div>
                        <div>
                          <Label>Yeni şifre</Label>
                          <Input type="password" value={hesap.newPassword} onChange={(e)=>setHesap(v=>({...v, newPassword:e.target.value}))} />
                          <div className="mt-2">
                            <div className="h-1.5 w-full bg-gray-200 rounded">
                              <div className={`h-1.5 rounded transition-all duration-300 ${strength.barClass}`} style={{ width: `${(strength.score+1) * 20}%` }} />
                            </div>
                            <div className="mt-1 text-xs flex items-center gap-2">
                              <span className={`font-medium ${strength.textClass}`}>{strength.label}</span>
                              {!strength.strongEnough && strength.issues.length > 0 && (
                                <span className="text-muted-foreground">• {strength.issues[0]}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label>Yeni şifre (tekrar)</Label>
                          <Input type="password" value={hesap.newPassword2} onChange={(e)=>setHesap(v=>({...v, newPassword2:e.target.value}))} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">İki Faktörlü Doğrulama</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 border rounded-md shadow-sm bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span>2FA - Authenticator</span>
                            <Switch
                              checked={twoFactorStatus}
                              onCheckedChange={async (c)=>{
                                console.log('🔐 Authenticator 2FA Switch clicked, enabling:', c);
                                if (c && hesap.twoFactor.email) {
                                  toast.error('⚠️ Sadece bir 2FA methodu aktif olabilir. Önce E-posta 2FA\'yı devre dışı bırakın.');
                                  return;
                                }
                                if (c) {
                                  console.log('🔐 Opening AuthenticatorSetupDialog');
                                  setAuthenticatorDialogOpen(true);
                                } else {
                                  console.log('🔐 Opening disable password dialog');
                                  setDisablePasswordDialog(true);
                                }
                              }}
                            />
                          </div>
                          {twoFactorStatus && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                setDisablePasswordDialog(true);
                              }}
                            >
                              Devre dışı bırak
                            </Button>
                          )}
                        </div>
                        <div className="p-4 border rounded-md shadow-sm bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span>2FA - E-posta</span>
                            <Switch 
                              checked={Boolean(hesap.twoFactor?.email)} 
                              onCheckedChange={async (c) => {
                                console.log('🔐 Email 2FA Switch clicked, enabling:', c);
                                if (c && twoFactorStatus) {
                                  toast.error('⚠️ Sadece bir 2FA methodu aktif olabilir. Önce Authenticator 2FA\'yı devre dışı bırakın.');
                                  return;
                                }
                                try {
                                  const result = await mysqlAPI.toggleEmail2FA(c);
                                  if (result.success) {
                                    setHesap(v => ({...v, twoFactor: {...v.twoFactor, email: c}}));
                                    if (c) {
                                      setTwoFactorStatus(false);
                                      setHesap(v => ({...v, twoFactor: {...v.twoFactor, authenticator: false}}));
                                    }
                                    toast.success(c ? '📧 E-posta 2FA etkinleştirildi' : '📧 E-posta 2FA devre dışı bırakıldı');
                                  } else {
                                    toast.error('❌ E-posta 2FA ayarı güncellenemedi: ' + (result.error || 'Bilinmeyen hata'));
                                  }
                                } catch (error) {
                                  console.error('Email 2FA toggle error:', error);
                                  toast.error('❌ E-posta 2FA ayarı güncellenirken hata oluştu');
                                }
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Girişte e-posta ile doğrulama kodu gönderilir.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t">
                      <Button variant="outline" onClick={saveSettings}>Ayarları Kaydet</Button>
                      <Button onClick={()=>setConfirmDialog({open:true, action:'password'})}>Şifreyi Değiştir</Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bildirimler" className="mt-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Bildirim Tercihleri</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-md bg-white shadow-sm">
                          <span>✉️ E-posta bildirimleri</span>
                          <Switch checked={Boolean(bildirim?.email)} onCheckedChange={(c)=>setBildirim(v=>({...v, email:c}))} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-md bg-white shadow-sm">
                          <span>📱 SMS bildirimleri</span>
                          <Switch checked={Boolean(bildirim?.sms)} onCheckedChange={(c)=>setBildirim(v=>({...v, sms:c}))} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">Bu ayarlar alışveriş, teklif ve sipariş bildirimlerini etkiler.</p>
                    </div>
                    <div className="flex gap-2 justify-end pt-4 border-t">
                      <Button onClick={saveNotifications}>Tercihleri Kaydet</Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 2. SATICI PROFİLİ */}
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="text-2xl flex items-center gap-2">
                🏪 Satıcı Profili
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <SellerProfileTab />
            </CardContent>
          </Card>
        </div>

        {/* dialogs and modals */}

        {/* Kritik işlemler için doğrulama */}
      <Dialog open={confirmDialog.open} onOpenChange={(o)=>setConfirmDialog(s=>({...s, open:o}))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onay gerekiyor</DialogTitle>
          </DialogHeader>
          <p>
            {confirmDialog.action === 'delete' && 'Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'}
            {confirmDialog.action === 'freeze' && 'Hesabınızı geçici olarak dondurmak istediğinizden emin misiniz?'}
            {confirmDialog.action === 'password' && 'Şifrenizi değiştirmek üzeresiniz, devam edilsin mi?'}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=>setConfirmDialog({open:false, action:null})}>Vazgeç</Button>
            <Button onClick={confirmCritical}>Onayla</Button>
          </div>
        </DialogContent>
      </Dialog>



      {/* 2FA Authenticator Setup Dialog */}
      <AuthenticatorSetupDialog
        open={authenticatorDialogOpen}
        onOpenChange={setAuthenticatorDialogOpen}
        onSuccess={() => {
          setTwoFactorStatus(true);
          setHesap(v => ({...v, twoFactor: {...v.twoFactor, authenticator: true, email: false}}));
          save2FASettings(true); // localStorage'a kaydet
          
          // Authenticator başarıyla kurulduğunda Email 2FA'yı devre dışı bırak
          console.log('🔐 Authenticator setup successful, disabling Email 2FA');
          mysqlAPI.toggleEmail2FA(false).then(result => {
            if (result.success) {
              console.log('✅ Email 2FA disabled automatically');
              toast.success('🔐 Authenticator 2FA aktif edildi. E-posta 2FA otomatik devre dışı bırakıldı.');
            } else {
              console.error('❌ Failed to disable Email 2FA:', result.error);
            }
          }).catch(error => {
            console.error('❌ Error disabling Email 2FA:', error);
          });
        }}
      />

      {/* Disable 2FA Password Dialog */}
      <Dialog open={disablePasswordDialog} onOpenChange={setDisablePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>2FA Authenticator Devre Dışı Bırak</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              2FA Authenticator'ı devre dışı bırakmak için mevcut şifrenizi girin.
            </p>
            <div className="space-y-2">
              <Label htmlFor="disable-password">Mevcut şifre</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Mevcut şifrenizi girin"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDisablePasswordDialog(false);
                  setDisablePassword('');
                }}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisable2FA}
                disabled={!disablePassword}
              >
                2FA'yı Devre Dışı Bırak
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supabase session missing → prompt login */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={()=>setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Create Listing Modal */}
      <CreateListingModal
        open={isCreateListingModalOpen}
        onOpenChange={setIsCreateListingModalOpen}
      />
      </div>
    </div>
  );
}
