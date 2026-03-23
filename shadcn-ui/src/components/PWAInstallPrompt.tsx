import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user dismissed this before
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 5000); // Show after 5 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install');
    } else {
      console.log('[PWA] User dismissed install');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    
    // Show again after 7 days
    setTimeout(() => {
      localStorage.removeItem('pwa-prompt-dismissed');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  if (isStandalone) return null;

  // iOS install instructions
  if (isIOS && showPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:w-96">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Uygulamayı Yükle</h3>
            </div>
            <button onClick={handleDismiss} className="text-white/80 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-white/90 mb-3">
            Safari'den ana ekrana eklemek için:
          </p>
          <ol className="text-sm text-white/90 space-y-1 list-decimal list-inside">
            <li>Alt taraftaki <strong>Paylaş</strong> düğmesine tıklayın</li>
            <li><strong>Ana Ekrana Ekle</strong> seçeneğini seçin</li>
            <li><strong>Ekle</strong> düğmesine tıklayın</li>
          </ol>
        </div>
      </div>
    );
  }

  // Android/Desktop install prompt
  if (deferredPrompt && showPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:w-96">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Uygulamayı Yükle</h3>
            </div>
            <button onClick={handleDismiss} className="text-white/80 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-white/90 mb-4">
            Varmii'yi cihazınıza yükleyin - daha hızlı ve çevrimdışı erişim!
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={handleInstallClick}
              className="flex-1 bg-white text-purple-600 hover:bg-white/90"
            >
              Yükle
            </Button>
            <Button 
              onClick={handleDismiss}
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              Sonra
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
