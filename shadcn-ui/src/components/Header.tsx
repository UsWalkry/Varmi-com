import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, LogOut, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataManager } from '@/lib/mockData';
import MessageCenter from './MessageCenter';

export default function Header() {
  const navigate = useNavigate();
  const [isMessageCenterOpen, setIsMessageCenterOpen] = useState(false);
  
  const currentUser = DataManager.getCurrentUser();
  const unreadCount = currentUser ? DataManager.getUnreadMessageCount(currentUser.id) : 0;

  const handleLogin = () => {
    DataManager.login('user1', 'password');
    window.location.reload();
  };

  const handleLogout = () => {
    DataManager.logout();
    navigate('/');
    window.location.reload();
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => navigate('/')}
            >
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                TeklifVar
              </h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Button variant="ghost" onClick={() => navigate('/')}>
                Ana Sayfa
              </Button>
              <Button variant="ghost" onClick={() => navigate('/create-listing')}>
                İlan Ver
              </Button>
              {currentUser && (
                <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Panelim
                </Button>
              )}
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {currentUser ? (
                <>
                  {/* Messages */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMessageCenterOpen(true)}
                    className="relative"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Mesajlar</span>
                    {unreadCount > 0 && (
                      <Badge 
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>

                  {/* User Menu */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="hidden sm:block font-medium">{currentUser.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <Button onClick={handleLogin}>
                  <User className="h-4 w-4 mr-2" />
                  Giriş Yap
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Message Center Modal */}
      <MessageCenter 
        isOpen={isMessageCenterOpen} 
        onClose={() => setIsMessageCenterOpen(false)} 
      />
    </>
  );
}