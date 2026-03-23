import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'varmi-cookie-consent';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    // Add slide-out animation class before hiding
    const banner = document.getElementById('cookie-banner');
    if (banner) {
      banner.classList.add('animate-out', 'slide-out-to-bottom-5');
      setTimeout(() => setIsVisible(false), 300);
    } else {
      setIsVisible(false);
    }
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    // Add slide-out animation class before hiding
    const banner = document.getElementById('cookie-banner');
    if (banner) {
      banner.classList.add('animate-out', 'slide-out-to-bottom-5');
      setTimeout(() => setIsVisible(false), 300);
    } else {
      setIsVisible(false);
    }
  };

  const handleClose = () => {
    // If user closes without choosing, we'll ask again next time
    const banner = document.getElementById('cookie-banner');
    if (banner) {
      banner.classList.add('animate-out', 'slide-out-to-bottom-5');
      setTimeout(() => setIsVisible(false), 300);
    } else {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      id="cookie-banner"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-black shadow-2xl animate-in slide-in-from-bottom-5 duration-500 border-t border-gray-800"
    >
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Content */}
          <div className="flex-1 text-white">
            <h3 className="font-semibold text-lg mb-2">
              Sana Özel Bir Deneyim Sunuyoruz
            </h3>
            <p className="text-sm text-white/90 leading-relaxed">
              Site kullanımınızı iyileştirmek, kişiselleştirmek ve reklamları ilgi alanlarınıza göre özelleştirebilmek için çerezlerden yararlanıyoruz. 
              Kesinlikle gerekli olmayan çerezlerin kullanımına ve çerezler aracılığıyla toplanan kişisel verilerinizin yurt dışına aktarılmasına onay vermek için 
              <span className="font-semibold"> "Tümünü Kabul Et"</span> butonuna tıklayabilirsin. 
              Çerez kullanımına ilişkin detaylı bilgiye{' '}
              <Link 
                to="/cookie-policy" 
                className="underline hover:text-pink-200 transition-colors font-medium"
                onClick={handleClose}
              >
                Çerez Politikası
              </Link>
              'ndan ulaşabilir. 
              Tercihlerini istediğin zaman{' '}
              <Link 
                to="/cookie-policy" 
                className="underline hover:text-pink-200 transition-colors font-medium"
                onClick={handleClose}
              >
                Çerez Ayarları
              </Link>
              'ndan değiştirebilirsin.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              onClick={handleAccept}
              className="bg-white text-purple-700 hover:bg-gray-100 font-semibold shadow-lg transition-all duration-300 hover:scale-105 px-6"
              size="lg"
            >
              Tümünü Kabul Et
            </Button>
            
            <Link to="/cookie-policy" onClick={handleClose}>
              <Button
                variant="outline"
                className="bg-white/10 text-white border-white/40 hover:bg-white/20 backdrop-blur-sm font-semibold px-6"
                size="lg"
              >
                Çerez Ayarları
              </Button>
            </Link>
            
            <Button
              onClick={handleReject}
              variant="ghost"
              className="text-white hover:bg-white/10 font-semibold px-6"
              size="lg"
            >
              Tümünü Reddet
            </Button>

            <Button
              onClick={handleClose}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 ml-2"
              aria-label="Kapat"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
