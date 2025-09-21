import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DataManager } from '@/lib/mockData';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
}

export default function AuthenticatorSetupDialog({ open, onOpenChange, userId }: Props) {
  const [otpauthUrl, setOtpauthUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [step, setStep] = useState<'show'|'verify'|'done'>('show');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!open || !userId) return;
    try {
      const res = DataManager.beginAuthenticatorSetup(userId);
      if (res) {
        setOtpauthUrl(res.otpauthUrl);
        setSecret(res.secret);
        setStep('show');
        setToken('');
        setError('');
      } else {
        setError('Kurulum başlatılamadı.');
      }
    } catch (e) {
      console.error('2FA setup init error:', e);
      setError('Kurulum başlatılırken bir hata oluştu.');
    }
  }, [open, userId]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await DataManager.verifyAndEnableAuthenticator(userId, token);
    if (ok) {
      setStep('done');
    } else {
      setError('Kod doğrulanamadı. Lütfen uygulamadaki 6 haneli kodu girin.');
    }
  };

  const handleClose = () => {
    if (step !== 'done') {
      DataManager.cancelAuthenticatorSetup(userId);
    }
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o)=>{
        if (!o && step !== 'done' && userId) {
          try { DataManager.cancelAuthenticatorSetup(userId); } catch (e) {
            console.warn('2FA setup cancel error:', e);
          }
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Authenticator ile 2FA Kurulumu</DialogTitle>
        </DialogHeader>

        {step !== 'done' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              {otpauthUrl ? (
                <QRCodeSVG value={otpauthUrl} width={180} height={180} />
              ) : (
                <div className="w-[180px] h-[180px] bg-muted animate-pulse" />
              )}
            </div>
            <div className="text-center text-sm text-muted-foreground break-all">
              Gizli anahtar: <span className="font-mono">{secret}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Google Authenticator, 1Password, Microsoft Authenticator ya da benzeri bir uygulama ile QR kodu tarayın.
              Ardından uygulamanın ürettiği 6 haneli kodu aşağıya girin.
            </p>
            <form onSubmit={handleVerify} className="space-y-2">
              <Label htmlFor="token">6 haneli kod</Label>
              <Input
                id="token"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={token}
                onChange={(e)=>setToken(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="000000"
                required
              />
              {error && <div className="text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleClose}>İptal</Button>
                <Button type="submit">Doğrula ve Etkinleştir</Button>
              </div>
            </form>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <p className="text-sm">Authenticator ile iki aşamalı doğrulama başarıyla etkinleştirildi.</p>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Kapat</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
