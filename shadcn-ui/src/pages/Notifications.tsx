import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mysqlAPI } from '@/lib/mysql-api';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import Header from '@/components/Header-mysql';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await mysqlAPI.getNotifications();
      if (response.success) {
        setNotifications(response.notifications || []);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Bildirimler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.is_read) {
        await mysqlAPI.markAsRead(notification.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      }

      // Navigate based on notification type
      const data = notification.data ? (typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data) : {};
      
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
          if (notification.title?.includes('Satıldı') || notification.message?.includes('satıldı')) {
            navigate('/dashboard?tab=sales');
          } else {
            navigate('/dashboard?tab=orders');
          }
          break;
        case 'listing_approved':
        case 'listing_rejected':
        case 'listing_created':
        case 'listing_favorited':
          if (data.listingId) {
            navigate(`/listing/${data.listingId}`);
          } else {
            navigate('/dashboard?tab=listings');
          }
          break;
        case 'offer_approved':
        case 'offer_rejected':
          navigate('/dashboard?tab=offers');
          break;
        case 'new_offer':
          navigate('/dashboard?tab=incoming-offers');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await mysqlAPI.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Tüm bildirimler okundu olarak işaretlendi');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('İşlem başarısız');
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
      case 'listing_favorited':
        return '❤️';
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'order_created': return 'Sipariş';
      case 'order_status_change': return 'Sipariş Durumu';
      case 'order_delivered': return 'Teslimat';
      case 'listing_created': return 'İlan';
      case 'listing_approved': return 'İlan Onayı';
      case 'listing_rejected': return 'İlan Reddi';
      case 'new_offer': return 'Yeni Teklif';
      case 'offer_approved': return 'Teklif Onayı';
      case 'offer_rejected': return 'Teklif Reddi';
      case 'listing_favorited': return 'Favori';
      default: return 'Bildirim';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bell className="h-6 w-6" />
                Bildirimler
              </h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} okunmamış bildirim
                </p>
              )}
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
              className="flex items-center gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Tümünü Okundu İşaretle
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Yükleniyor...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Bildirim Yok</h3>
                <p className="text-muted-foreground">Henüz hiç bildiriminiz bulunmuyor.</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium truncate ${!notification.is_read ? 'text-blue-900' : 'text-gray-900'}`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <Badge variant="default" className="bg-blue-500 text-xs">
                              Yeni
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(notification.type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Read indicator */}
                      <div className="flex-shrink-0">
                        {notification.is_read ? (
                          <Check className="h-4 w-4 text-gray-400" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
