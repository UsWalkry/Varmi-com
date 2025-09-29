import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { DataManager, User, UserSession, LoginLog, cities } from '@/lib/mockData';
import { Mailer } from '@/lib/mail';
import { toast } from '@/lib/sonner';
import AuthenticatorSetupDialog from '@/components/AuthenticatorSetupDialog';

export default function Profile() {
  const navigate = useNavigate();
  const currentUser = DataManager.getCurrentUser();
  const [user, setUser] = useState<User | null>(currentUser);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const [genel, setGenel] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    birthDate: currentUser?.birthDate || '',
    city: currentUser?.city || '',
    addressLine1: currentUser?.address?.line1 || '',
    district: currentUser?.address?.district || '',
    postalCode: currentUser?.address?.postalCode || '',
    avatarUrl: currentUser?.avatarUrl || '',
  });

  const [hesap, setHesap] = useState({
    oldPassword: '',
    newPassword: '',
    newPassword2: '',
    twoFactor: {
      sms: currentUser?.twoFactor?.sms ?? false,
      authenticator: currentUser?.twoFactor?.authenticator ?? false,
      email: currentUser?.twoFactor?.email ?? true,
    },
  });

  // Güvenlik & Gizlilik bölümü kaldırıldı

  const [bildirim, setBildirim] = useState({
    email: currentUser?.notifications?.email ?? true,
    sms: currentUser?.notifications?.sms ?? false,
    inApp: currentUser?.notifications?.inApp ?? true,
  });

  const sessions = useMemo<UserSession[]>(() => currentUser ? DataManager.getSessions(currentUser.id) : [], [currentUser]);
  const loginLogs = useMemo<LoginLog[]>(() => currentUser ? DataManager.getLoginLogs(currentUser.id) : [], [currentUser]);

  const [confirmDialog, setConfirmDialog] = useState<{open: boolean; action: 'password'|'delete'|'freeze'|null}>({open:false, action:null});
  const [authSetupOpen, setAuthSetupOpen] = useState(false);

  if (!user) return null;

  const saveGeneral = () => {
    const updated = DataManager.updateCurrentUser({
      name: genel.name,
      email: genel.email,
      phone: genel.phone,
      birthDate: genel.birthDate,
      city: genel.city,
      avatarUrl: genel.avatarUrl,
      address: { line1: genel.addressLine1, district: genel.district, postalCode: genel.postalCode },
    });
    setUser(updated);
    // Header ve diğer bileşenlere kullanıcı güncellendiğini bildir
    window.dispatchEvent(new Event('user-updated'));
    // Önizlemeyi temizle
    window.dispatchEvent(new Event('user-avatar-preview-clear'));
  };

  const cancelGeneral = () => {
    setGenel({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      birthDate: currentUser?.birthDate || '',
      city: currentUser?.city || '',
      addressLine1: currentUser?.address?.line1 || '',
      district: currentUser?.address?.district || '',
      postalCode: currentUser?.address?.postalCode || '',
      avatarUrl: currentUser?.avatarUrl || '',
    });
    // Önizlemeyi temizle
    window.dispatchEvent(new Event('user-avatar-preview-clear'));
  };

  const saveSettings = () => {
    const updated = DataManager.updateCurrentUser({ twoFactor: {...hesap.twoFactor} });
    setUser(updated);
  };

  const changePassword = () => {
    // Demo: sadece doğrulama pop-up'ı
    setConfirmDialog({open:true, action:'password'});
  };

  const confirmCritical = () => {
    if (confirmDialog.action === 'delete') {
      DataManager.deleteCurrentUser();
      setConfirmDialog({open:false, action:null});
      navigate('/');
      return;
    }
    // password/freeze demo: sadece dialog kapat
    setConfirmDialog({open:false, action:null});
  };

  // Güvenlik & Gizlilik ayarları kaldırıldı

  const saveNotifications = () => {
    const updated = DataManager.updateCurrentUser({ notifications: { ...bildirim } });
    setUser(updated);
  };

  const resendWelcomeEmail = async () => {
    if (!user) return;
    try {
      await Mailer.sendWelcome({ name: user.name, email: user.email });
      toast.success('Hoş geldin e-postası gönderildi');
    } catch (e) {
      toast.error('E-posta gönderilemedi');
      console.warn('Resend welcome email failed:', e);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setGenel(g => ({ ...g, avatarUrl: String(reader.result || '') }));
      // Header için anlık önizleme gönder
      window.dispatchEvent(new CustomEvent('user-avatar-preview', { detail: { avatarUrl: String(reader.result || '') } }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Genel Bilgiler */}
        <Card>
          <CardHeader>
            <CardTitle>Genel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <img src={genel.avatarUrl || '/avatar-placeholder.png'} alt="Avatar" className="w-20 h-20 rounded-full object-cover border" />
              <div>
                <Label htmlFor="avatar">Profil fotoğrafı</Label>
                <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarUpload} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Ad Soyad</Label>
                <Input value={genel.name} onChange={(e)=>setGenel(v=>({...v, name:e.target.value}))} />
              </div>
              <div>
                <Label>E-posta</Label>
                <Input type="email" value={genel.email} onChange={(e)=>setGenel(v=>({...v, email:e.target.value}))} />
              </div>
              <div>
                <Label>Telefon</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">+90</span>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="pl-12"
                    value={(genel.phone || '').replace(/^\+?90/, '').replace(/\D/g, '').slice(0, 10)}
                    onChange={(e)=>{
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setGenel(v=>({...v, phone: digits ? `+90${digits}` : ''}));
                    }}
                    placeholder="5xx xxx xx xx"
                  />
                </div>
              </div>
              <div>
                <Label>Doğum tarihi</Label>
                <Input type="date" value={genel.birthDate} onChange={(e)=>setGenel(v=>({...v, birthDate:e.target.value}))} />
              </div>
              <div>
                <Label>Şehir</Label>
                <Select value={genel.city} onValueChange={(val)=>setGenel(v=>({...v, city:val}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Şehir seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Adres</Label>
                <Input value={genel.addressLine1} onChange={(e)=>setGenel(v=>({...v, addressLine1:e.target.value}))} placeholder="Adres satırı" />
              </div>
              <div>
                <Label>İlçe</Label>
                <Input value={genel.district} onChange={(e)=>setGenel(v=>({...v, district:e.target.value}))} />
              </div>
              <div>
                <Label>Posta Kodu</Label>
                <Input value={genel.postalCode} onChange={(e)=>setGenel(v=>({...v, postalCode:e.target.value}))} />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelGeneral}>Vazgeç</Button>
              <Button onClick={saveGeneral}>Kaydet</Button>
            </div>
          </CardContent>
        </Card>

        {/* Hesap Ayarları */}
        <Card>
          <CardHeader>
            <CardTitle>Hesap Ayarları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Eski şifre</Label>
                <Input type="password" value={hesap.oldPassword} onChange={(e)=>setHesap(v=>({...v, oldPassword:e.target.value}))} />
              </div>
              <div>
                <Label>Yeni şifre</Label>
                <Input type="password" value={hesap.newPassword} onChange={(e)=>setHesap(v=>({...v, newPassword:e.target.value}))} />
              </div>
              <div>
                <Label>Yeni şifre (tekrar)</Label>
                <Input type="password" value={hesap.newPassword2} onChange={(e)=>setHesap(v=>({...v, newPassword2:e.target.value}))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span>2FA - SMS</span>
                <Switch checked={hesap.twoFactor.sms} onCheckedChange={(c)=>setHesap(v=>({...v, twoFactor:{...v.twoFactor, sms:c}}))} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span>2FA - Authenticator</span>
                <div className="flex items-center gap-2">
                  {user.twoFactor?.authenticator && (
                    <Button size="sm" variant="outline" onClick={()=>DataManager.disableAuthenticator(user.id)}>Devre dışı bırak</Button>
                  )}
                  <Switch
                    checked={!!user.twoFactor?.authenticator}
                    onCheckedChange={(c)=>{
                      if (c) {
                        setAuthSetupOpen(true);
                      } else {
                        DataManager.disableAuthenticator(user.id);
                        setUser(DataManager.getCurrentUser());
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span>2FA - E-posta</span>
                <Switch checked={hesap.twoFactor.email} onCheckedChange={(c)=>setHesap(v=>({...v, twoFactor:{...v.twoFactor, email:c}}))} />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={saveSettings}>Kaydet</Button>
              <Button onClick={()=>setConfirmDialog({open:true, action:'password'})}>Şifreyi Değiştir</Button>
            </div>

            {/* Bağlı cihazlar ve oturumlar */}
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Bağlı Cihazlar ve Oturumlar</h3>
              <div className="space-y-2">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aktif oturum bulunmuyor.</p>
                ) : (
                  sessions.map(s => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-md">
                      <div className="text-sm">
                        <div className="font-medium">{s.deviceName}</div>
                        <div className="text-muted-foreground">IP: {s.ip} • Son aktif: {new Date(s.lastActiveAt).toLocaleString('tr-TR')}</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={()=>DataManager.revokeSession(user.id, s.id)}>Çıkış yap</Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Giriş kayıtları */}
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Giriş Kayıtları</h3>
              <ScrollArea className="h-40 border rounded-md">
                <div className="p-3 space-y-2">
                  {loginLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Kayıt yok.</p>
                  ) : (
                    loginLogs.map(l => (
                      <div key={l.id} className="text-sm flex items-center justify-between">
                        <span>{new Date(l.timestamp).toLocaleString('tr-TR')}</span>
                        <span className="text-muted-foreground">{l.ip} • {l.location || 'Bilinmiyor'}</span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Güvenlik ve Gizlilik bölümü kaldırıldı */}

        {/* Bildirim Ayarları */}
        <Card>
          <CardHeader>
            <CardTitle>Bildirim Ayarları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span>E-posta bildirimleri</span>
                <Switch checked={bildirim.email} onCheckedChange={(c)=>setBildirim(v=>({...v, email:c}))} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span>SMS bildirimleri</span>
                <Switch checked={bildirim.sms} onCheckedChange={(c)=>setBildirim(v=>({...v, sms:c}))} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span>Uygulama içi bildirimler</span>
                <Switch checked={bildirim.inApp} onCheckedChange={(c)=>setBildirim(v=>({...v, inApp:c}))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resendWelcomeEmail}>Hoş geldin e-postasını yeniden gönder</Button>
              <Button onClick={saveNotifications}>Tercihleri Kaydet</Button>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Authenticator Kurulum Diyaloğu */}
      <AuthenticatorSetupDialog open={authSetupOpen} onOpenChange={(o)=>{
        setAuthSetupOpen(o);
        // kullanıcı profili güncelle
        setUser(DataManager.getCurrentUser());
      }} userId={user.id} />
    </div>
  );
}
