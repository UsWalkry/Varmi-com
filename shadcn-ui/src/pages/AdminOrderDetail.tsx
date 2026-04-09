import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  CreditCard,
  Truck,
  Calendar,
  Phone,
  Mail,
  Edit,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { mysqlAPI } from '@/lib/mysql-api';
import { getTimeAgo } from '@/lib/uiUtils';
import { formatPrice } from '@/utils/formatPrice';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  shippingCost: number;
  shippingAddress: string;
  trackingNumber?: string;
  carrierCompany?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
  startedProcessingAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  buyer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    title: string;
    description: string;
    price: number;
    quantity: number;
    image?: string;
    seller: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
    };
  }>;
}

const orderStatusConfig = {
  pending: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  preparing: { label: 'Hazırlanıyor', color: 'bg-orange-100 text-orange-800', icon: Package },
  shipped: { label: 'Kargoda', color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'İptal Edildi', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      loadOrderDetail(orderId);
    }
  }, [orderId]);

  const loadOrderDetail = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await mysqlAPI.getAdminOrderDetail(id);
      
      if (response.success && response.order) {
        setOrder(response.order);
      } else {
        setError('Sipariş detayları yüklenemedi');
      }
    } catch (error) {
      console.error('Error loading order detail:', error);
      setError('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = orderStatusConfig[status as keyof typeof orderStatusConfig];
    if (!config) return null;
    
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Yükleniyor...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !order) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <XCircle className="h-12 w-12 text-red-500" />
          <div className="text-lg font-medium">{error || 'Sipariş bulunamadı'}</div>
          <Button onClick={() => navigate('/admin/orders')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Siparişlere Dön
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate('/admin/orders')} 
              variant="outline" 
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Sipariş Detayı</h1>
              <p className="text-gray-600">{order.orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(order.status)}
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Sipariş Ürünleri ({order.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.items?.length > 0 ? (
                  order.items.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded-md"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-product.png';
                          }}
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        <h4 className="font-medium">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            Satıcı: {item.seller?.firstName} {item.seller?.lastName}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {item.quantity}x {formatPrice(item.price)}
                            </div>
                            <div className="text-sm font-bold">
                              {formatPrice(item.price * item.quantity)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Bu siparişte ürün bulunamadı</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Sipariş Geçmişi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="font-medium">Sipariş Oluşturuldu</div>
                      <div className="text-sm text-gray-500">{getTimeAgo(order.createdAt)}</div>
                    </div>
                  </div>
                  
                  {order.startedProcessingAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="font-medium">Hazırlığa Alındı</div>
                        <div className="text-sm text-gray-500">{getTimeAgo(order.startedProcessingAt)}</div>
                      </div>
                    </div>
                  )}
                  
                  {order.shippedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="font-medium">Kargoya Verildi</div>
                        <div className="text-sm text-gray-500">{getTimeAgo(order.shippedAt)}</div>
                        {order.trackingNumber && (
                          <div className="text-sm text-gray-600">
                            Takip No: {order.trackingNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {order.deliveredAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="font-medium">Teslim Edildi</div>
                        <div className="text-sm text-gray-500">{getTimeAgo(order.deliveredAt)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Sipariş Özeti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Ara Toplam</span>
                  <span>{formatPrice((order.totalAmount || 0) - (order.shippingCost || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kargo</span>
                  <span>{formatPrice(order.shippingCost || 0)}</span>
                </div>
                <hr className="border-gray-200" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Toplam</span>
                  <span>{formatPrice(order.totalAmount || 0)}</span>
                </div>
                {order.paymentStatus && (
                  <div className="mt-2">
                    <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                      {order.paymentStatus === 'paid' ? 'Ödendi' : 'Ödeme Bekleniyor'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Satıcı Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  <div className="space-y-4">
                    {/* Unique sellers from items */}
                    {Array.from(new Map(order.items.map(item => [
                      `${item.seller?.firstName} ${item.seller?.lastName}`.trim(),
                      item.seller
                    ])).values()).filter(seller => seller?.firstName || seller?.lastName).map((seller, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="font-medium">
                          {seller.firstName} {seller.lastName}
                        </div>
                        {seller.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4" />
                            {seller.email}
                          </div>
                        )}
                        {seller.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4" />
                            {seller.phone}
                          </div>
                        )}
                        {/* Show items from this seller */}
                        <div className="text-sm text-gray-500">
                          Ürünler: {order.items.filter(item => 
                            item.seller?.firstName === seller.firstName && 
                            item.seller?.lastName === seller.lastName
                          ).map(item => item.title).join(', ')}
                        </div>
                      </div>
                    ))}
                    {Array.from(new Map(order.items.map(item => [
                      `${item.seller?.firstName} ${item.seller?.lastName}`.trim(),
                      item.seller
                    ])).values()).filter(seller => seller?.firstName || seller?.lastName).length === 0 && (
                      <div className="text-gray-500">Satıcı bilgisi bulunamadı</div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">Ürün bulunamadı</div>
                )}
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Müşteri Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-medium">
                  {order.buyer?.firstName} {order.buyer?.lastName}
                </div>
                {order.buyer?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" />
                    {order.buyer.email}
                  </div>
                )}
                {order.buyer?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" />
                    {order.buyer.phone}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Teslimat Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  {order.shippingAddress}
                </div>
                {order.carrierCompany && (
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4" />
                    {order.carrierCompany}
                  </div>
                )}
                {order.trackingNumber && (
                  <div className="text-sm">
                    <span className="font-medium">Takip No:</span><br />
                    {order.trackingNumber}
                  </div>
                )}
                {order.estimatedDelivery && (
                  <div className="text-sm">
                    <span className="font-medium">Tahmini Teslimat:</span><br />
                    {new Date(order.estimatedDelivery).toLocaleDateString('tr-TR')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}