import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { mysqlAPI } from '@/lib/mysql-api';
import { toast } from '@/lib/sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess?: () => void;
}

export default function AuthenticatorSetupDialog({ open, onOpenChange, onSuccess }: Props) {
  const [qrcode, setQRCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [step, setStep] = useState<'qr' | 'verify' | 'done'>('qr');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    
    const setup2FA = async () => {
      try {
        setIsLoading(true);
        const response = await mysqlAPI.setup2FA();
        
        if (response.success && response.data) {
          console.log('2FA Setup Response:', response.data);
          setQRCode(response.data.qrCodeUrl);
          setSecret(response.data.secret);
          setStep('qr');
          setToken('');
        } else {
          toast.error('Doğrulayıcı kurulumu başlatılamadı: ' + (response.error || 'Bilinmeyen hata'));
          onOpenChange(false);
        }
      } catch (error) {
        console.error('2FA setup error:', error);
        toast.error('Doğrulayıcı kurulumu başlatılamadı.');
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    setup2FA();
  }, [open, onOpenChange]);

  const handleVerify = async () => {
    console.log('🔐 Starting 2FA verify with token:', token);
    if (!token || token.length !== 6) {
      toast.error('6 haneli doğrulama kodunu giriniz.');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('🔐 Calling mysqlAPI.verify2FA...');
      const response = await mysqlAPI.verify2FA(token);
      console.log('🔐 Verify response received:', response);
      
      if (response.success) {
        console.log('✅ 2FA verification successful!');
        setStep('done');
        toast.success('Doğrulayıcı başarıyla etkinleştirildi!');
        onSuccess?.();
      } else {
        console.error('❌ 2FA verification failed:', response.error);
        toast.error('Doğrulama kodu yanlış: ' + (response.error || 'Bilinmeyen hata'));
      }
    } catch (error) {
      console.error('2FA verify error:', error);
      toast.error('Doğrulama hatası oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    setStep('qr');
    setQRCode('');
    setSecret('');
    setToken('');
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && step !== 'done') {
          setStep('qr');
          setQRCode('');
          setSecret('');
          setToken('');
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Authenticator ile 2FA Kurulumu</DialogTitle>
        </DialogHeader>

        {step === 'qr' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              {qrcode ? (
                <img src={qrcode} alt="QR Code" width={200} height={200} />
              ) : (
                <div className="w-[200px] h-[200px] bg-muted animate-pulse flex items-center justify-center">
                  {isLoading ? 'Yükleniyor...' : 'QR Kod'}
                </div>
              )}
            </div>
            {secret && (
              <div className="text-center text-sm text-muted-foreground break-all">
                Gizli anahtar: <span className="font-mono">{secret}</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Google Authenticator, Microsoft Authenticator veya benzeri bir uygulama ile QR kodu tarayın.
              Ardından uygulamanın ürettiği 6 haneli kodu aşağıya girin.
            </p>
            <div className="space-y-2">
              <Label htmlFor="token">6 haneli doğrulama kodu</Label>
              <Input
                id="token"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                İptal
              </Button>
              <Button 
                onClick={handleVerify}
                disabled={isLoading || token.length !== 6}
              >
                {isLoading ? 'Doğrulanıyor...' : 'Doğrula ve Etkinleştir'}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <div className="text-green-600 text-lg">✓</div>
            <p className="text-sm">
              Authenticator ile iki aşamalı doğrulama başarıyla etkinleştirildi!
            </p>
            <div className="flex justify-center">
              <Button onClick={handleDone}>Kapat</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}