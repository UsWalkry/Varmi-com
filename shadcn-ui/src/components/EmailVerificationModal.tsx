import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Mail } from 'lucide-react';
import { verifyEmailCode, sendVerificationCode } from '@/lib/auth';
import { toast } from 'sonner';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onVerified: () => void;
}

export default function EmailVerificationModal({ 
  isOpen, 
  onClose, 
  email, 
  onVerified 
}: EmailVerificationModalProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    if (!code.trim() || code.length !== 6) {
      toast.error('Lütfen 6 haneli doğrulama kodunu girin');
      return;
    }

    setIsVerifying(true);
    try {
      await verifyEmailCode(email, code);
      toast.success('Email başarıyla doğrulandı!');
      onVerified();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Doğrulama başarısız';
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await sendVerificationCode(email);
      toast.success('Yeni doğrulama kodu gönderildi');
      setCode('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kod gönderilemedi';
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Doğrulama
          </DialogTitle>
          <DialogDescription>
            <strong>{email}</strong> adresine gönderilen 6 haneli doğrulama kodunu girin.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="verification-code" className="block text-sm font-medium mb-2">
              Doğrulama Kodu
            </label>
            <Input
              id="verification-code"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="123456"
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={6}
              disabled={isVerifying}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Kod 10 dakika süreyle geçerlidir
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleVerify}
              disabled={isVerifying || code.length !== 6}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Doğrulanıyor...
                </>
              ) : (
                'Doğrula'
              )}
            </Button>

            <Button 
              variant="ghost" 
              onClick={handleResend}
              disabled={isResending}
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                'Yeni Kod Gönder'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}