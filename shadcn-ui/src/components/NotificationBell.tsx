import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { mysqlAPI } from '@/lib/mysql-api';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    const token = localStorage.getItem('mysql-auth-token');
    if (!token) return;
    try {
      const response = await mysqlAPI.getNotifications();
      if (response.success) {
        setNotifications(response.notifications || []);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.is_read) {
        await mysqlAPI.markAsRead(notification.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Navigate based on notification type
      const data = notification.data ? JSON.parse(notification.data) : {};
      
      switch (notification.type) {
        case 'order_status_change':
        case 'order_delivered':
          if (data.orderNumber) {
            navigate(`/order/${data.orderNumber}`);
          } else {
            navigate('/dashboard?tab=orders');
          }
          break;
        case 'order_created':
          // Bildirim içeriğine göre satıcı mı alıcı mı kontrol et
          if (notification.title?.includes('Satıldı') || notification.message?.includes('satıldı')) {
            // Satıcı için - Sattıklarım sekmesine git
            navigate('/dashboard?tab=sales');
          } else {
            // Alıcı için - Aldıklarım sekmesine git
            navigate('/dashboard?tab=orders');
          }
          break;
        case 'listing_approved':
        case 'listing_rejected':
        case 'listing_created':
        case 'listing_favorited':
          // İlan ile ilgili bildirimler - ilana yönlendir
          if (data.listingId) {
            navigate(`/listing/${data.listingId}`);
          } else {
            navigate('/dashboard?tab=listings');
          }
          break;
        case 'offer_approved':
        case 'offer_rejected':
          // Kullanıcının kendi teklifleri için
          navigate('/dashboard?tab=offers');
          break;
        case 'new_offer':
          // İlan sahibine gelen yeni teklif - Gelen Teklifler'e yönlendir
          navigate('/dashboard?tab=incoming-offers');
          break;
        default:
          navigate('/dashboard');
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await mysqlAPI.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_created':
        return '🛒';
      case 'order_status_change':
        return '📦';
      case 'order_delivered':
        return '✅';
      case 'listing_created':
        return '📝';
      case 'listing_approved':
        return '✅';
      case 'listing_rejected':
        return '❌';
      case 'new_offer':
        return '💰';
      case 'offer_approved':
        return '✅';
      case 'offer_rejected':
        return '❌';
      default:
        return '🔔';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: tr 
      });
    } catch {
      return '';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Bildirimler</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs"
            >
              Tümünü okundu işaretle
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Bildirim bulunmuyor
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`flex flex-col items-start p-3 cursor-pointer ${
                !notification.is_read ? 'bg-orange-50' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-2 w-full">
                <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{notification.title}</p>
                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTime(notification.created_at)}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-sm text-orange-600 cursor-pointer"
              onClick={() => {
                navigate('/notifications');
                setIsOpen(false);
              }}
            >
              Tüm bildirimleri görüntüle
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
