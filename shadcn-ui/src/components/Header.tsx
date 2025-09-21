import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, LogOut, BarChart3 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DataManager } from '@/lib/mockData';
import MessageCenter from './MessageCenter';
import AuthModal from './AuthModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const navigate = useNavigate();
  const [isMessageCenterOpen, setIsMessageCenterOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(DataManager.getCurrentUser());
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const updateState = () => {
      const current = DataManager.getCurrentUser();
      setUser(current);
      setUnreadCount(current ? DataManager.getUnreadMessageCount(current.id) : 0);
    };

    updateState();

    window.addEventListener('storage', updateState);
    window.addEventListener('user-updated', updateState as EventListener);
    window.addEventListener('messages-updated', updateState as EventListener);
    const handleAvatarPreview = (ev: Event) => {
      try {
        const ce = ev as CustomEvent<{ avatarUrl?: string }>;
        setAvatarPreview(ce.detail?.avatarUrl || null);
      } catch {
        setAvatarPreview(null);
      }
    };
    const clearAvatarPreview = () => setAvatarPreview(null);
    window.addEventListener('user-avatar-preview', handleAvatarPreview as EventListener);
    window.addEventListener('user-avatar-preview-clear', clearAvatarPreview as EventListener);
    return () => {
      window.removeEventListener('storage', updateState);
      window.removeEventListener('user-updated', updateState as EventListener);
      window.removeEventListener('messages-updated', updateState as EventListener);
      window.removeEventListener('user-avatar-preview', handleAvatarPreview as EventListener);
      window.removeEventListener('user-avatar-preview-clear', clearAvatarPreview as EventListener);
    };
  }, []);

  const handleLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    window.location.reload();
  };

  const handleLogout = () => {
    DataManager.logoutUser();
    navigate('/');
    window.location.reload();
  };

  const memoizedOnClose = useCallback(() => setIsMessageCenterOpen(false), []);

  return (
    <>
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center cursor-pointer">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Var mı?
              </h1>
            </Link>

            {/* Navigation (sadeleştirildi) */}
            <nav className="hidden md:flex items-center space-x-4">
              <Button type="button" variant="ghost" asChild>
                <Link to="/">Ana Sayfa</Link>
              </Button>
              <Button type="button" variant="default" size="lg" asChild className="shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300">
                <Link to="/create-listing">İlan Ver</Link>
              </Button>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {/* Mobile CTA: her sayfada görünür belirgin İlan Ver butonu */}
              <Button type="button" className="md:hidden" asChild>
                <Link to="/create-listing">İlan Ver</Link>
              </Button>
              {user ? (
                <>
                  {/* Account Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center gap-2 cursor-pointer" tabIndex={0} aria-label="Hesap menüsü">
                        <Button variant="outline" size="sm" type="button" className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>Hesabım</span>
                          {unreadCount > 0 && (
                            <Badge className="ml-1 bg-red-500 text-white">{unreadCount}</Badge>
                          )}
                        </Button>
                        {/* Profil resmi butonun dışında sağda */}
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={avatarPreview || user?.avatarUrl || ''} alt={user?.name || 'Profil'} />
                          <AvatarFallback className="text-[10px]">
                            {(user?.name || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate('/profile')}>Profilim</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsMessageCenterOpen(true)}>
                        Mesajlarım {unreadCount > 0 ? `(${unreadCount})` : ''}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                        Panelim
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        Çıkış Yap
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button type="button" onClick={handleLogin}>
                  <User className="h-4 w-4 mr-2" />
                  Giriş Yap
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Message Center Modal */}
      <MessageCenter 
        isOpen={isMessageCenterOpen} 
        onClose={memoizedOnClose} 
      />
    </>
  );
}