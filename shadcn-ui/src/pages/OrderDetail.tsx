import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Package, Truck, MapPin, Calendar, User, ExternalLink, CheckCircle, XCircle, Star, X } from 'lucide-react';
import Header from '../components/Header';
import { mysqlAPI } from '../lib/mysql-api';
import { toast } from 'sonner';
import OrderStatusTimeline from '@/components/ui/OrderStatusTimeline';
import { useAuth } from '@/hooks/use-auth-mysql';
import { formatPrice } from '@/utils/formatPrice';

import { maskDisplayName, maskEmail } from '@/lib/utils';

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // URL'den hangi sayfadan geldiği bilgisini al
  const fromPage = searchParams.get('from');
  const tabParam = searchParams.get('tab');
  
  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [sellerReviews, setSellerReviews] = useState<any>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDescription, setCancelDescription] = useState('');
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnDescription, setReturnDescription] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [returnImages, setReturnImages] = useState<FileList | null>(null);

  // Return modal kapanınca state'i sıfırla
  useEffect(() => {
    if (!returnModalOpen) {
      setReturnReason('');
      setReturnDescription('');
      setShowImageUpload(false);
      setReturnImages(null);
    }
  }, [returnModalOpen]);

  useEffect(() => {
    const loadOrderData = async () => {
      if (!orderId) return;
      
      // Auth kontrolü
      if (!user) {
        console.log('❌ User not authenticated, redirecting to login');
        toast.error('Bu sayfaya erişmek için giriş yapmalısınız');
        navigate('/');
        return;
      }
      
      console.log('✅ User authenticated:', { userId: user.id, email: user.email });
      
      try {
        setIsLoading(true);
        const response = await mysqlAPI.getOrderDetails(orderId);
        console.log('🔍 OrderDetail API response:', response);
        console.log('🔍 Response type:', typeof response);
        console.log('🔍 Response keys:', response ? Object.keys(response) : 'null/undefined');
        
        if (response && response.success && response.order) {
          console.log('✅ Valid response, setting order data:', response.order);
          setOrderData(response.order);
        } else {
          console.error('❌ Invalid response format:', {
            hasResponse: !!response,
            hasSuccess: response?.success,
            hasOrder: response?.order,
            fullResponse: response
          });
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error loading order:', error);
        toast.error('Sipariş detayları yüklenirken hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderData();
  }, [orderId, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-lg font-medium text-muted-foreground mt-4">Sipariş detayları yükleniyor...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">Sipariş bulunamadı</p>
              <Button onClick={() => navigate('/dashboard')} variant="outline">
                Panele Dön
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (orderData.status) {
      case 'shipped':
        return <Truck className="h-5 w-5" />;
      case 'preparing':
        return <Package className="h-5 w-5" />;
      case 'delivered':
        return <Package className="h-5 w-5" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getStatusBadge = () => {
    const statusLabels = {
      pending: 'Beklemede',
      confirmed: 'Onaylandı',
      preparing: 'Hazırlanıyor',
      shipped: 'Kargoya Verildi',
      delivered: 'Teslim Edildi',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi'
    };

    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-orange-100 text-orange-700',
      shipped: 'bg-green-100 text-green-700',
      delivered: 'bg-green-100 text-green-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    
    return (
      <Badge variant="secondary" className={colors[orderData.status as keyof typeof colors]}>
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          {statusLabels[orderData.status as keyof typeof statusLabels]}
        </div>
      </Badge>
    );
  };

  const rawShippingCost = orderData.shippingCost ?? orderData.shipping_cost ?? 0;
  const shippingCost = typeof rawShippingCost === 'number'
    ? rawShippingCost
    : parseFloat(rawShippingCost) || 0;
  const rawTotalAmount = orderData.total ?? orderData.total_amount ?? 0;
  const totalAmount = typeof rawTotalAmount === 'number'
    ? rawTotalAmount
    : parseFloat(rawTotalAmount) || 0;
  const subtotalAmount = Math.max(totalAmount - shippingCost, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => {
              // Eğer dashboard'dan geldiyse ve tab bilgisi varsa o sekmeye dön
              if (fromPage === 'dashboard' && tabParam) {
                navigate(`/dashboard?tab=${tabParam}`);
              } else {
                // Yoksa tarayıcı geçmişinde bir önceki sayfaya dön
                navigate(-1);
              }
            }}
            className="flex items-center gap-2 self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri Dön
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 break-words">Sipariş #{orderData.orderNumber || orderData.id}</h1>
            <p className="text-gray-600">
              {new Date(orderData.createdAt || orderData.created_at).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-none overflow-hidden">
          {/* Sol Kolon - Sipariş Detayları */}
          <div className="xl:col-span-2 space-y-6 min-w-0">{/* Sipariş Durumu */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="text-lg">Sipariş Durumu</CardTitle>
                  {getStatusBadge()}
                </div>
              </CardHeader>
              <CardContent>
                <OrderStatusTimeline
                  status={orderData.status}
                  createdAt={orderData.createdAt || orderData.created_at}
                  startedProcessingAt={orderData.startedProcessingAt || orderData.started_processing_at}
                  shippedAt={orderData.shippedAt || orderData.shipped_at}
                  deliveredAt={orderData.deliveredAt || orderData.delivered_at}
                  completedAt={orderData.completedAt || orderData.completed_at}
                  trackingNumber={orderData.trackingNumber || orderData.tracking_number}
                  carrierCompany={orderData.carrierCompany || orderData.carrier_company}
                  estimatedDelivery={orderData.estimatedDelivery || orderData.estimated_delivery}
                />
                
                {(orderData.trackingNumber || orderData.tracking_number) && (
                  <div className="pt-4 border-t mt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Truck className="h-4 w-4 text-gray-600 flex-shrink-0" />
                        <span className="text-sm font-medium">Kargo Takip No:</span>
                        <span className="text-sm font-mono break-all">
                          {orderData.trackingNumber || orderData.tracking_number}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="flex items-center gap-1 flex-shrink-0">
                        <ExternalLink className="h-3 w-3" />
                        Takip Et
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* İlan Detayları */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">İlan Detayları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderData.items && orderData.items.map((item: any, itemIndex: number) => {
                    const seller = orderData.sellers?.[itemIndex];
                    return (
                      <div key={item.id} className="border rounded-lg overflow-hidden">
                        {/* Ürün Bilgisi */}
                        <div 
                          className="flex flex-col sm:flex-row items-start gap-4 p-4 hover:bg-gray-50 transition-all cursor-pointer"
                          onClick={() => {
                            if (item.listing_id) {
                              navigate(`/listing/${item.listing_id}`);
                            }
                          }}
                        >
                          <img 
                            src={item.image || "/image-placeholder.png"} 
                            alt={item.title} 
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-medium text-gray-900 break-words hover:text-blue-600">{item.title}</h3>
                              <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            </div>
                            <p className="text-sm text-gray-600 mt-1 break-words overflow-hidden text-ellipsis" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>{item.description}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-2">
                              <span className="text-sm text-gray-600">Adet: {item.quantity}</span>
                              <span className="font-semibold text-gray-900 text-right">{formatPrice(item.price)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Teklif Sahibi */}
                        {seller && (
                          <div className="border-t bg-gray-50 p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-sm text-gray-600 flex-shrink-0">Teklif Sahibi:</span>
                                <span 
                                  className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer truncate"
                                  onClick={() => {
                                    if (seller.seller_id) {
                                      navigate(`/profile/${seller.seller_id}`);
                                    }
                                  }}
                                >
                                  {seller.seller_name || 'Satıcı'}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-1 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 flex-shrink-0"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setSelectedSeller(seller);
                                  setReviewModalOpen(true);
                                  
                                  // Satıcının değerlendirmelerini çek
                                  try {
                                    const response = await fetch(`https://varmii.com:8787/api/users/${seller.seller_id}/reviews`);
                                    const data = await response.json();
                                    if (data.success) {
                                      setSellerReviews(data);
                                    }
                                  } catch (error) {
                                    console.error('Değerlendirmeler yüklenemedi:', error);
                                  }
                                }}
                              >
                                <span className="text-yellow-500">⭐</span>
                                <span className="text-sm font-medium">
                                  {seller.average_rating ? Number(seller.average_rating).toFixed(1) : '0.0'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  /5 ({seller.review_count || 0})
                                </span>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sağ Kolon - Özet ve Eylemler */}
          <div className="space-y-6 min-w-0">
            {/* Sipariş Özeti */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sipariş Özeti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-gray-600">Sipariş No:</span>
                  <span className="font-mono text-sm break-all">{orderData.orderNumber || orderData.id}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-gray-600">Sipariş Tarihi:</span>
                  <span className="text-sm">
                    {new Date(orderData.createdAt || orderData.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-gray-600">Ürün Adedi:</span>
                  <span>{orderData.totalQuantity || orderData.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || orderData.itemCount || orderData.items?.length || 0} adet</span>
                </div>
                <hr className="my-3" />
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-gray-600">Ara Toplam:</span>
                  <span className="font-medium">{formatPrice(subtotalAmount)}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-gray-600">Kargo:</span>
                  <span className="font-medium">{formatPrice(shippingCost)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between font-semibold text-lg gap-1">
                    <span>Toplam:</span>
                    <span className="text-green-600">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sipariş Eylemleri */}
            {!orderData.isSeller && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sipariş Eylemleri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* İptal Et butonu - confirmed ve preparing durumunda */}
                  {(orderData.status === 'confirmed' || orderData.status === 'preparing') && (
                    <>
                      <Button 
                        variant="outline" 
                        className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                        onClick={() => setCancelModalOpen(true)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Siparişi İptal Et
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Sipariş henüz kargoya verilmedi, iptal edebilirsiniz
                      </p>
                    </>
                  )}

                  {/* İade Et butonu - shipped, delivered ve completed durumunda */}
                  {(orderData.status === 'shipped' || orderData.status === 'delivered' || orderData.status === 'completed') && (
                    <>
                      <Button 
                        variant="outline" 
                        className="w-full border-red-500 text-red-600 hover:bg-red-50"
                        onClick={() => setReturnModalOpen(true)}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        İade Talebi Oluştur
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Ürünü iade etmek için talebi oluşturun
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Alıcı Bilgileri */}
            {orderData.buyer && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex flex-col sm:flex-row sm:items-center gap-2">
                    Alıcı Bilgileri
                    {orderData.isSeller && (
                      <Badge variant="secondary" className="text-xs self-start">
                        Gizlilik Koruması
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orderData.isSeller && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <div className="text-orange-600 text-sm break-words">
                          🛡️ <strong>Gizlilik Koruması:</strong> Müşteri bilgileri güvenlik amacıyla maskelenmiştir.
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-gray-600 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium break-words">{maskDisplayName(`${orderData.buyer.firstName} ${orderData.buyer.lastName}`)}</p>
                      <p className="text-sm text-gray-600 break-all">{maskEmail(orderData.buyer.email)}</p>
                      {orderData.buyer.phone && (
                        <p className="text-sm text-gray-600 break-all">{orderData.buyer.phone.substring(0, 7) + ' *** ** **'}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        ⚠️ Bilgiler gizlilik nedeniyle maskelenmiştir
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Teslimat Adresi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex flex-col sm:flex-row sm:items-center gap-2">
                  Teslimat Adresi
                  {orderData.isSeller && (
                    <Badge variant="secondary" className="text-xs self-start">
                      Gizlilik Koruması
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderData.isSeller && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <div className="text-orange-600 text-sm break-words">
                        🛡️ <strong>Gizlilik Koruması:</strong> Teslimat adresi güvenlik amacıyla maskelenmiştir.
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-600 mt-1 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">
                      {orderData.shippingAddress || orderData.shipping_address || 'Teslimat adresi belirtilmemiş'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Değerlendirme Modalı */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                {selectedSeller?.seller_name || 'Satıcı'} - Değerlendirmeler
              </DialogTitle>
            </div>
          </DialogHeader>

          {!sellerReviews ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Genel Değerlendirme */}
              <div className="text-center py-6 border-b">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {sellerReviews.averageRating?.toFixed(1) || '0.0'}
                </div>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`h-6 w-6 ${
                        star <= Math.round(sellerReviews.averageRating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-gray-600">{sellerReviews.totalReviews || 0} değerlendirme</p>
              </div>

              {/* Yıldız Dağılımı */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = sellerReviews.ratingDistribution?.[star] || 0;
                  const percentage = sellerReviews.totalReviews > 0 
                    ? (count / sellerReviews.totalReviews) * 100 
                    : 0;
                  
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-sm w-4">{star}</span>
                      <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400 rounded-full transition-all" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Değerlendirmeler Listesi */}
              {sellerReviews.reviews && sellerReviews.reviews.length > 0 ? (
                <div className="space-y-4">
                  {sellerReviews.reviews.map((review: any) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <User className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {review.reviewer_name || 'Kullanıcı'}
                            </span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`h-4 w-4 ${
                                    star <= review.rating 
                                      ? 'fill-yellow-400 text-yellow-400' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">({review.rating}/5)</span>
                          </div>
                          {review.listing_title && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <Package className="h-3 w-3" />
                              <span className="truncate">{review.listing_title}</span>
                            </div>
                          )}
                          {review.comment && (
                            <p className="text-gray-700 text-sm">{review.comment}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {new Date(review.created_at).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Henüz değerlendirme yok
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setReviewModalOpen(false)}>
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* İptal Modalı */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-600" />
              Sipariş İptal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Sipariş No: <span className="text-gray-900">{orderData?.id}</span>
              </label>
              <p className="text-sm text-gray-600">
                Ürün: <span className="text-gray-900">{orderData?.items?.[0]?.title || 'Ürün bilgisi yok'}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">İptal Sebebi *</label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Lütfen bir neden seçin veya aşağıya detay girin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mind_changed">Fikrim değişti</SelectItem>
                  <SelectItem value="found_better">Daha iyi fiyat buldum</SelectItem>
                  <SelectItem value="wrong_order">Yanlış sipariş verdim</SelectItem>
                  <SelectItem value="late_delivery">Teslimat çok uzun sürüyor</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                İptal sebebinizi detaylandırın veya "Diğer" için yazın
              </label>
              <Textarea
                placeholder="İptal sebebinizi detaylandırın veya 'Diğer' için yazın..."
                value={cancelDescription}
                onChange={(e) => setCancelDescription(e.target.value)}
                rows={4}
              />
            </div>

            <p className="text-xs text-gray-500">
              İptal talebiniz satıcıya bildirilecektir. Sipariş henüz kargoya verilmediği için iptal edilebilir.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={async () => {
                if (!cancelReason && !cancelDescription) {
                  toast.error('Lütfen iptal sebebini belirtin');
                  return;
                }

                try {
                  await mysqlAPI.cancelOrder(orderData.id, {
                    reason: cancelReason
                  });
                  toast.success('Sipariş iptal edildi');
                  setCancelModalOpen(false);
                  // Sayfayı yenile
                  window.location.reload();
                } catch (error) {
                  console.error('İptal hatası:', error);
                  toast.error('İptal işlemi başarısız oldu');
                }
              }}
            >
              Siparişi İptal Et
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* İade Talebi Modal */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>İade Talebi Oluştur</DialogTitle>
            <DialogDescription>
              #{orderData.id.substring(0, 8)} nolu sipariş için iade talebi oluşturuyorsunuz
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">İade Sebebi</label>
              <Select value={returnReason} onValueChange={(value) => {
                setReturnReason(value);
                // İade sebebi seçilince file input göster/gizle
                const reasonRequiresImage = [
                  'defective_product', // Ürün kusurlu/arızalı
                  'not_as_described',  // Açıklamaya uygun değil
                  'received_wrong_item', // Yanlış ürün geldi
                  'damaged_shipping'   // Kargo hasarlı
                ].includes(value);
                setShowImageUpload(reasonRequiresImage);

                // Debug log
                console.log('📸 Return reason selected:', { 
                  reason: value, 
                  requiresImage: reasonRequiresImage 
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="İade sebebini seçin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defective_product">Ürün kusurlu/arızalı</SelectItem>
                  <SelectItem value="not_as_described">Açıklamaya uygun değil</SelectItem>
                  <SelectItem value="changed_mind">Fikrim değişti</SelectItem>
                  <SelectItem value="received_wrong_item">Yanlış ürün geldi</SelectItem>
                  <SelectItem value="damaged_shipping">Kargo hasarlı</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Açıklama (Opsiyonel)</label>
              <Textarea
                value={returnDescription}
                onChange={(e) => setReturnDescription(e.target.value)}
                placeholder="İade sebebinizi detaylı açıklayın..."
                rows={4}
              />
            </div>

            {showImageUpload && (
              <div>
                <label className="text-sm font-medium mb-2 block text-red-600">
                  * Bu iade sebebi için ürün fotoğrafı gereklidir
                </label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    max={5}
                    onChange={(e) => setReturnImages(e.target.files)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    En fazla 5 fotoğraf yükleyebilirsiniz (JPEG, PNG)
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setReturnModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!returnReason && !returnDescription) {
                  toast.error('Lütfen iade sebebini belirtin');
                  return;
                }

                // Eğer fotoğraf gerekli ama yüklenmemişse hata ver
                if (showImageUpload && (!returnImages || returnImages.length === 0)) {
                  toast.error('Lütfen ürün fotoğrafı yükleyin');
                  return;
                }

                try {
                  await mysqlAPI.returnOrder(orderData.id, {
                    reason: returnReason || returnDescription || 'İade talebi',
                    images: returnImages
                  });
                  toast.success('İade talebi oluşturuldu');
                  setReturnModalOpen(false);
                  // Sayfayı yenile
                  window.location.reload();
                } catch (error) {
                  console.error('İade hatası:', error);
                  toast.error('İade talebi oluşturulamadı');
                }
              }}
            >
              İade Talebi Oluştur
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}