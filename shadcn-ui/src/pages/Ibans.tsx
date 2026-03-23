import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth-mysql';
import { mysqlAPI } from '@/lib/mysql-api';
import { toast } from '@/lib/sonner';
import { CreditCard, Plus, Star, Trash2, RefreshCw, ChevronLeft } from 'lucide-react';

interface IbanEntry {
  id: string;
  title: string;
  bank_name: string;
  iban: string;
  account_holder_name: string;
  is_default: number | boolean;
  created_at: string;
}

const EMPTY_FORM = { title: '', bankName: '', iban: '', accountHolderName: '', isDefault: false };

function maskIban(iban: string) {
  if (iban.length < 6) return iban;
  return iban.slice(0, 4) + ' **** **** **** **** ' + iban.slice(-4);
}

export default function IbansPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ibans, setIbans] = useState<IbanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await mysqlAPI.getIbans();
      if (res?.success) setIbans(res.ibans || []);
    } catch {
      toast.error('IBAN\'lar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.title.trim() || !form.bankName.trim() || !form.accountHolderName.trim()) {
      toast.error('Tüm alanları doldurun');
      return;
    }
    const ibanClean = form.iban.replace(/\s/g, '').toUpperCase();
    if (!/^TR\d{24}$/.test(ibanClean)) {
      toast.error('Geçersiz IBAN — TR ile başlamalı ve 26 karakter olmalı (TR + 24 rakam)');
      return;
    }
    setSubmitting(true);
    try {
      const res = await mysqlAPI.addIban({
        title: form.title.trim(),
        bankName: form.bankName.trim(),
        iban: ibanClean,
        accountHolderName: form.accountHolderName.trim(),
        isDefault: ibans.length === 0 ? true : form.isDefault,
      });
      if (res?.success) {
        toast.success('IBAN başarıyla eklendi');
        setDialogOpen(false);
        setForm(EMPTY_FORM);
        load();
      } else {
        toast.error(res?.error || 'IBAN eklenemedi');
      }
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await mysqlAPI.setDefaultIban(id);
      if (res?.success) {
        toast.success('Varsayılan IBAN güncellendi');
        load();
      } else {
        toast.error(res?.error || 'Güncellenemedi');
      }
    } catch {
      toast.error('Bir hata oluştu');
    }
  };

  const handleDelete = async (iban: IbanEntry) => {
    if (!confirm(`"${iban.title}" hesabını silmek istediğinizden emin misiniz?`)) return;
    try {
      const res = await mysqlAPI.deleteIban(iban.id);
      if (res?.success) {
        toast.success('IBAN silindi');
        load();
      } else {
        toast.error(res?.error || 'Silinemedi');
      }
    } catch {
      toast.error('Bir hata oluştu');
    }
  };

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">Bu sayfayı görüntülemek için giriş yapmalısınız.</p>
          <Button className="mt-4" onClick={() => navigate('/')}>Ana Sayfaya Dön</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/commission')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">IBAN Yönetimi</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Komisyon ödemeleriniz için banka hesabı kaydedin.
            </p>
          </div>
          <Button
            className="ml-auto bg-purple-600 hover:bg-purple-700"
            onClick={() => setDialogOpen(true)}
            disabled={ibans.length >= 10}
          >
            <Plus className="h-4 w-4 mr-2" />
            Hesap Ekle
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : ibans.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 dark:text-gray-400">Henüz kayıtlı IBAN bulunmuyor.</p>
              <Button onClick={() => setDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                İlk Hesabı Ekle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {ibans.map((iban) => {
              const isDefault = iban.is_default === 1 || iban.is_default === true;
              return (
                <Card key={iban.id} className={isDefault ? 'border-purple-300 dark:border-purple-700' : ''}>
                  <CardContent className="py-4 px-5 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white">{iban.title}</span>
                        {isDefault && (
                          <Badge className="bg-purple-600 text-white text-xs">Varsayılan</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{iban.bank_name}</p>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">{maskIban(iban.iban)}</p>
                      <p className="text-xs text-gray-400">{iban.account_holder_name}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Varsayılan yap"
                          onClick={() => handleSetDefault(iban.id)}
                        >
                          <Star className="h-4 w-4 text-gray-400" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Sil"
                        onClick={() => handleDelete(iban)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {ibans.length >= 10 && (
              <p className="text-sm text-gray-400 text-center">Maksimum 10 IBAN kaydedebilirsiniz.</p>
            )}
          </div>
        )}
      </div>

      {/* Add IBAN Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni IBAN Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Hesap Etiketi</Label>
              <Input
                placeholder="ör. Ziraat Maaş Hesabı"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Banka Adı</Label>
              <Input
                placeholder="ör. Ziraat Bankası"
                value={form.bankName}
                onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>IBAN</Label>
              <Input
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                value={form.iban}
                onChange={e => setForm(f => ({ ...f, iban: e.target.value }))}
                className="font-mono"
              />
              <p className="text-xs text-gray-400">TR ile başlamalı, toplam 26 karakter (TR + 24 rakam)</p>
            </div>
            <div className="space-y-1">
              <Label>Hesap Sahibi</Label>
              <Input
                placeholder="Ad Soyad"
                value={form.accountHolderName}
                onChange={e => setForm(f => ({ ...f, accountHolderName: e.target.value }))}
              />
            </div>
            {ibans.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="isDefault" className="cursor-pointer font-normal">
                  Varsayılan olarak ayarla
                </Label>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleAdd}
                disabled={submitting}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {submitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Kaydet
              </Button>
              <Button variant="outline" onClick={() => { setDialogOpen(false); setForm(EMPTY_FORM); }}>
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
