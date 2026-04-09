import { useState, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  Menu,
  X,
  LogOut,
  Home,
  ChevronRight,
  User,
  Tag,
  DollarSign,
  MessageSquare,
  Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth-mysql';
import { toast } from 'sonner';

interface AdminLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/admin'
  },
  {
    id: 'users',
    label: 'Kullanıcılar',
    icon: Users,
    path: '/admin/users'
  },
  {
    id: 'listings',
    label: 'İlanlar',
    icon: Package,
    path: '/admin/listings'
  },
  {
    id: 'offers',
    label: 'Teklifler',
    icon: Tag,
    path: '/admin/offers'
  },
  {
    id: 'seller-profiles',
    label: 'Satıcı Profilleri',
    icon: Store,
    path: '/admin/seller-profiles'
  },
  {
    id: 'orders',
    label: 'Siparişler',
    icon: ShoppingCart,
    path: '/admin/orders'
  },
  {
    id: 'commission',
    label: 'Komisyon Yönetimi',
    icon: DollarSign,
    path: '/admin/commission'
  },
  {
    id: 'support',
    label: 'Destek Talepleri',
    icon: MessageSquare,
    path: '/admin/support'
  },
  {
    id: 'analytics',
    label: 'İstatistikler',
    icon: BarChart3,
    path: '/admin/analytics'
  },
  {
    id: 'settings',
    label: 'Sistem Ayarları',
    icon: Settings,
    path: '/admin/settings'
  }
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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

  const getUserDisplayName = () => {
    if (!user) return 'Admin';
    return `${user.firstName} ${user.lastName}`.trim() || user.email || 'Admin';
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    const breadcrumbs = [
      { label: 'Ana Sayfa', path: '/' }
    ];

    if (segments.length > 0) {
      if (segments[0] === 'admin') {
        breadcrumbs.push({ label: 'Admin', path: '/admin' });
        
        if (segments.length > 1) {
          const currentItem = menuItems.find(item => 
            item.path === `/${segments.join('/')}`
          );
          if (currentItem) {
            breadcrumbs.push({ label: currentItem.label, path: currentItem.path });
          }
        }
      }
    }

    return breadcrumbs;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:static lg:inset-0`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Link to="/admin" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-2 shadow-md">
              <span className="font-black text-lg text-white">Admin</span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                              (item.path === '/admin' && location.pathname === '/admin');
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  {item.label}
                  {item.badge && (
                    <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom section - Back to main site */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <Link
            to="/"
            className="flex items-center px-3 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
          >
            <Home className="mr-3 h-4 w-4" />
            🏠 Ana Siteye Dön
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Breadcrumbs */}
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {getBreadcrumbs().map((crumb, index) => (
                  <div key={crumb.path} className="flex items-center">
                    {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
                    <Link
                      to={crumb.path}
                      className={`hover:text-gray-700 ${
                        index === getBreadcrumbs().length - 1 
                          ? 'text-gray-900 font-medium' 
                          : 'text-gray-500'
                      }`}
                    >
                      {crumb.label}
                    </Link>
                  </div>
                ))}
              </div>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" alt={getUserDisplayName()} />
                      <AvatarFallback className="bg-green-100 text-green-700">
                        {getUserDisplayName().charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Kişisel Profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}