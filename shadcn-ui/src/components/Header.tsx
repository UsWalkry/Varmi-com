import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, LogOut, BarChart3, Settings, Search, MapPin, ShoppingCart, Wallet, CreditCard, Sun, Moon } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth-mysql';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import AuthModal from './AuthModal-mysql';
import NotificationBell from './NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface HeaderProps {
  onCreateListingClick?: () => void;
}

export default function Header({ onCreateListingClick }: HeaderProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultAddress, setDefaultAddress] = useState<any>(null);

  // URL'den search parametresini oku ve senkronize et
  useEffect(() => {
    const searchParam = searchParams.get('search');
    setSearchQuery(searchParam || '');
  }, [searchParams]);

  // URL parametresinden login modalını aç
  useEffect(() => {
    if (searchParams.get('login') === 'true') {
      setIsAuthModalOpen(true);
      // URL'den parametreyi temizle
      searchParams.delete('login');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    // MySQL auth'da email confirmation gerekmiyor şimdilik
  }, [user]);

  // Kullanıcının adreslerini yükle
  useEffect(() => {
    const loadAddresses = async () => {
      if (user) {
        try {
          const { mysqlAPI } = await import('@/lib/mysql-api');
          const response = await mysqlAPI.getAddresses();
          if (response.success && response.addresses) {
            // Varsayılan adresi bul veya ilk adresi kullan
            const defaultAddr = response.addresses.find((a: any) => a.is_default) || response.addresses[0];
            setDefaultAddress(defaultAddr);
          }
        } catch (error) {
          console.error('Error loading addresses:', error);
        }
      } else {
        setDefaultAddress(null);
      }
    };
    loadAddresses();
  }, [user]);

  // Kullanıcının adreslerini yükle
  useEffect(() => {
    const loadAddresses = async () => {
      if (user) {
        try {
          const { mysqlAPI } = await import('@/lib/mysql-api');
          const response = await mysqlAPI.getAddresses();
          if (response.success && response.addresses) {
            // Varsayılan adresi bul veya ilk adresi kullan
            const defaultAddr = response.addresses.find((a: any) => a.is_default) || response.addresses[0];
            setDefaultAddress(defaultAddr);
          }
        } catch (error) {
          console.error('Error loading addresses:', error);
        }
      } else {
        setDefaultAddress(null);
      }
    };
    loadAddresses();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Başarıyla çıkış yapıldı');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Çıkış yaparken hata oluştu');
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    toast.success('Başarıyla giriş yapıldı!');
  };

  const getUserDisplayName = () => {
    if (!user) return 'Kullanıcı';
    return 'Kullanıcı'; // Ad-soyad maskelenmiş
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    return 'U'; // İlk harf gösterme
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-4 justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group flex-shrink-0">
            <span className="font-bold text-xl bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 bg-clip-text text-transparent hover:from-orange-600 hover:via-amber-300 hover:to-yellow-200 transition-all duration-300">
              Var mıı?
            </span>
          </Link>

          {/* Arama Çubuğu */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Ürün, kategori, marka ara"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4"
              />
            </div>
          </form>

          {/* Sağ Taraf - Teslimat Adresi, Bildirim, Hesap */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Teslimat Adresi */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex items-center gap-2 text-sm"
              onClick={() => user ? navigate('/profile?tab=adresler') : setIsAuthModalOpen(true)}
            >
              <MapPin className="h-4 w-4" />
              <div className="flex flex-col items-start">
                <span className="text-xs text-muted-foreground">TESLİMAT ADRESİ</span>
                <span className="font-medium">
                  {defaultAddress ? (
                    <span className="max-w-[120px] truncate inline-block">
                      {defaultAddress.city || defaultAddress.title || 'Adresim'}
                    </span>
                  ) : 'Adres Ekle'}
                </span>
              </div>
            </Button>

            {user ? (
              <>
                {/* Sepet İkonu */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => navigate('/cart')}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      variant="destructive"
                    >
                      {itemCount}
                    </Badge>
                  )}
                </Button>

                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-muted-foreground">HESABIM</span>
                        <span className="font-medium">Hesabım</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {getUserDisplayName()}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profilim</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Panelim</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/commission">
                        <Wallet className="mr-2 h-4 w-4" />
                        <span>Komisyonlarım</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile/ibans">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>IBAN Yönetimi</span>
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Admin Panel</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={toggleTheme}>
                      {theme === 'dark'
                        ? <Sun className="mr-2 h-4 w-4" />
                        : <Moon className="mr-2 h-4 w-4" />}
                      <span>{theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Çıkış Yap</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm px-3"
                  onClick={() => { setAuthModalTab('register'); setIsAuthModalOpen(true); }}
                >
                  Üye Ol
                </Button>
                <span className="text-muted-foreground">|</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm px-3"
                  onClick={() => { setAuthModalTab('login'); setIsAuthModalOpen(true); }}
                >
                  Giriş Yap
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        defaultTab={authModalTab}
      />
    </header>
  );
}