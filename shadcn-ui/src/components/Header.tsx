import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, User, LogOut, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataManager } from '@/lib/mockData';
import AuthModal from './AuthModal';
import MessageCenter from './MessageCenter';

interface HeaderProps {
  showCreateButton?: boolean;
  showUserActions?: boolean;
}

export default function Header({ showCreateButton = true, showUserActions = true }: HeaderProps) {
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMessageCenterOpen, setIsMessageCenterOpen] = useState(false);
  const currentUser = DataManager.getCurrentUser();

  const handleAuthSuccess = () => {
    window.location.reload();
  };

  const handleLogout = () => {
    DataManager.logoutUser();
    navigate('/');
    window.location.reload();
  };

  const getUnreadMessageCount = () => {
    if (!currentUser) return 0;
    const allMessages = DataManager.getAllMessages();
    return allMessages.filter(
      msg => msg.toUserId === currentUser.id && !msg.read
    ).length;
  };

  const unreadMessageCount = currentUser ? getUnreadMessageCount() : 0;

  return (
    <>
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => navigate('/')}
            >
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <h1 className="text-xl font-bold text-blue-600">Var mı?</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {currentUser && showUserActions && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsMessageCenterOpen(true)}
                    className="relative"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Mesajlar
                    {unreadMessageCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-xs min-w-[20px] h-5 flex items-center justify-center">
                        {unreadMessageCount}
                      </Badge>
                    )}
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/dashboard')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Panelim
                  </Button>
                </>
              )}

              {showCreateButton && (
                <Button onClick={() => navigate('/create-listing')}>
                  <Plus className="h-4 w-4 mr-2" />
                  İlan Ver
                </Button>
              )}

              {currentUser ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Merhaba, {currentUser?.name ? currentUser.name.split(' ')[0] : 'Kullanıcı'}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLogout}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Çıkış Yap
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  Giriş Yap
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {currentUser && (
        <MessageCenter
          isOpen={isMessageCenterOpen}
          onClose={() => setIsMessageCenterOpen(false)}
        />
      )}
    </>
  );
}