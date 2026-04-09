import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, BarChart3 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth-mysql';
import AuthModal from './AuthModal-mysql';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    // MySQL auth'da email confirmation gerekmiyor şimdilik
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
    return `${user.firstName} ${user.lastName}`.trim() || user.email || 'Kullanıcı';
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 group flex-shrink-0">
            <span className="font-bold text-xl bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 bg-clip-text text-transparent hover:from-orange-600 hover:via-amber-300 hover:to-yellow-200 transition-all duration-300">
              Var mıı?
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            {user ? (
              <>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={avatarPreview || ''} 
                          alt={getUserDisplayName()} 
                        />
                        <AvatarFallback>
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
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
                      <Link to="/dashboard">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Panel</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profil</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Çıkış Yap</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAuthModalOpen(true)}
              >
                Giriş Yap
              </Button>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </header>
  );
}