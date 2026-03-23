import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mysqlAPI } from '@/lib/mysql-api';
import { toast } from '@/lib/sonner';

export type Address = {
  id: string;
  title?: string;
  recipient_name?: string;
  phone?: string;
  address_line1: string;
  address_line2?: string;
  district?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  is_default?: number | boolean;
};

function maskPhone(phone?: string) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '*'.repeat(digits.length);
  const first2 = digits.slice(0, 2);
  const last2 = digits.slice(-2);
  const masked = '*'.repeat(Math.max(0, digits.length - 4));
  return `${first2}${masked}${last2}`;
}

export default function AddressBook() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState<Partial<Address>>({ country: 'TR', is_default: false });

  const defaultAddressId = useMemo(() => {
    const def = addresses.find(a => Number(a.is_default) === 1 || a.is_default === true);
    return def?.id;
  }, [addresses]);

  async function load() {
    try {
      setLoading(true);
      const res = await mysqlAPI.getAddresses();
      const arr = res.addresses || res.data || [];
      setAddresses(arr);
    } catch (e) {
      console.error('Adresler yüklenemedi', e);
      toast.error('Adresler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function onAdd() {
    setEditing(null);
    setForm({ country: 'TR', is_default: addresses.length === 0 });
    setOpen(true);
  }

  function onEdit(a: Address) {
    setEditing(a);
    setForm({ ...a });
    setOpen(true);
  }

  async function onDelete(a: Address) {
    if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await mysqlAPI.deleteAddress(a.id);
      if (res.success !== false) {
        toast.success('Adres silindi');
        load();
      } else {
        toast.error(res.error || 'Adres silinemedi');
      }
    } catch (e) {
      console.error(e);
      toast.error('Adres silinemedi');
    }
  }

  async function onSave() {
    try {
      const payload = {
        title: form.title?.trim() || undefined,
        recipient_name: form.recipient_name?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        address_line1: form.address_line1?.trim() || '',
        address_line2: form.address_line2?.trim() || undefined,
        district: form.district?.trim() || undefined,
        city: form.city?.trim() || undefined,
        postal_code: form.postal_code?.trim() || undefined,
        country: form.country || 'TR',
        is_default: Boolean(form.is_default),
      };
      if (!payload.address_line1) {
        toast.error('Adres satırı zorunludur');
        return;
      }
      let res;
      if (editing) {
        res = await mysqlAPI.updateAddress(editing.id, payload);
      } else {
        res = await mysqlAPI.addAddress(payload as any);
      }
      if (res.success !== false) {
        toast.success('Adres kaydedildi');
        setOpen(false);
        setEditing(null);
        setForm({ country: 'TR', is_default: false });
        load();
      } else {
        toast.error(res.error || 'Adres kaydedilemedi');
      }
    } catch (e) {
      console.error(e);
      toast.error('Adres kaydedilemedi');
    }
  }

  async function setDefault(id: string) {
    try {
      const res = await mysqlAPI.setDefaultAddress(id);
      if (res.success !== false) {
        toast.success('Varsayılan adres güncellendi');
        load();
      } else {
        toast.error(res.error || 'İşlem başarısız');
      }
    } catch (e) {
      console.error(e);
      toast.error('İşlem başarısız');
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Adres Bilgilerim</CardTitle>
          <Button onClick={onAdd}>Yeni Adres Ekle</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Yükleniyor...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map(a => (
              <div key={a.id} className="p-4 border rounded-md bg-white shadow-sm space-y-2 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{a.title || 'Adres'}</div>
                  {(Number(a.is_default) === 1 || a.is_default === true) && (
                    <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded shrink-0">Varsayılan</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground break-words">
                  {a.recipient_name && <div className="truncate">{a.recipient_name}</div>}
                  <div className="line-clamp-2">{a.address_line1}{a.address_line2 ? ', ' + a.address_line2 : ''}</div>
                  <div className="truncate">{[a.district, a.city, a.postal_code].filter(Boolean).join(', ')}</div>
                  {a.phone && <div>Tel: {maskPhone(a.phone)}</div>}
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={defaultAddressId === a.id}
                      onCheckedChange={async (checked) => {
                        if (!checked) return;
                        try {
                          const res = await mysqlAPI.setDefaultAddress(a.id);
                          if (res.success !== false) {
                            setAddresses(prev => prev.map(it => ({
                              ...it,
                              is_default: it.id === a.id ? 1 : 0
                            })));
                            toast.success('Varsayılan adres güncellendi');
                          } else {
                            toast.error(res.error || 'İşlem başarısız');
                          }
                        } catch (err) {
                          console.error(err);
                          toast.error('İşlem başarısız');
                        }
                      }}
                    />
                    <span className="text-muted-foreground">Varsayılan yap</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(a)}>Düzenle</Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => onDelete(a)}>Sil</Button>
                  </div>
                </div>
              </div>
            ))}
            {addresses.length === 0 && (
              <div className="text-sm text-muted-foreground">Henüz adres eklemediniz. Yeni adres ekleyin.</div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Adres Başlığı</Label>
              <Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ev, İş, Kargo..." />
            </div>
            <div>
              <Label>Alıcı Ad Soyad</Label>
              <Input value={form.recipient_name || ''} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))} placeholder="Ad Soyad" />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="05********" />
            </div>
            <div>
              <Label>Adres Satırı</Label>
              <Input value={form.address_line1 || ''} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} placeholder="Mahalle, cadde, no" />
            </div>
            <div>
              <Label>Adres Satırı 2 (opsiyonel)</Label>
              <Input value={form.address_line2 || ''} onChange={e => setForm(f => ({ ...f, address_line2: e.target.value }))} placeholder="Daire, kat vb." />
            </div>
            <div>
              <Label>İlçe</Label>
              <Input value={form.district || ''} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="İlçe" />
            </div>
            <div>
              <Label>Şehir</Label>
              <Input value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Şehir" />
            </div>
            <div>
              <Label>Posta Kodu</Label>
              <Input value={form.postal_code || ''} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} placeholder="34500" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={Boolean(form.is_default)} onCheckedChange={(c) => setForm(f => ({ ...f, is_default: c }))} />
              <span>Varsayılan adres yap</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button onClick={onSave}>{editing ? 'Güncelle' : 'Kaydet'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
