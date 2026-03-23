import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth-mysql';
import { mysqlAPI } from '@/lib/mysql-api';
import { toast } from '@/lib/sonner';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronRight,
  CreditCard,
} from 'lucide-react';

interface Transaction {
  id: string;
  transaction_type: 'earned' | 'withdrawn';
  amount: number;
  description: string;
  created_at: string;
  order_id?: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  bank_name: string;
  iban: string;
  account_holder_name: string;
  admin_notes?: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  completed: 'Tamamlandı',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  completed: 'default',
};

function formatPrice(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function CommissionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [minWithdrawal, setMinWithdrawal] = useState(100);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ amount: '', bankName: '', iban: '', accountHolderName: '' });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, histRes, wdRes, settingsRes] = await Promise.all([
        mysqlAPI.getCommissionBalance(),
        mysqlAPI.getCommissionHistory(50, 0),
        mysqlAPI.getCommissionWithdrawals(),
        mysqlAPI.getCommissionSettings(),
      ]);
      if (balRes?.success) {
        setBalance(Number(balRes.balance) || 0);
        setTotalEarned(Number(balRes.totalEarned) || 0);
        setTotalWithdrawn(Number(balRes.totalWithdrawn) || 0);
      }
      if (histRes?.success) setTransactions(histRes.transactions || []);
      if (wdRes?.success) setWithdrawals(wdRes.requests || []);
      if (settingsRes?.success) setMinWithdrawal(Number(settingsRes.settings?.minWithdrawal) || 100);
    } catch {
      toast.error('Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount < minWithdrawal) {
      toast.error(`Minimum çekim tutarı: ${minWithdrawal} ₺`);
      return;
    }
    if (amount > balance) {
      toast.error('Bakiyenizden fazla çekim yapamazsınız');
      return;
    }
    if (!form.bankName.trim() || !form.iban.trim() || !form.accountHolderName.trim()) {
      toast.error('Tüm alanları doldurun');
      return;
    }
    const ibanClean = form.iban.replace(/\s/g, '').toUpperCase();
    if (!/^TR\d{24}$/.test(ibanClean)) {
      toast.error('Geçersiz IBAN — TR ile başlamalı, 26 karakter olmalı (TR + 24 rakam)');
      return;
    }
    setSubmitting(true);
    try {
      const res = await mysqlAPI.requestCommissionWithdrawal({
        amount,
        bankName: form.bankName.trim(),
        iban: ibanClean,
        accountHolderName: form.accountHolderName.trim(),
      });
      if (res?.success) {
        toast.success('Para çekme talebi gönderildi!');
        setShowForm(false);
        setForm({ amount: '', bankName: '', iban: '', accountHolderName: '' });
        loadData();
      } else {
        toast.error(res?.error || 'Talep gönderilemedi');
      }
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setSubmitting(false);
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
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Komisyon & Kazançlarım</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            İşlemlerinizden kazandığınız komisyonları takip edin ve çekim talep edin.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-purple-600 to-blue-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70">Mevcut Bakiye</p>
                      <p className="text-3xl font-bold mt-1">{formatPrice(balance)}</p>
                    </div>
                    <Wallet className="h-10 w-10 text-white/40" />
                  </div>
                  <Button
                    className="mt-4 w-full bg-white text-purple-700 hover:bg-white/90"
                    disabled={balance < minWithdrawal}
                    onClick={() => setShowForm(v => !v)}
                  >
                    <ArrowDownToLine className="h-4 w-4 mr-2" />
                    Para Çek
                  </Button>
                  {balance < minWithdrawal && (
                    <p className="text-xs text-white/60 mt-2 text-center">
                      Min. çekim: {minWithdrawal} ₺
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Kazanılan</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(totalEarned)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Çekilen</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(totalWithdrawn)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Withdrawal form */}
            {showForm && (
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    Para Çekme Talebi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Tutar (₺)</Label>
                      <Input
                        type="number"
                        placeholder={`Min. ${minWithdrawal} ₺`}
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
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
                  </div>
                  <div className="space-y-1">
                    <Label>IBAN</Label>
                    <Input
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                      value={form.iban}
                      onChange={e => setForm(f => ({ ...f, iban: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Hesap Sahibi Adı</Label>
                    <Input
                      placeholder="Ad Soyad"
                      value={form.accountHolderName}
                      onChange={e => setForm(f => ({ ...f, accountHolderName: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleWithdraw} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
                      {submitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ArrowDownToLine className="h-4 w-4 mr-2" />}
                      Talep Gönder
                    </Button>
                    <Button variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
                    <Button variant="ghost" onClick={() => navigate('/profile/ibans')} className="ml-auto text-purple-600 text-sm">
                      Kayıtlı IBAN'larım <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Withdrawal requests */}
            {withdrawals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    Çekim Taleplerim
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y dark:divide-gray-700">
                  {withdrawals.map((w) => (
                    <div key={w.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatPrice(w.amount)}
                          </span>
                          <Badge variant={STATUS_VARIANT[w.status]}>
                            {STATUS_LABEL[w.status] ?? w.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {w.bank_name} · ····{w.iban.slice(-4)}
                        </p>
                        {w.admin_notes && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{w.admin_notes}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                        {formatDate(w.created_at)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Transaction history */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-gray-500" />
                  İşlem Geçmişi
                  {transactions.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">{transactions.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Henüz işlem bulunmuyor.</p>
                ) : (
                  <div className="divide-y dark:divide-gray-700">
                    {transactions.map((t) => (
                      <div key={t.id} className="py-3 flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                          t.transaction_type === 'earned'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-orange-100 dark:bg-orange-900/30'
                        }`}>
                          {t.transaction_type === 'earned' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-orange-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {t.description}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(t.created_at)}</p>
                        </div>
                        <span className={`font-semibold shrink-0 ${
                          t.transaction_type === 'earned' ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {t.transaction_type === 'earned' ? '+' : '-'}{formatPrice(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
