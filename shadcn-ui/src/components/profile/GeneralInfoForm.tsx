import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/sonner';
import { DataManager, cities, User } from '@/lib/mockData';
import { mysqlAPI } from '@/lib/mysql-api';
import { useAuth } from '@/hooks/use-auth-mysql';

interface GeneralInfoFormProps {
  user?: User;
}

export default function GeneralInfoForm({ user: propUser }: GeneralInfoFormProps) {
  const currentUser = propUser || DataManager.getCurrentUser();
  const PENDING_KEY = 'profile.pendingSync';
  const [emailPending, setEmailPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [emailChangeModal, setEmailChangeModal] = useState<{
    isOpen: boolean;
    currentEmail: string;
    newEmail: string;
  }>({
    isOpen: false,
    currentEmail: '',
    newEmail: ''
  });
  const syncingRef = useRef(false);

  const [form, setForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    birthDate: currentUser?.birthDate || '',
    city: currentUser?.city || '',
    gender: '', // Yeni cinsiyet alanı
    addressLine1: currentUser?.address?.line1 || '',
    district: currentUser?.address?.district || '',
    postalCode: currentUser?.address?.postalCode || '',
    avatarUrl: currentUser?.avatarUrl || '',
  });

  // Update form when user prop changes
  useEffect(() => {
    if (propUser) {
      setForm({
        name: propUser.name || '',
        email: propUser.email || '',
        phone: propUser.phone || '',
        birthDate: propUser.birthDate || '',
        city: propUser.city || '',
        gender: '', // propUser.gender || '' - gender property eksik
        addressLine1: propUser.address?.line1 || '',
        district: propUser.address?.district || '',
        postalCode: propUser.address?.postalCode || '',
        avatarUrl: propUser.avatarUrl || '',
      });
      setLoading(false);
    }
  }, [propUser]);

  useEffect(() => {
    // Basitleştirilmiş yükleme - sadece propUser kullanılıyor
    setLoading(false);
  }, [propUser]);

  const onSubmit = async () => {
    const next = {
      name: (form.name || '').trim(),
      email: (form.email || '').trim().toLowerCase(),
      phone: form.phone || '',
      birthDate: form.birthDate || '',
      city: form.city || '',
      avatarUrl: form.avatarUrl || '',
      address: { line1: form.addressLine1 || '', district: form.district || '', postalCode: form.postalCode || '' },
    };
    
    setSubmitting(true);
    try {
      // MySQL API ile profil güncelle
      const { user: authUser } = useAuth();
      if (authUser) {
        const updateData = {
          firstName: next.name.split(' ')[0] || '',
          lastName: next.name.split(' ').slice(1).join(' ') || '',
          phone: next.phone,
          city: next.city
        };
        
        const response = await mysqlAPI.updateProfile(updateData);
        if (response.success) {
          toast.success('Profil başarıyla güncellendi!');
        } else {
          toast.error('Profil güncellenirken hata oluştu');
        }
      } else {
        // Fallback: localStorage'a kaydet
        DataManager.updateCurrentUser(next);
        toast.success('Profil güncellendi (yerel)');
      }
    } catch (e) {
      console.warn('save profile failed:', e);
      toast.error('Profil güncellenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  // Geçici olarak devre dışı bırakıldı - Supabase fonksiyonları eksik

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Genel Bilgiler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <img src={form.avatarUrl || '/avatar-placeholder.png'} alt="Avatar" className="w-20 h-20 rounded-full object-cover border" />
          <div>
            <Label htmlFor="avatar">Profil fotoğrafı</Label>
            <Input id="avatar" type="file" accept="image/*" onChange={(e)=>{
              const file = e.target.files?.[0]; if (!file) return;
              const r = new FileReader(); r.onload = () => setForm(f=>({...f, avatarUrl: String(r.result||'')})); r.readAsDataURL(file);
            }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Ad Soyad</Label>
            <Input value={form.name} onChange={(e)=>setForm(v=>({...v, name:e.target.value}))} />
          </div>
          <div>
            <Label>E-posta</Label>
            <Input type="email" value={form.email} onChange={(e)=>setForm(v=>({...v, email:e.target.value}))} disabled={!!emailPending} />
            {emailPending && (
              <div className="mt-1 text-xs text-muted-foreground">
                Yeni e-posta "{emailPending}" için doğrulama bekleniyor. Onaylayana kadar giriş e-postanız değişmeyecek.
                <Button type="button" size="sm" variant="link" className="px-1" onClick={() => toast.info('Tekrar gönderme geçici olarak devre dışı')}>Tekrar gönder</Button>
              </div>
            )}
          </div>
          <div>
            <Label>Telefon</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">+90</span>
              <Input
                type="text"
                className="pl-12"
                value={form.phone.replace(/^\+?90/, '')}
                onChange={(e) => {
                  const value = e.target.value;
                  // Sadece sayıları al ve 10 haneyle sınırla
                  const digits = value.replace(/[^0-9]/g, '').slice(0, 10);
                  // +90 prefixiyle kaydet
                  setForm(prev => ({ ...prev, phone: digits ? `+90${digits}` : '' }));
                }}
                placeholder="5xxxxxxxxx"
                maxLength={10}
              />
            </div>
          </div>
          <div>
            <Label>Doğum tarihi</Label>
            <Input type="date" value={form.birthDate} onChange={(e)=>setForm(v=>({...v, birthDate:e.target.value}))} />
          </div>
          <div>
            <Label>Şehir</Label>
            <Select value={form.city} onValueChange={(val)=>setForm(v=>({...v, city:val}))}>
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
            <Input value={form.addressLine1} onChange={(e)=>setForm(v=>({...v, addressLine1:e.target.value}))} placeholder="Adres satırı" />
          </div>
          <div>
            <Label>İlçe</Label>
            <Input value={form.district} onChange={(e)=>setForm(v=>({...v, district:e.target.value}))} />
          </div>
          <div>
            <Label>Posta Kodu</Label>
            <Input value={form.postalCode} onChange={(e)=>setForm(v=>({...v, postalCode:e.target.value}))} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => {
            const u = DataManager.getCurrentUser(); if (!u) return;
            setForm({
              name: u.name || '', email: u.email || '', phone: u.phone || '', birthDate: u.birthDate || '', city: u.city || '', gender: '',
              addressLine1: u.address?.line1 || '', district: u.address?.district || '', postalCode: u.address?.postalCode || '', avatarUrl: u.avatarUrl || '',
            });
          }}>Vazgeç</Button>
          <Button disabled={submitting} onClick={onSubmit}>{submitting ? 'Kaydediliyor...' : 'Kaydet'}</Button>
        </div>
      </CardContent>
      
      {/* EmailChangeModal component eksik - geçici olarak comment edildi
      <EmailChangeModal
        isOpen={emailChangeModal.isOpen}
        currentEmail={emailChangeModal.currentEmail}
        newEmail={emailChangeModal.newEmail}
        onClose={() => setEmailChangeModal({ isOpen: false, currentEmail: '', newEmail: '' })}
        onSuccess={() => {
          // Email başarıyla değişti, formu güncelle
          setForm(f => ({ ...f, email: emailChangeModal.newEmail }));
          toast.success('Email adresi başarıyla güncellendi!');
        }}
      />
      */}
    </Card>
  );
}
