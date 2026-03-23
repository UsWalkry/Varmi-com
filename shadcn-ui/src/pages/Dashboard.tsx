import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth-mysql';
import { mysqlAPI } from '../lib/mysql-api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Package, TrendingUp, MessageCircle, MapPin, XCircle, Calendar, DollarSign, ImageIcon, ShoppingBag, Truck, Play, Clock, CreditCard, User, CheckCircle, Eye, Edit, X } from 'lucide-react';
import { toast } from 'sonner';
import FavoriteButton from '../components/FavoriteButton';
import Header from '../components/Header';
import OrderStatusBadge from '@/components/ui/OrderStatusBadge';
import ShippingFormModal from '@/components/ui/ShippingFormModal';
import CreateListingModal from '@/components/CreateListingModal';
import EditOfferModal from '@/components/EditOfferModal';
import { formatPrice, formatPriceShort } from '@/utils/formatPrice';
import StarRatingDisplay from '@/components/star-rating-display';
import { coerceNumber } from '@/lib/number-utils';
import ReviewModal from '@/components/ReviewModal';
import SellerReviewsModal from '@/components/SellerReviewsModal';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '@/lib/imageOptimization';

interface Listing {
  id: number;
  title: string;
  description: string;
  city: string;
  location?: string;
  condition: string;
  budgetMax: number;
  budgetMin: number;
  price?: number;
  category: string;
  subcategory: string;
  createdAt: string;
  soldQuantity?: number;
  status: string;
  images?: string;
  offerCount?: number;
  deliveryType?: string;
  expiresAt?: string;
}

interface Offer {
  id: number;
  listingId: number;
  userId: number;
  price: number;
  message: string;
  status: string;
  createdAt: string;
  productName?: string;
  condition?: string;
  shippingCost?: number;
  images?: string;
  approval_status?: string;
  approvalStatus?: string;
  rejection_reason?: string;
  rejectionReason?: string;
}

import { maskDisplayName } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  city?: string;
  phone?: string;
  gender?: string;
  addressLine1?: string;
  district?: string;
  postalCode?: string;
  createdAt?: string;
}

interface OrderTrackingEntry {
  id?: string | number;
  order_id?: string;
  status?: string;
  description?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface OrderStatusInfo {
  status?: string | null;
  trackingStatus?: string | null;
  trackingDescription?: string | null;
  trackingEntries?: OrderTrackingEntry[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL'den aktif sekmeyi oku, yoksa 'listings' olarak başlat
  const tabFromUrl = searchParams.get('tab') || 'listings';
  
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<Offer[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<Record<string, OrderStatusInfo>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [isCreateListingModalOpen, setIsCreateListingModalOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: '',
    trackingNumber: '',
    carrier: '',
  });
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [pendingReviewOrder, setPendingReviewOrder] = useState<{ orderId: string; sellerId?: string | null; sellerName?: string | null } | null>(null);
  const [isEditOfferModalOpen, setIsEditOfferModalOpen] = useState(false);
  const [selectedOfferToEdit, setSelectedOfferToEdit] = useState<Offer | null>(null);
  const [returnDialog, setReturnDialog] = useState<{ open: boolean; order: any | null; reason: string }>({ open: false, order: null, reason: '' });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; order: any | null; reason: string }>({ open: false, order: null, reason: '' });
  const [returnImages, setReturnImages] = useState<File[]>([]);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [selectedSellerName, setSelectedSellerName] = useState<string>('');
  
  // Komisyon state'leri
  const [commissionBalance, setCommissionBalance] = useState({
    balance: 0,
    totalEarned: 0,
    totalWithdrawn: 0
  });

  // URL'deki tab parametresi değiştiğinde activeTab'ı güncelle
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'listings';
    console.log('📍 Tab changed from URL:', tabFromUrl);
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  // Predefined reason lists
  const CANCEL_REASONS = [
    'Yanlış ürün sipariş edildi',
    'Satın almaktan vazgeçtim',
    'Fiyat değişti',
    'Teslimat süresi çok uzun',
    'Satıcıyla iletişime geçtim, iptal istedim',
    'Diğer'
  ];

  const RETURN_REASONS = [
    'Ürün hasarlı veya eksik çıktı',
    'Ürün beklediğimden farklı',
    'Yanlış ürün gönderildi',
    'Satıcıya ulaşamadım',
    'Ürün açıklamasıyla uyuşmuyor',
    'Diğer'
  ];

  // İade nedenleri için fotoğraf gerektirenler
  const RETURN_REASONS_REQUIRING_IMAGES = [
    'Ürün hasarlı veya eksik çıktı',
    'Ürün beklediğimden farklı',
    'Yanlış ürün gönderildi',
    'Ürün açıklamasıyla uyuşmuyor'
  ];

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Helper function to ensure array response
  const ensureArray = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
    if (data && typeof data === 'object' && Array.isArray(data.listings)) return data.listings;
    if (data && typeof data === 'object' && Array.isArray(data.offers)) return data.offers;
    if (data && typeof data === 'object' && Array.isArray(data.favorites)) return data.favorites;
    return [];
  };

  const handleStatusUpdate = async (orderId: string, data: { status: string; trackingNumber?: string; carrier?: string; estimatedDelivery?: string }) => {
    try {
      console.log('📦 Updating order status:', { orderId, data });
      await mysqlAPI.updateOrderStatus(orderId, data.status, data.trackingNumber);
      toast.success('Sipariş durumu güncellendi');
      setShowStatusModal(false);
      // Refresh sales data
      loadDashboardData();
    } catch (error) {
      console.error('? Status update error:', error);
      toast.error('Durum güncellenirken hata oluştu');
    }
  };

  // İşlemi Başlat handler
  const handleStartProcessing = async (orderId: string) => {
    try {
      console.log('?? Starting order processing:', orderId);
      const result = await mysqlAPI.startOrderProcessing(orderId);
      
      if (result.success) {
        toast.success('Sipariş işleme alındı');
        // Add a small delay to ensure database transaction is committed
        setTimeout(() => {
          loadDashboardData(); // Refresh data
        }, 500);
      } else {
        toast.error(result.error || 'İşlem başlatılırken hata oluştu');
      }
    } catch (error) {
      console.error('? Start processing error:', error);
      toast.error('İşlem başlatılırken bir hata oluştu');
    }
  };

  // Kargo bilgileri eklendi sonrası handler
  const handleShippingAdded = () => {
    setShowShippingModal(false);
    setSelectedSale(null);
    loadDashboardData(); // Refresh data
  };

  // Teslim Aldım handler (for buyers)
  const handleMarkAsDelivered = async (orderId: string) => {
    try {
      console.log('?? Marking order as delivered:', orderId);
      const result = await mysqlAPI.markOrderAsDelivered(orderId);
      
      if (result.success) {
        toast.success('Sipariş tamamlandı');
        if (result.reviewRequired) {
          setPendingReviewOrder({
            orderId,
            sellerId: result.seller?.id ?? null,
            sellerName: result.seller?.name ?? null
          });
        }
        loadDashboardData(); // Refresh data
      } else {
        toast.error(result.error || 'İşlem tamamlanırken hata oluştu');
      }
    } catch (error) {
      console.error('? Mark as delivered error:', error);
      toast.error('İşlem tamamlanırken bir hata oluştu');
    }
  };

  const handleReviewSubmitted = () => {
    const currentPendingOrder = pendingReviewOrder;
    setPendingReviewOrder(null);
    loadDashboardData();
    
    // Değerlendirme tamamlandıktan sonra sipariş detayına git
    if (currentPendingOrder?.orderId) {
      navigate(`/order/${currentPendingOrder.orderId}`);
    }
  };

  // İade talebi handler
  const handleReturnRequest = (order: any) => {
    setReturnDialog({ open: true, order, reason: '' });
    setReturnImages([]); // Reset images
  };

  const handleSubmitReturn = async () => {
    if (!returnDialog.order || !returnDialog.reason.trim()) {
      toast.error('Lütfen iade sebebini belirtin');
      return;
    }

    // Eğer seçilen neden fotoğraf gerektiriyorsa ve fotoğraf yoksa hata ver
    const requiresImages = RETURN_REASONS_REQUIRING_IMAGES.includes(returnDialog.reason);
    if (requiresImages && returnImages.length === 0) {
      toast.error('Bu iade sebebi için en az 1 fotoğraf veya video yüklemeniz gerekiyor');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('reason', returnDialog.reason);
      
      // Fotoğrafları ekle
      returnImages.forEach((file, index) => {
        formData.append('images', file);
      });

      // Backend'e iade talebi gönder
      const response = await fetch(`/api/orders/${returnDialog.order.orderNumber}/return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mysql-auth-token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success('İade talebiniz alındı');
        setReturnDialog({ open: false, order: null, reason: '' });
        setReturnImages([]);
        loadDashboardData();
      } else {
        toast.error(result.error || 'İade talebi oluşturulamadı');
      }
    } catch (error) {
      console.error('❌ Return request error:', error);
      toast.error('İade talebi gönderilirken hata oluştu');
    }
  };

  // Sipariş iptal handler
  const handleCancelOrder = (order: any) => {
    setCancelDialog({ open: true, order, reason: '' });
  };

  const handleSubmitCancel = async () => {
    if (!cancelDialog.order || !cancelDialog.reason.trim()) {
      toast.error('Lütfen iptal sebebini belirtin');
      return;
    }

    try {
      // mysqlAPI kullanarak iptal talebi gönder (order.id UUID'dir)
      const result = await mysqlAPI.cancelOrder(cancelDialog.order.id, {
        reason: cancelDialog.reason
      });

      if (result.success) {
        toast.success('Siparişiniz iptal edildi');
        setCancelDialog({ open: false, order: null, reason: '' });
        loadDashboardData();
      } else {
        toast.error(result.error || 'Sipariş iptal edilemedi');
      }
    } catch (error) {
      console.error('❌ Cancel order error:', error);
      toast.error('Sipariş iptal edilirken hata oluştu');
    }
  };

  const handleViewOrderDetails = async (order: any) => {
    try {
      // Her zaman detay API'sini çağır - güncel requiresReview değeri için
      const orderDetails = await mysqlAPI.getOrderDetails(order.orderNumber);
      const backendRequiresReview = Boolean(orderDetails.order?.requiresReview);
      
      console.log('🔍 Order details from API:', {
        orderNumber: order.orderNumber,
        backendRequiresReview,
        orderDetails: orderDetails.order
      });

      if (backendRequiresReview) {
        // Değerlendirme gerekli - modal aç
        const sellerDisplayName = orderDetails.order?.sellerNames?.[0] || 
          orderDetails.order?.sellers?.[0]?.seller_name || 
          'Satıcı';
        
        setPendingReviewOrder({ 
          orderId: order.orderNumber, 
          sellerId: orderDetails.order?.sellers?.[0]?.seller_id || null, 
          sellerName: sellerDisplayName 
        });
      } else {
        // Değerlendirme yok - direkt detay sayfasına git (hangi sekmeden geldiğini ekle)
        navigate(`/order/${order.orderNumber}?from=dashboard&tab=${activeTab}`);
      }
    } catch (error) {
      console.error('Order details fetch error:', error);
      // Hata durumunda direkt detay sayfasına git (hangi sekmeden geldiğini ekle)
      navigate(`/order/${order.orderNumber}?from=dashboard&tab=${activeTab}`);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('?? Dashboard data loading started...');
      
      // Debug current user
  console.log('?? Current user token:', localStorage.getItem('mysql-auth-token'));
      console.log('?? Current user data:', localStorage.getItem('user'));
      
      // TEMPORARY: Transfer sample orders to current user
      try {
        console.log('?? Transferring sample orders...');
        const transferResponse = await fetch('/api/orders/transfer-sample-orders', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('mysql-auth-token')}`,
            'Content-Type': 'application/json'
          }
        });
        const transferResult = await transferResponse.json();
        console.log('? Transfer result:', transferResult);
      } catch (transferError) {
        console.warn('?? Transfer failed:', transferError);
      }
      
      // Get current user info
      try {
        const userResponse = await mysqlAPI.getCurrentUser();
        console.log('?? Current user from API:', userResponse);
      } catch (userError) {
        console.warn('?? User info failed:', userError);
      }
      
      // Clean up orphaned favorites first
      try {
        await mysqlAPI.cleanupFavorites();
        console.log('?? Orphaned favorites cleaned up');
      } catch (cleanupError) {
        console.warn('?? Favorites cleanup failed:', cleanupError);
      }
      
      const promises = [
        mysqlAPI.getMyListings().catch((error) => { 
          console.error('? getMyListings failed:', error);
          return [];
        }),
        mysqlAPI.getMyOffers(),
        mysqlAPI.getIncomingOffers().catch((error) => {
          console.error('? getIncomingOffers failed:', error);
          // Temporary mock data that matches SQL data
          return [{
            id: '321f7746-ff0c-45d1-bb45-6e8d9b4c08fb',
            listing_id: '23f3551b-1d99-4e6e-96a7-dd2213f5e51d',
            seller_id: '2053cf75-c11d-4d9f-a9f7-781ec179d785',
            seller_name: 'usame binladin',
            seller_rating: 5.0,
            seller_rating_count: 42,
            price: 2200.00,
            quantity: 1,
            sold_quantity: 0,
            product_name: 'sadsad',
            condition: 'new',
            images: '["/uploads/images/321f7746-ff0c-45d1-bb45-6e8d9b4c08fb.jpg"]',
            delivery_type: 'shipping',
            shipping_desi: '6-10',
            shipping_cost: 99.99,
            eta_days: 3,
            status: 'active',
            valid_until: '2025-11-01T00:00:00',
            message: null,
            description: 'asddsad',
            created_at: '2025-10-07T16:02:04',
            updated_at: '2025-10-07T16:02:04',
            listing: {
              title: 'test Var mı?',
              description: 'test',
              category: 'Teknoloji',
              budget_max: 2586.00,
              condition: 'any',
              location: 'İzmir',
              delivery_type: 'both',
              status: 'active',
              offers_public: true
            }
          }];
        }),
        mysqlAPI.getFavorites().catch(() => []),
        mysqlAPI.getOrders().catch((error) => {
          console.error('? getOrders failed:', error);
          console.error('? getOrders error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          return { success: false, orders: [], error: error.message };
        }),
        mysqlAPI.getSales().catch((error) => {
          console.error('? getSales failed:', error);
          return [];
        }),
        // Komisyon bakiyesini yükle
        (async () => {
          console.log('💰 Calling getCommissionBalance...');
          try {
            const result = await mysqlAPI.getCommissionBalance();
            console.log('💰 getCommissionBalance success:', result);
            return result;
          } catch (error) {
            console.error('💰 getCommissionBalance failed:', error);
            return { success: false, balance: 0, totalEarned: 0, totalWithdrawn: 0 };
          }
        })()
      ];

      const [listings, offers, incoming, favorites, ordersResponse, salesResponse, commissionResponse] = await Promise.allSettled(promises);
      
      console.log('?? Raw responses:', { listings, offers, incoming, favorites, ordersResponse, salesResponse, commissionResponse });
      
      // Extract data from response objects that have .data property
      const extractData = (response: any) => {
        if (response.status === 'fulfilled') {
          const value = response.value;
          // Check for different possible data structures
          return value?.data || value?.orders || value?.listings || value?.offers || value || [];
        }
        return [];
      };
      
      const normalizeOfferStatus = (offer: any) => {
        const quantityRaw = offer?.quantity ?? offer?.offer_quantity;
        const soldQuantityRaw = offer?.sold_quantity ?? offer?.soldQuantity;
        const soldToOthersRaw = offer?.sold_to_others ?? offer?.soldToOthers;
        const quantity = typeof quantityRaw === 'number' ? quantityRaw : parseInt(String(quantityRaw ?? 0), 10) || 0;
        const soldQuantity = typeof soldQuantityRaw === 'number' ? soldQuantityRaw : parseInt(String(soldQuantityRaw ?? 0), 10) || 0;
        const soldToOthers = typeof soldToOthersRaw === 'number' ? soldToOthersRaw : parseInt(String(soldToOthersRaw ?? 0), 10) || 0;
        const totalSold = Math.max(soldQuantity, soldToOthers);

        if (quantity > 0 && totalSold >= quantity) {
          const currentStatus = typeof offer?.status === 'string' ? offer.status.toLowerCase() : 'active';
          if (currentStatus === 'active') {
            return { ...offer, status: 'accepted' };
          }
        }
        return offer;
      };

      const listingsData = ensureArray(extractData(listings));
      const offersData = ensureArray(extractData(offers));
      const incomingData = ensureArray(extractData(incoming)).map(normalizeOfferStatus);
      const favoritesData = ensureArray(extractData(favorites));

      // Gelen teklifleri ilana göre grupla
      const offerCountMap = new Map<string, number>();
      incomingData.forEach((offer: any) => {
        const listingId = offer?.listing_id ?? offer?.listingId ?? offer?.listing?.id;
        if (!listingId) return;
        const key = String(listingId);
        offerCountMap.set(key, (offerCountMap.get(key) || 0) + 1);
      });

      const enrichedListings = listingsData.map((listing: any) => {
        const listingId = String(listing?.id ?? listing?.listing_id ?? listing?.listingId ?? '');
        const backendCount = listing?.offerCount ?? listing?.offer_count;
        const computedCount = listingId ? offerCountMap.get(listingId) : undefined;
        const categoryValue = listing?.category ?? listing?.category_name ?? listing?.listing_category ?? listing?.categoryName;
        const conditionValue = listing?.condition ?? listing?.listing_condition ?? listing?.offer_condition ?? listing?.condition_name;
        const deliveryValue = listing?.deliveryType ?? listing?.delivery_type ?? listing?.delivery_type_text;
        const budgetMaxValue = listing?.budgetMax ?? listing?.budget_max ?? listing?.max_budget ?? listing?.price ?? 0;
        const budgetMinValue = listing?.budgetMin ?? listing?.budget_min ?? listing?.min_budget ?? null;
        const expiresValue = listing?.expiresAt ?? listing?.expires_at ?? listing?.expiryDate ?? null;
        const approvalStatusValue = listing?.approval_status ?? listing?.approvalStatus ?? 'approved'; // Default to approved if not set
        const rejectionReasonValue = listing?.rejection_reason ?? listing?.rejectionReason ?? null;

        return {
          ...listing,
          category: categoryValue ?? listing?.category,
          condition: conditionValue ?? listing?.condition,
          deliveryType: deliveryValue ?? listing?.deliveryType,
          budgetMax: budgetMaxValue,
          budgetMin: budgetMinValue,
          expiresAt: expiresValue,
          approval_status: approvalStatusValue,
          rejection_reason: rejectionReasonValue,
          offerCount: computedCount !== undefined ? computedCount : (backendCount ?? 0),
        };
      });

      setMyListings(enrichedListings);
      setMyOffers(offersData);
      setIncomingOffers(incomingData);
      setFavoriteListings(favoritesData);
      
      // Orders'ı ayrı debug et
      console.log('?? Orders Response Raw:', ordersResponse);
      
      // Orders için özel extract
      let ordersData = [];
      if (ordersResponse.status === 'fulfilled') {
        const ordersValue = ordersResponse.value;
        console.log('?? Orders Response Value:', ordersValue);
        
        if (ordersValue?.success && ordersValue?.orders) {
          ordersData = ordersValue.orders;
        } else if (Array.isArray(ordersValue)) {
          ordersData = ordersValue;
        } else {
          ordersData = extractData(ordersResponse);
        }
      }
      
      console.log('?? Orders Extracted Data:', ordersData);
      console.log('?? Orders Response Status:', ordersResponse.status);
      console.log('?? First order items (if any):', ordersData[0]?.items);
      const normalizedOrders = ensureArray(ordersData);
      setOrders(normalizedOrders);
      setOrderStatuses({});

      const pendingReview = normalizedOrders.find((order: any) => order?.requiresReview);
      if (pendingReview) {
        setPendingReviewOrder((current) => current ?? {
          orderId: String(pendingReview.orderNumber || pendingReview.id),
          sellerId: pendingReview.primarySellerId ?? null,
          sellerName: pendingReview.primarySellerName ?? (Array.isArray(pendingReview.sellerNames) ? pendingReview.sellerNames[0] : null)
        });
      } else {
        setPendingReviewOrder(null);
      }
      
      // Sales için de aynı işlemi yap
      let salesData = [];
      if (salesResponse.status === 'fulfilled') {
        const salesValue = salesResponse.value;
        console.log('?? Sales Response Value:', salesValue);
        console.log('?? First sale items (if any):', salesValue?.sales?.[0]?.items);
        
        if (salesValue?.success && salesValue?.sales) {
          salesData = salesValue.sales;
        } else if (Array.isArray(salesValue)) {
          salesData = salesValue;
        } else {
          salesData = extractData(salesResponse);
        }
      }
      
      console.log('?? Sales Extracted Data:', salesData);
      setSales(ensureArray(salesData));
      
      // Komisyon bakiyesini işle
      if (commissionResponse.status === 'fulfilled') {
        const commissionValue = commissionResponse.value;
        console.log('💰 Commission Response Value:', commissionValue);
        
        if (commissionValue && typeof commissionValue === 'object') {
          setCommissionBalance({
            balance: commissionValue.balance || 0,
            totalEarned: commissionValue.totalEarned || 0,
            totalWithdrawn: commissionValue.totalWithdrawn || 0
          });
        }
      } else {
        console.error('💰 Commission balance fetch failed:', commissionResponse.reason);
      }
      
      console.log('? Dashboard data loaded successfully');
    } catch (error) {
      console.error('📊 Dashboard data yüklenirken hata:', error);
      toast.error('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const normalizeStatus = useCallback((value: unknown): string => {
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }
    return '';
  }, []);

  const handleFavoriteChange = useCallback((listingId: string, isFavorite: boolean) => {
    if (isFavorite) {
      // Favorilere eklendi - favoriler listesini yeniden yükle
      mysqlAPI.getFavorites().then(data => {
        setFavoriteListings(ensureArray(data));
      }).catch(console.error);
    } else {
      // Favorilerden çıkarıldı - listeden kaldır
      setFavoriteListings(prev => prev.filter(listing => 
        ((listing as any).listing_id || listing.id).toString() !== listingId
      ));
    }
  }, []);

  const refreshOrderStatuses = useCallback(async (force = false) => {
    if (orders.length === 0) {
      return;
    }

    const allIds = orders
      .map((order: any) => {
        const key = order?.id ?? order?.orderNumber ?? order?.order_id;
        return key !== undefined && key !== null ? String(key) : null;
      })
      .filter((id): id is string => Boolean(id));

    const targets = force ? allIds : allIds.filter((id) => !orderStatuses[id]);

    if (targets.length === 0) {
      return;
    }

    const updates: Record<string, OrderStatusInfo> = {};

    await Promise.all(targets.map(async (id) => {
      try {
        const detail = await mysqlAPI.getOrder(id);
        const statusValueRaw = detail?.status ?? detail?.current_status ?? detail?.order_status;
        const statusValue = typeof statusValueRaw === 'string' ? statusValueRaw : null;
        const trackingEntriesRaw = Array.isArray(detail?.tracking) ? detail?.tracking : [];
        const trackingEntries = (trackingEntriesRaw as OrderTrackingEntry[]).filter(Boolean);
        const latestTrackingEntry = trackingEntries.length > 0
          ? trackingEntries[trackingEntries.length - 1]
          : null;

        if (statusValue || latestTrackingEntry) {
          const previous = orderStatuses[id];
          updates[id] = {
            status: statusValue ?? previous?.status ?? null,
            trackingStatus: typeof latestTrackingEntry?.status === 'string'
              ? latestTrackingEntry.status
              : (previous?.trackingStatus ?? null),
            trackingDescription: typeof latestTrackingEntry?.description === 'string'
              ? latestTrackingEntry.description
              : (previous?.trackingDescription ?? null),
            trackingEntries: trackingEntries.length > 0
              ? trackingEntries
              : (previous?.trackingEntries ?? []),
          };
        }
      } catch (error) {
        console.warn('?? Order status refresh failed', { id, error });
      }
    }));

    if (Object.keys(updates).length > 0) {
      setOrderStatuses((prev) => ({ ...prev, ...updates }));
    }
  }, [orders, orderStatuses]);

  useEffect(() => {
    refreshOrderStatuses();
  }, [refreshOrderStatuses]);

  useEffect(() => {
    if (orders.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      refreshOrderStatuses(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [orders.length, refreshOrderStatuses]);

  const getTimeAgo = (dateString: string) => {
    if (!dateString) {
      console.log('? Invalid date calculation for:', dateString);
      return 'Bilinmiyor';
    }
    
    console.log('?? Date string received:', dateString);
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.log('? Invalid date:', dateString);
      return 'Geçersiz tarih';
    }
    
    console.log('?? Parsed date:', date);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    console.log('?? Diff in minutes:', diffInMinutes);
    
    if (isNaN(diffInMinutes)) {
      console.warn('? Invalid date calculation for:', dateString);
      return 'Tarih bilinmiyor';
    }
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} dakika önce`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} saat önce`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} gün önce`;
    }
  };

  const getDeliveryTypeText = (deliveryType: string) => {
    const deliveryMap: { [key: string]: string } = {
      'shipping': 'Kargo',
      'pickup': 'Elden Teslim',
      'both': 'Kargo/Elden'
    };
    return deliveryMap[deliveryType] || deliveryType;
  };

  const getConditionText = (condition: string) => {
    if (condition === 'new') return 'Sıfır';
    if (condition === 'any') return 'Farketmez';
    return '2. El'; // good, used, and all others map to 2. El
  };

  const getDeliveryText = (deliveryType: string) => {
    switch (deliveryType) {
      case 'shipping': return 'Kargo';
      case 'cargo': return 'Kargo';
      case 'pickup': return 'Elden Teslim';
      case 'hand': return 'Elden Teslim';
      case 'both': return 'Kargo/Elden';
      default: return deliveryType;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'active': 'Aktif',
      'inactive': 'Pasif',
      'deleted': 'Silinmiş',
      'closed': 'Kapalı'
    };
    return statusMap[status] || status;
  };

  // Süresi dolmuş ilan kontrolü: status 'closed' VE expiresAt geçmişte
  const isExpiredListing = (listing: Listing) => {
    if (listing.status !== 'closed') return false;
    if (!listing.expiresAt) return false;
    return new Date(listing.expiresAt) < new Date();
  };

  const handleDeleteListing = async (listingId: number) => {
    if (!confirm('Bu ilanı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await mysqlAPI.deleteListing(listingId.toString());
      setMyListings(prev => prev.filter(listing => listing.id !== listingId));
      toast.success('İlan başarıyla silindi');
    } catch (error) {
      console.error('İlan silinirken hata:', error);
      toast.error('İlan silinirken bir hata oluştu');
    }
  };

  const handleWithdrawOffer = async (offerId: number) => {
    try {
      await mysqlAPI.withdrawOffer(offerId);
      setMyOffers(prev => prev.map(offer => 
        offer.id === offerId ? { ...offer, status: 'withdrawn' } : offer
      ));
      toast.success('Teklif geri çekildi');
    } catch (error) {
      console.error('Teklif geri çekilirken hata:', error);
      toast.error('Teklif geri çekilirken bir hata oluştu');
    }
  };

  const handleEditOffer = (offer: Offer) => {
    setSelectedOfferToEdit(offer);
    setIsEditOfferModalOpen(true);
  };

  const handleOfferUpdated = () => {
    // Refresh offers after update
    loadDashboardData();
  };

  const handleOfferAction = async (offerId: number, action: 'accept' | 'reject') => {
    if (action === 'accept') {
      toast.info('Ödeme adımına yönlendiriliyorsunuz');
      navigate(`/checkout?offerId=${offerId}`);
      return;
    }

    try {
      await mysqlAPI.respondToOffer(offerId.toString(), action);
      setIncomingOffers(prev => prev.map(offer => 
        offer.id === offerId ? { ...offer, status: 'rejected' } : offer
      ));
      toast.success('Teklif reddedildi');
    } catch (error) {
      console.error('Teklif cevaplanırken hata:', error);
      toast.error('Teklif cevaplanırken bir hata oluştu');
    }
  };

  const getImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '/placeholder-image.jpg';
    
    // If it's already a full HTTP URL, extract the path part
    if (imagePath.startsWith('http://localhost:8787')) {
      imagePath = imagePath.replace('http://localhost:8787', '');
    }
    
    // If it's any other HTTP URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // If it starts with /uploads/, return as is (Vite proxy will handle)
    if (imagePath.startsWith('/uploads/')) {
      return imagePath;
    }
    
    // If it's just a filename, try both /uploads/ and /uploads/images/
    if (imagePath.includes('.')) {
      // Check if it's a direct filename (has extension)
      return `/uploads/${imagePath}`;
    }
    
    // Default fallback
    return `/uploads/images/${imagePath}`;
  };

  const parseImages = (imagesString: string | null | undefined | any[]): string[] => {
    if (!imagesString) return [];
    
    // If it's already an array, return it
    if (Array.isArray(imagesString)) {
      return imagesString.filter(img => typeof img === 'string' && img.trim());
    }
    
    // If it's not a string, try to stringify and parse
    if (typeof imagesString !== 'string') {
      try {
        imagesString = JSON.stringify(imagesString);
      } catch {
        return [];
      }
    }
    
    try {
      if (imagesString.startsWith('[')) {
        return JSON.parse(imagesString);
      }
      return imagesString.split(',').map(img => img.trim()).filter(Boolean);
    } catch {
      return imagesString.split(',').map(img => img.trim()).filter(Boolean);
    }
  };

  if (!user) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Giriş Gerekli</h1>
          <p className="text-gray-600 mb-4">İlanı görüntülemek için giriş yapmanız gerekiyor.</p>
          <Button onClick={() => navigate('/?login=true')}>Giriş Yap</Button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Yükleniyor...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Panelim</h1>
          <p className="text-sm md:text-base text-gray-600">
            Hoş geldin, {user?.firstName || 'Kullanıcı'}!
          </p>
        </div>

      <div className="space-y-6">
        {/* Komisyon Bakiyesi Card */}
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Komisyon Bakiyem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Kullanılabilir Bakiye</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(commissionBalance.balance)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Toplam Kazanç</p>
                <p className="text-xl font-semibold text-gray-700">
                  {formatPrice(commissionBalance.totalEarned)}
                </p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                💡 <strong>Komisyon bakiyenizi alışverişlerinizde kullanabilirsiniz!</strong> Teklif satın alırken komisyon bakiyenizden ödeme yapma seçeneği sunulacaktır.
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          setSearchParams({ tab: value });
        }} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 gap-1">
            <TabsTrigger value="listings" className="text-xs md:text-sm">İlanlarım ({myListings.length})</TabsTrigger>
            <TabsTrigger value="offers" className="text-xs md:text-sm">Tekliflerim ({myOffers.length})</TabsTrigger>
            <TabsTrigger value="incoming-offers" className="text-xs md:text-sm">Gelen Teklifler ({incomingOffers.length})</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs md:text-sm">Aldıklarım ({orders.length})</TabsTrigger>
            <TabsTrigger value="sales" className="text-xs md:text-sm">Sattıklarım ({sales.length})</TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs md:text-sm">Favorilerim ({favoriteListings.length})</TabsTrigger>
          </TabsList>

          {/* My Listings Tab */}
          <TabsContent value="listings" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">İlanlarım</h2>
              <Button onClick={() => setIsCreateListingModalOpen(true)}>
                Yeni İlan Oluştur
              </Button>
            </div>
            
            {myListings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">Henüz ilanın yok</p>
                  <p className="text-sm text-muted-foreground mb-4">İlk ilanını oluştur ve satışa başla!</p>
                  <Button onClick={() => navigate('/create-listing')}>
                    İlan Oluştur
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {myListings.filter(listing => listing && listing.id).map((listing) => {
                  console.log('📊 Listing debug:', listing); // Geçici debug
                  const images = parseImages(listing.images);
                  const mainImage = images.length > 0 ? getImageUrl(images[0]) : '/placeholder-image.jpg';

                  const rawBudgetMax = (listing as any).budgetMax ?? (listing as any).budget_max ?? listing.price ?? 0;
                  const rawBudgetMin = (listing as any).budgetMin ?? (listing as any).budget_min ?? null;
                  const hasBudgetMin = rawBudgetMin !== null && rawBudgetMin !== undefined;
                  const showBudgetRange = hasBudgetMin && rawBudgetMin !== rawBudgetMax && rawBudgetMin > 0;
                  const budgetMaxText = `${formatPriceShort(rawBudgetMax)}'ye kadar`;
                  
                  return (
                    <Card key={listing.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                      <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col gap-4">
                          {/* İlan Görseli - Mobilde üstte */}
                          <div className="flex-shrink-0 md:hidden">
                            <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100 border">
                              {images.length > 0 ? (
                                <img 
                                  src={getOptimizedImageUrl(mainImage)}
                                  srcSet={getResponsiveSrcSet(mainImage, [320, 640])}
                                  sizes="(max-width: 768px) 100vw, 320px"
                                  alt={listing.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onLoad={() => console.log('? Image loaded:', mainImage)}
                                  onError={(e) => {
                                    console.log('? Image failed to load:', mainImage);
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-image.jpg';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                          {/* İlan Görseli - Desktop'ta sol tarafta */}
                          <div className="flex-shrink-0 hidden md:block">
                            <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border">
                              {images.length > 0 ? (
                                <img 
                                  src={getOptimizedImageUrl(mainImage)}
                                  srcSet={getResponsiveSrcSet(mainImage, [128, 256])}
                                  sizes="128px"
                                  alt={listing.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onLoad={() => console.log('? Image loaded:', mainImage)}
                                  onError={(e) => {
                                    console.log('? Image failed to load:', mainImage);
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-image.jpg';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* İlan Detayları */}
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-bold text-xl text-gray-900 mb-1">
                                {listing.title || 'İlan başlığı'}
                              </h3>
                              <p className="text-gray-600 text-sm line-clamp-2">
                                {listing.description || 'Açıklama bulunmuyor'}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <div className="flex items-center text-gray-600">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span>{listing.city || listing.location || 'Lokasyon belirtilmedi'}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>
                                  {listing.createdAt
                                    ? getTimeAgo(listing.createdAt)
                                    : listing.expiresAt
                                      ? `Bitiş: ${new Date(listing.expiresAt).toLocaleDateString('tr-TR')}`
                                      : 'Tarih bilgisi yok'}
                                </span>
                              </div>
                              {listing.offerCount !== undefined && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <TrendingUp className="h-4 w-4 mr-1 text-orange-500" />
                                  <span className="font-semibold">{listing.offerCount} teklif</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                              {listing.category && (
                                <Badge variant="secondary">{listing.category}</Badge>
                              )}

                              {listing.deliveryType && (
                                <Badge variant="outline">{getDeliveryText(listing.deliveryType)}</Badge>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-green-600">
                                    {budgetMaxText}
                                  </span>
                                  {showBudgetRange && (
                                    <span className="text-sm text-gray-500">
                                      En az {formatPriceShort(rawBudgetMin ?? 0)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  {/* Onay Durumu Badge'i */}
                                  {listing.approval_status === 'pending' && (
                                    <Badge 
                                      variant="outline" 
                                      className="bg-orange-50 text-orange-700 border-orange-300"
                                    >
                                      ⏳ Admin Onayında
                                    </Badge>
                                  )}
                                  {listing.approval_status === 'rejected' && (
                                    <Badge 
                                      variant="outline" 
                                      className="bg-red-50 text-red-700 border-red-300"
                                    >
                                      ❌ Reddedildi
                                    </Badge>
                                  )}
                                  {/* Aktif/Pasif Durumu Badge'i (sadece onaylanmışlar için) */}
                                  {listing.approval_status === 'approved' && listing.status !== 'closed' && (
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        listing.status === 'active'
                                          ? 'bg-green-50 text-green-700 border-green-300'
                                          : 'bg-gray-50 text-gray-700 border-gray-300'
                                      }
                                    >
                                      {getStatusText(listing.status || 'active')}
                                    </Badge>
                                  )}
                                  {/* Süresi Doldu Badge'i */}
                                  {isExpiredListing(listing) && (
                                    <Badge 
                                      variant="outline" 
                                      className="bg-amber-50 text-amber-700 border-amber-400"
                                    >
                                      ⏰ Süresi Doldu — {new Date(listing.expiresAt!).toLocaleDateString('tr-TR')}
                                    </Badge>
                                  )}
                                  {/* Kapalı ama expired değil (manuel kapatma gibi) */}
                                  {listing.status === 'closed' && !isExpiredListing(listing) && (
                                    <Badge 
                                      variant="outline" 
                                      className="bg-gray-50 text-gray-700 border-gray-300"
                                    >
                                      Kapalı
                                    </Badge>
                                  )}
                                  {listing.soldQuantity && listing.soldQuantity > 0 && (
                                    <span className="text-xs text-green-600 font-medium">
                                      {listing.soldQuantity} satıldı
                                    </span>
                                  )}
                                </div>
                                
                                {/* Red sebebi göster */}
                                {listing.approval_status === 'rejected' && listing.rejection_reason && (
                                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                    <strong>Red Sebebi:</strong> {listing.rejection_reason}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-2 sm:gap-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/listing/${listing.id}`)}
                                  className="w-full sm:w-auto text-xs"
                                >
                                  Görüntüle
                                </Button>
                                {isExpiredListing(listing) ? (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => navigate(`/edit-listing/${listing.id}`)}
                                    className="w-full sm:w-auto text-xs bg-amber-500 hover:bg-amber-600 text-white"
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Güncelle &amp; Yayınla
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(`/edit-listing/${listing.id}`)}
                                    disabled={listing.approval_status === 'pending'}
                                    className="w-full sm:w-auto text-xs"
                                    title={listing.approval_status === 'pending' ? 'Onay bekleyen ilanlar düzenlenemez' : ''}
                                  >
                                    Düzenle
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteListing(listing.id)}
                                  className="w-full sm:w-auto text-xs"
                                >
                                  Sil
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* My Offers Tab */}
          <TabsContent value="offers" className="space-y-4">
            <h2 className="text-xl font-semibold">Tekliflerim</h2>
            
            {myOffers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">Henüz teklifin yok</p>
                  <p className="text-sm text-muted-foreground">Beğendiğin ürünlere teklif ver!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {myOffers.filter(offer => offer && offer.id).map((offer) => {
                  // Type assertion for extended offer data from backend
                  const extendedOffer = offer as any;
                  
                  console.log('?? Offer debug:', {
                    offerId: offer.id,
                    images: offer.images,
                    productName: offer.productName,
                    listingImages: extendedOffer.listing_images,
                    listing: extendedOffer.listing,
                    rawOffer: offer
                  });
                  
                  // Teklif için görsel önce kendi görseli, yoksa ilan görseli
                  let offerImage = null;
                  if (offer.images) {
                    const offerImages = parseImages(offer.images);
                    console.log('📊 Parsed offer images:', offerImages);
                    offerImage = offerImages.length > 0 ? offerImages[0] : null;
                  }
                  
                  // Eğer teklif görseli yoksa, ilan görselini kullan
                  if (!offerImage && extendedOffer.listing_images) {
                    const listingImages = parseImages(extendedOffer.listing_images);
                    console.log('📊 Parsed listing images:', listingImages);
                    offerImage = listingImages.length > 0 ? listingImages[0] : null;
                  }
                  
                  // Eğer listing objesi içinde images varsa onu da dene
                  if (!offerImage && extendedOffer.listing?.images) {
                    const listingImages = parseImages(extendedOffer.listing.images);
                    console.log('?? Parsed listing.images:', listingImages);
                    offerImage = listingImages.length > 0 ? listingImages[0] : null;
                  }
                  
                  const mainImage = offerImage ? getImageUrl(offerImage) : '/placeholder-image.jpg';
                  
                  console.log('??? Final image processing:', {
                    offerImage,
                    mainImage,
                    finalSrc: mainImage
                  });
                  
                  return (
                    <Card key={offer.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500">
                      <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col gap-4">
                          {/* Teklif Görseli - Mobilde üstte */}
                          <div className="flex-shrink-0 md:hidden">
                            <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100 border">
                              <img 
                                src={getOptimizedImageUrl(mainImage)}
                                srcSet={getResponsiveSrcSet(mainImage, [320, 640])}
                                sizes="(max-width: 768px) 100vw, 320px"
                                alt={offer.productName || 'Teklif'}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/placeholder-image.jpg';
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                          {/* Teklif Görseli - Desktop'ta sol tarafta */}
                          <div className="flex-shrink-0 hidden md:block">
                            <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border">
                              <img 
                                src={getOptimizedImageUrl(mainImage)}
                                srcSet={getResponsiveSrcSet(mainImage, [128, 256])}
                                sizes="128px"
                                alt={offer.productName || 'Teklif'}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/placeholder-image.jpg';
                                }}
                              />
                            </div>
                          </div>

                          {/* Teklif Detayları */}
                          <div className="flex-1 space-y-4">
                            <div>
                              <h3 className="font-bold text-xl text-gray-900 mb-1">
                                {extendedOffer.product_name || offer.productName || 'ürün adı bulunamadı'}
                              </h3>
                              <p className="text-gray-600 text-sm mb-2">
                                <strong>İlan:</strong> {extendedOffer.listing?.title || extendedOffer.listing_title || 'Başlık bulunamadı'}
                              </p>
                              <p className="text-gray-600 text-sm line-clamp-2">
                                {offer.message || 'Teklif mesajı bulunmuyor'}
                              </p>
                            </div>

                            {/* İlan Açıklaması */}
                            {extendedOffer.listing?.description && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-1">İlan Açıklaması:</h4>
                                <p className="text-sm text-gray-600 line-clamp-3">
                                  {extendedOffer.listing.description}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center text-gray-600">
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>{getTimeAgo(extendedOffer.created_at || offer.createdAt)}</span>
                              </div>
                              
                              {(offer.condition || extendedOffer.listing?.condition) && (
                                <div className="flex items-center text-gray-600">
                                  <Package className="h-4 w-4 mr-1" />
                                  <span>{getConditionText(offer.condition || extendedOffer.listing?.condition)}</span>
                                </div>
                              )}

                              {/* Stok Miktarı */}
                              {extendedOffer.stock_quantity && (
                                <div className="flex items-center text-gray-600">
                                  <Package className="h-4 w-4 mr-1" />
                                  <span>Stok: {extendedOffer.stock_quantity}</span>
                                </div>
                              )}

                              {/* Geçerlilik Süresi */}
                              {extendedOffer.valid_until && (
                                <div className="flex items-center text-gray-600">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>Bitiş: {new Date(extendedOffer.valid_until).toLocaleDateString('tr-TR')}</span>
                                </div>
                              )}

                              {/* İlan Lokasyonu */}
                              {extendedOffer.listing?.location && (
                                <div className="flex items-center text-gray-600">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span>{extendedOffer.listing.location}</span>
                                </div>
                              )}

                              {/* Teslimat Türü */}
                              {extendedOffer.listing?.delivery_type && (
                                <div className="flex items-center text-gray-600">
                                  <Truck className="h-4 w-4 mr-1" />
                                  <span>{getDeliveryTypeText(extendedOffer.listing.delivery_type)}</span>
                                </div>
                              )}

                              {/* İlan Bütçesi */}
                              {extendedOffer.listing?.budget_max && (
                                <div className="flex items-center text-gray-600">
                                  <Package className="h-4 w-4 mr-1" />
                                  <span>Bütçe: {formatPriceShort(extendedOffer.listing.budget_max || 0)}</span>
                                </div>
                              )}

                              {/* İlan Durumu */}
                              {extendedOffer.listing?.status && (
                                <div className="flex items-center text-gray-600">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  <span>İlan: {extendedOffer.listing.status === 'active' ? 'Aktif' : 'Pasif'}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-green-600">
                                    {formatPriceShort(offer.price || 0)}
                                  </span>
                                  {(offer.shippingCost || 0) > 0 && (
                                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      + {formatPriceShort(offer.shippingCost || 0)} kargo
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Teklif Durumu Badge'i */}
                                  <Badge variant="outline" className={
                                    offer.status === 'active' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' :
                                    offer.status === 'inactive' && (offer.approval_status || offer.approvalStatus) === 'pending' ? 'border-orange-400 text-orange-600 bg-orange-50' :
                                    offer.status === 'inactive' && (offer.approval_status || offer.approvalStatus) === 'rejected' ? 'border-red-400 text-red-600 bg-red-50' :
                                    offer.status === 'inactive' ? 'border-gray-400 text-gray-600 bg-gray-50' :
                                    offer.status === 'accepted' ? 'border-green-500 text-green-700 bg-green-50' :
                                    offer.status === 'rejected' ? 'border-red-500 text-red-700 bg-red-50' :
                                    offer.status === 'withdrawn' ? 'border-gray-500 text-gray-700 bg-gray-50' : 
                                    offer.status === 'expired' ? 'border-amber-500 text-amber-700 bg-amber-50' :
                                    'border-yellow-500 text-yellow-700 bg-yellow-50'
                                  }>
                                    {offer.status === 'inactive' && (offer.approval_status || offer.approvalStatus) === 'pending' && '⏳ Onay Bekliyor'}
                                    {offer.status === 'inactive' && (offer.approval_status || offer.approvalStatus) === 'rejected' && '❌ Reddedildi'}
                                    {offer.status === 'inactive' && (offer.approval_status || offer.approvalStatus) !== 'pending' && (offer.approval_status || offer.approvalStatus) !== 'rejected' && '⚪ Pasif'}
                                    {offer.status === 'active' && '🟠 Aktif'}
                                    {offer.status === 'accepted' && '🟢 Kabul Edildi'}
                                    {offer.status === 'rejected' && '🔴 Reddedildi'}
                                    {offer.status === 'withdrawn' && '⚪ Geri Çekildi'}
                                    {offer.status === 'expired' && '⏰ Süresi Doldu'}
                                  </Badge>
                                </div>
                                
                                {/* Red Sebebi */}
                                {(offer.approval_status || offer.approvalStatus) === 'rejected' && (offer.rejection_reason || offer.rejectionReason) && (
                                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                    <strong>Red Sebebi:</strong> {offer.rejection_reason || offer.rejectionReason}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-2 sm:gap-0">
                                {offer.status === 'active' && (offer.approval_status || offer.approvalStatus) === 'approved' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto text-xs"
                                      onClick={() => handleEditOffer(offer)}
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Düzenle
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto text-xs"
                                      onClick={() => handleWithdrawOffer(offer.id)}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Geri Çek
                                    </Button>
                                  </>
                                )}
                                {offer.status === 'expired' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-amber-600 border-amber-300 hover:bg-amber-50 w-full sm:w-auto text-xs"
                                    onClick={() => handleEditOffer(offer)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Güncelle &amp; Yeniden Gönder
                                  </Button>
                                )}
                                {offer.status === 'inactive' && (offer.approval_status || offer.approvalStatus) === 'rejected' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto text-xs"
                                    onClick={() => handleEditOffer(offer)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Düzenle &amp; Yeniden Gönder
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Incoming Offers Tab */}
          <TabsContent value="incoming-offers" className="space-y-4">
            <h2 className="text-xl font-semibold">İlanlarıma Gelen Teklifler</h2>
            
            {incomingOffers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">Henüz teklif almadın</p>
                  <p className="text-sm text-muted-foreground">İlanların için teklif bekleyen yok.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {incomingOffers.filter(offer => offer && offer.id).map((offer) => {
                  // Type assertion for extended offer data from backend
                  const extendedOffer = offer as any;
                  
                  console.log('?? Incoming Offer debug:', {
                    offerId: offer.id,
                    images: offer.images,
                    productName: offer.productName || extendedOffer.product_name,
                    rawOffer: offer
                  });
                  
                  // Teklif için görsel önce kendi görseli, yoksa ilan görseli
                  let offerImage = null;
                  if (offer.images) {
                    const offerImages = parseImages(offer.images);
                    console.log('?? Parsed incoming offer images:', offerImages);
                    offerImage = offerImages.length > 0 ? offerImages[0] : null;
                  }
                  
                  // Eğer teklif görseli yoksa, ilan görselini kullan (gelen tekliflerde listing bilgisi olabilir)
                  if (!offerImage && extendedOffer.listing?.images) {
                    const listingImages = parseImages(extendedOffer.listing.images);
                    console.log('?? Parsed incoming listing images:', listingImages);
                    offerImage = listingImages.length > 0 ? listingImages[0] : null;
                  }
                  
                  const mainImage = offerImage ? getImageUrl(offerImage) : '/placeholder-image.jpg';
                  
                  console.log('??? Final incoming image processing:', {
                    offerImage,
                    mainImage,
                    finalSrc: mainImage
                  });

                  const sellerAverageRating = coerceNumber(
                    extendedOffer.seller_rating ??
                      extendedOffer.sellerRating ??
                      extendedOffer.seller_rating_avg ??
                      extendedOffer.rating_avg ??
                      extendedOffer.average_rating ??
                      extendedOffer.rating,
                    0
                  );
                  const sellerReviewCount = Math.max(
                    0,
                    Math.round(
                      coerceNumber(
                        extendedOffer.seller_rating_count ??
                          extendedOffer.sellerRatingCount ??
                          extendedOffer.rating_count ??
                          extendedOffer.reviews_count ??
                          extendedOffer.review_count ??
                          extendedOffer.seller_reviews_count,
                        0
                      )
                    )
                  );
                  
                  return (
                    <Card key={offer.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Teklif Görseli */}
                          <div className="flex-shrink-0">
                            <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border">
                              <img 
                                src={getOptimizedImageUrl(mainImage)}
                                srcSet={getResponsiveSrcSet(mainImage, [128, 256])}
                                sizes="128px"
                                alt={offer.productName || extendedOffer.product_name || 'Teklif'}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/placeholder-image.jpg';
                                }}
                              />
                            </div>
                          </div>

                          {/* Teklif Detayları */}
                          <div className="flex-1 space-y-4">
                            <div>
                              <h3 className="font-bold text-xl text-gray-900 mb-1">
                                {extendedOffer.product_name || offer.productName || 'Ürün adı'}
                              </h3>
                              <p className="text-gray-600 text-sm mb-2">
                                <strong>İlan:</strong> {extendedOffer.listing?.title || 'İlan başlığı'}
                              </p>
                              <div className="text-gray-600 text-sm mb-2 flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="font-semibold">Teklif Veren:</span>
                                <div className="flex flex-wrap items-center gap-2">
                                  {extendedOffer.seller_id ? (
                                    <Link 
                                      to={`/profile/${extendedOffer.seller_id}`}
                                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                    >
                                      {extendedOffer.seller_name || 'Bilinmiyor'}
                                    </Link>
                                  ) : (
                                    <span>{extendedOffer.seller_name || 'Bilinmiyor'}</span>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (extendedOffer.seller_id) {
                                        setSelectedSellerId(extendedOffer.seller_id);
                                        setSelectedSellerName(extendedOffer.seller_name || 'Bilinmiyor');
                                        setReviewsModalOpen(true);
                                      }
                                    }}
                                    className={extendedOffer.seller_id ? "inline-flex items-center gap-1 cursor-pointer hover:bg-blue-50 hover:border-blue-300 border border-transparent transition-all rounded-md px-2 py-1 -mx-2 -my-1" : "inline-flex items-center gap-1"}
                                    title={extendedOffer.seller_id ? "Değerlendirmeleri görüntüle" : ""}
                                    disabled={!extendedOffer.seller_id}
                                  >
                                    <StarRatingDisplay rating={sellerAverageRating} reviewCount={sellerReviewCount} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-gray-600 text-sm line-clamp-2">
                                {offer.message || extendedOffer.description || 'Teklif mesajı bulunmuyor'}
                              </p>
                            </div>

                            {/* İlan Açıklaması */}
                            {extendedOffer.listing?.description && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-1">İlan Açıklaması:</h4>
                                <p className="text-sm text-gray-600 line-clamp-3">
                                  {extendedOffer.listing.description}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center text-gray-600">
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>{getTimeAgo(extendedOffer.created_at || offer.createdAt)}</span>
                              </div>
                              
                              {(offer.condition || extendedOffer.offer_condition) && (
                                <div className="flex items-center text-gray-600">
                                  <Package className="h-4 w-4 mr-1" />
                                  <span>{getConditionText(offer.condition || extendedOffer.offer_condition)}</span>
                                </div>
                              )}

                              {/* Miktar */}
                              {extendedOffer.quantity && (
                                <div className="flex items-center text-gray-600">
                                  <Package className="h-4 w-4 mr-1" />
                                  <span>Miktar: {extendedOffer.quantity}</span>
                                </div>
                              )}

                              {/* Geçerlilik Süresi */}
                              {extendedOffer.valid_until && (
                                <div className="flex items-center text-gray-600">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>Bitiş: {new Date(extendedOffer.valid_until).toLocaleDateString('tr-TR')}</span>
                                </div>
                              )}

                              {/* İlan Lokasyonu */}
                              {extendedOffer.listing?.location && (
                                <div className="flex items-center text-gray-600">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span>{extendedOffer.listing.location}</span>
                                </div>
                              )}

                              {/* Teslimat Türü */}
                              {extendedOffer.delivery_type && (
                                <div className="flex items-center text-gray-600">
                                  <Truck className="h-4 w-4 mr-1" />
                                  <span>{getDeliveryTypeText(extendedOffer.delivery_type)}</span>
                                </div>
                              )}

                              {/* Kargo Bilgisi */}
                              {extendedOffer.shipping_cost && extendedOffer.shipping_cost > 0 && (
                                <div className="flex items-center text-gray-600">
                                  <span className="mr-1">₺</span>
                                  <span>Kargo: {formatPriceShort(extendedOffer.shipping_cost || 0)}</span>
                                </div>
                              )}

                              {/* ETA Days */}
                              {extendedOffer.eta_days && (
                                <div className="flex items-center text-gray-600">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span>Teslimat: {extendedOffer.eta_days} gün</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-green-600">
                                    {formatPriceShort(offer.price || extendedOffer.price || 0)}
                                  </span>
                                  {(offer.shippingCost || extendedOffer.shipping_cost || 0) > 0 && (
                                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      + {formatPriceShort(offer.shippingCost || extendedOffer.shipping_cost || 0)} kargo
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <Badge variant="outline" className={
                                    offer.status === 'active' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                    offer.status === 'accepted' ? 'border-green-500 text-green-700 bg-green-50' :
                                    offer.status === 'rejected' ? 'border-red-500 text-red-700 bg-red-50' :
                                    offer.status === 'withdrawn' ? 'border-gray-500 text-gray-700 bg-gray-50' : 
                                    'border-blue-500 text-blue-700 bg-blue-50'
                                  }>
                                    {offer.status === 'active' && '🔵 Yeni Teklif'}
                                    {offer.status === 'accepted' && '✅ Kabul Edildi'}
                                    {offer.status === 'rejected' && '❌ Reddedildi'}
                                    {offer.status === 'withdrawn' && '🚫 Geri çekildi'}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                {offer.status === 'active' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                      onClick={() => handleOfferAction(offer.id, 'accept')}
                                    >
                                      Kabul Et
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleOfferAction(offer.id, 'reject')}
                                    >
                                      Reddet
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Aldıklarım</h2>
            </div>
            
            {/* Orders */}
            <div className="space-y-4">
              {orders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">Henüz siparişin yok</p>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Teklifleri kabul ettiğinde ve satın alma işlemini tamamladığında siparişlerin burada görünecek.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                orders.map((order: any) => {
                  const orderStatusRaw = order.status || order.orderStatus || order.current_status || order?.status?.status;
                  const orderKey = order?.id ?? order?.orderNumber ?? order?.order_id;
                  const orderStatusData = orderKey !== undefined && orderKey !== null
                    ? orderStatuses[String(orderKey)]
                    : undefined;
                  const liveStatusRaw = orderStatusData?.status ?? orderStatusRaw;
                  const normalizedOrderStatus = normalizeStatus(liveStatusRaw) || 'pending';
                  const formatDate = (dateString: string) => {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });
                  };

                  const formatTime = (dateString: string) => {
                    const date = new Date(dateString);
                    return date.toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  };

                  const getStatusText = (status: unknown) => {
                    const normalizedStatus = normalizeStatus(status) || 'pending';
                    const statusMap: { [key: string]: string } = {
                      'pending': 'Beklemede',
                      'confirmed': 'Onaylandı',
                      'preparing': 'Hazırlanıyor',
                      'shipped': 'Kargoda',
                      'delivered': 'Teslim Edildi',
                      'completed': 'Tamamlandı',
                      'cancelled': 'İptal Edildi'
                    };
                    return statusMap[normalizedStatus] || (normalizedStatus.length > 0 ? normalizedStatus : 'Bilinmiyor');
                  };

                  const rawTrackingStatus = typeof orderStatusData?.trackingStatus === 'string'
                    ? orderStatusData.trackingStatus.trim()
                    : '';
                  const trackingDescription = typeof orderStatusData?.trackingDescription === 'string'
                    ? orderStatusData.trackingDescription.trim()
                    : '';
                  const displayStatusText = rawTrackingStatus.length > 0
                    ? rawTrackingStatus
                    : getStatusText(liveStatusRaw);
                  // Status bilgisini farklı kaynaklardan al
                  let actualOrderStatus = order.status;
                  
                  // Eğer order.status boşsa, alternatif kaynakları kontrol et
                  if (!actualOrderStatus) {
                    // StatusHistory'den dene
                    if (order.statusHistory && order.statusHistory.length > 0) {
                      const lastStatusHistory = order.statusHistory[order.statusHistory.length - 1];
                      actualOrderStatus = lastStatusHistory.new_status;
                    }
                    // Completed/delivered tarihlerine bak
                    else if (order.completedAt || order.deliveredAt) {
                      actualOrderStatus = 'completed';
                    }
                    // Shipped tarihine bak
                    else if (order.shippedAt) {
                      actualOrderStatus = 'shipped';
                    }
                    // Processing tarihine bak
                    else if (order.startedProcessingAt) {
                      actualOrderStatus = 'preparing';
                    }
                  }
                  
                  const normalizedActualStatus = normalizeStatus(actualOrderStatus);
                  const backendRequiresReview = Boolean(order.requiresReview);
                  
                  console.log('🔍 Order button check:', {
                    orderNumber: order.orderNumber,
                    rawStatus: order.status,
                    actualOrderStatus,
                    normalizedActualStatus,
                    normalizedOrderStatus,
                    displayStatusText,
                    completedAt: order.completedAt || order.completed_at,
                    deliveredAt: order.deliveredAt || order.delivered_at,
                    shouldShowCancel: normalizedActualStatus === 'confirmed' || normalizedActualStatus === 'preparing',
                    shouldShowReturn: normalizedActualStatus === 'shipped' || normalizedActualStatus === 'delivered' || normalizedActualStatus === 'completed'
                  });
                  
                  // Liste için requiresReview herzaman false - kontrol sadece buton tıklanınca
                  const requiresReview = false;
                  const sellerDisplayName = order.primarySellerName || (Array.isArray(order.sellerNames) && order.sellerNames.length > 0 ? order.sellerNames[0] : undefined);
                  const orderIdentifier = String(order.orderNumber || order.id);
                  
                  // İlk ürünün listing title'ını al
                  const firstItemTitle = order.items?.[0]?.listing_title || order.items?.[0]?.title || `Sipariş #${order.orderNumber}`;

                  return (
                    <div key={orderIdentifier} className="relative">
                      <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            {/* Üst Bilgiler */}
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Package className="h-5 w-5 text-green-600" />
                                  <h3 className="font-bold text-lg">{firstItemTitle}</h3>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formatDate(order.createdAt)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{formatTime(order.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-green-600">
                                  {formatPriceShort(order.total || 0)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {order.totalQuantity || order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || order.itemCount} ürün
                                </div>
                              </div>
                            </div>

                            {/* Sipariş Detayları Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-1">Durum</div>
                                <div className="flex flex-col gap-1">
                                  <OrderStatusBadge status={normalizedOrderStatus || order.status || 'pending'} />
                                  {/* Durum açıklaması */}
                                  {(() => {
                                    const currentStatus = normalizedOrderStatus || order.status || 'pending';
                                    const statusMessages = {
                                      'pending': 'Siparişiniz onay bekliyor',
                                      'confirmed': 'Siparişiniz onaylandı, hazırlanıyor',
                                      'preparing': 'Siparişiniz hazırlanıyor',
                                      'shipped': 'Siparişiniz kargoya verildi',
                                      'delivered': 'Siparişiniz teslim edildi',
                                      'cancelled': 'Siparişiniz iptal edildi'
                                    };
                                    return (
                                      <div className="text-xs text-gray-500">
                                        {statusMessages[currentStatus] || 'Sipariş durumu güncelleniyor'}
                                      </div>
                                    );
                                  })()}
                                  {/* Ek kargo takip bilgisi varsa göster */}
                                  {trackingDescription.length > 0 && 
                                   !trackingDescription.includes('başarıyla') && 
                                   !trackingDescription.includes('işleme konuldu') && 
                                   !trackingDescription.includes('alındı') && (
                                    <div className="text-xs text-gray-400 italic">{trackingDescription}</div>
                                  )}
                                </div>
                              </div>

                              {order.trackingNumber && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <div className="text-sm font-medium text-gray-700 mb-1">Kargo Takip</div>
                                  <div className="flex items-center gap-1">
                                    <Truck className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-mono">{order.trackingNumber}</span>
                                  </div>
                                </div>
                              )}

                              {(order.sellerName || sellerDisplayName) && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <div className="text-sm font-medium text-gray-700 mb-1">Satıcı</div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-4 w-4 text-gray-600" />
                                    <Link 
                                      to={`/profile/${order.primarySellerId || order.sellerId || ''}`}
                                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {maskDisplayName(order.sellerName || sellerDisplayName)}
                                    </Link>
                                  </div>
                                </div>
                              )}

                              {order.shippingCost > 0 && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <div className="text-sm font-medium text-gray-700 mb-1">Kargo Ücreti</div>
                                  <div className="text-sm">{formatPriceShort(order.shippingCost || 0)}</div>
                                </div>
                              )}

                              {order.estimatedDelivery && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <div className="text-sm font-medium text-gray-700 mb-1">Tahmini Teslimat</div>
                                  <div className="text-sm">{formatDate(order.estimatedDelivery)}</div>
                                </div>
                              )}
                            </div>

                            {/* Ürün Görselleri */}
                            <div className="flex items-center gap-3">
                              <div className="flex -space-x-2">
                                {order.items && order.items.length > 0 ? (
                                  <>
                                    {order.items.slice(0, 4).map((item: any, index: number) => (
                                      <div key={index} className="w-12 h-12 rounded-lg border-2 border-white shadow-sm overflow-hidden">
                                        <img
                                          src={item.image || '/image-placeholder.png'}
                                          alt={item.title || 'Ürün'}
                                          className="w-full h-full object-cover"
                                          onError={(event) => {
                                            const target = event.target as HTMLImageElement;
                                            target.src = '/image-placeholder.png';
                                          }}
                                        />
                                      </div>
                                    ))}
                                    {order.items.length > 4 && (
                                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg border-2 border-white shadow-sm flex items-center justify-center">
                                        <span className="text-xs font-bold text-white">+{order.items.length - 4}</span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  Array.from({ length: Math.min(order.itemCount, 4) }).map((_, index) => (
                                    <div key={index} className="w-12 h-12 bg-gray-200 rounded-lg border-2 border-white shadow-sm flex items-center justify-center">
                                      <ImageIcon className="h-6 w-6 text-gray-400" />
                                    </div>
                                  ))
                                )}
                                {!order.items && order.itemCount > 4 && (
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg border-2 border-white shadow-sm flex items-center justify-center">
                                    <span className="text-xs font-bold text-white">+{order.itemCount - 4}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                Toplam {order.totalQuantity || order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || order.items?.length || order.itemCount} ürün
                              </div>
                            </div>

                            {/* Alt Butonlar */}
                            <div className="flex items-center justify-between pt-4 border-t">
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-600">Sipariş durumu:</span>
                                <OrderStatusBadge status={normalizedOrderStatus || order.status || 'pending'} />
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Teslim Aldım butonu - sadece 'shipped' durumunda göster */}
                                {normalizedActualStatus === 'shipped' && (
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleMarkAsDelivered(order.id);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Teslim Aldım
                                  </Button>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewOrderDetails(order)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Detayları Görüntüle
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Satışlarım</h2>
            </div>
            
            {sales.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">Henüz satılan ilan yok</p>
                  <p className="text-sm text-muted-foreground mb-4">Satılan ürünlerin burada görünecek</p>
                  <Button onClick={() => navigate('/create-listing')}>
                    Yeni İlan Oluştur
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sales.map((sale: any) => {
                  const saleStatusRaw = sale.status || sale.orderStatus || sale.current_status || sale?.status?.status;
                  const normalizedSaleStatus = normalizeStatus(saleStatusRaw) || 'pending';
                  const formatDate = (dateString: string) => {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });
                  };

                  const formatTime = (dateString: string) => {
                    const date = new Date(dateString);
                    return date.toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  };

                  const getStatusText = (status: unknown) => {
                    const normalizedStatus = normalizeStatus(status) || 'pending';
                    const statusMap: { [key: string]: string } = {
                      'pending': 'Beklemede',
                      'confirmed': 'Onaylandı',
                      'preparing': 'Hazırlanıyor',
                      'shipped': 'Kargoda',
                      'delivered': 'Teslim Edildi',
                      'completed': 'Tamamlandı',
                      'cancelled': 'İptal Edildi'
                    };
                    return statusMap[normalizedStatus] || (normalizedStatus.length > 0 ? normalizedStatus : 'Bilinmiyor');
                  };
                  
                  // İlk ürünün listing title'ını al
                  const firstSaleItemTitle = sale.items?.[0]?.listing_title || sale.items?.[0]?.title || `Satış #${sale.orderNumber}`;

                  return (
                    <Card key={sale.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Üst Bilgiler */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="h-5 w-5 text-blue-600" />
                                <h3 className="font-bold text-lg">{firstSaleItemTitle}</h3>
                                <OrderStatusBadge status={normalizedSaleStatus} />
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(sale.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{formatTime(sale.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                {formatPriceShort(sale.total || 0)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {sale.totalQuantity || sale.itemCount} ürün
                              </div>
                            </div>
                          </div>

                          {/* Satış Detayları Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="text-sm font-medium text-gray-700 mb-1">Durum</div>
                              <div className="text-sm">{getStatusText(saleStatusRaw)}</div>
                            </div>

                            {sale.paymentStatus && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-1">Ödeme Durumu</div>
                                <div className="flex items-center gap-1">
                                  {sale.paymentStatus === 'paid' ? (
                                    <>
                                      <CreditCard className="h-4 w-4 text-green-600" />
                                      <span className="text-sm text-green-600">Ödeme Alındı</span>
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard className="h-4 w-4 text-orange-600" />
                                      <span className="text-sm text-orange-600">Beklemede</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            {sale.trackingNumber && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-1">Kargo Takip</div>
                                <div className="flex items-center gap-1">
                                  <Truck className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-mono">{sale.trackingNumber}</span>
                                </div>
                              </div>
                            )}

                            {sale.buyerAddress && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-1">Teslimat Adresi</div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4 text-gray-600" />
                                  <span className="text-sm line-clamp-1">{sale.buyerAddress}</span>
                                </div>
                              </div>
                            )}

                            {sale.shippingCost > 0 && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-1">Kargo Ücreti</div>
                                <div className="text-sm">{formatPriceShort(sale.shippingCost || 0)}</div>
                              </div>
                            )}

                            {sale.estimatedDelivery && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-1">Tahmini Teslimat</div>
                                <div className="text-sm">{formatDate(sale.estimatedDelivery)}</div>
                              </div>
                            )}
                          </div>

                          {/* Ürün Görselleri */}
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                              {sale.items && sale.items.length > 0 ? (
                                <>
                                  {sale.items.slice(0, 4).map((item: any, index: number) => (
                                    <div key={index} className="w-12 h-12 rounded-lg border-2 border-white shadow-sm overflow-hidden">
                                      <img 
                                        src={item.image || '/image-placeholder.png'} 
                                        alt={item.title || 'Ürün'} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = '/image-placeholder.png';
                                        }}
                                      />
                                    </div>
                                  ))}
                                  {sale.items.length > 4 && (
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg border-2 border-white shadow-sm flex items-center justify-center">
                                      <span className="text-xs font-bold text-white">+{sale.items.length - 4}</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                Array.from({ length: Math.min(sale.totalQuantity || sale.itemCount, 4) }).map((_, index) => (
                                  <div key={index} className="w-12 h-12 bg-gray-200 rounded-lg border-2 border-white shadow-sm flex items-center justify-center">
                                    <ImageIcon className="h-6 w-6 text-gray-400" />
                                  </div>
                                ))
                              )}
                              {!sale.items && (sale.totalQuantity || sale.itemCount) > 4 && (
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg border-2 border-white shadow-sm flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">+{(sale.totalQuantity || sale.itemCount) - 4}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              Toplam {sale.totalQuantity || sale.itemCount} ürün
                            </div>
                          </div>

                          {/* Alt Butonlar */}
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <MapPin className="h-4 w-4" />
                              <span>Satış durumu: {getStatusText(saleStatusRaw)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* İşlemi Başlat butonu - sadece 'confirmed' durumunda göster */}
                              {sale.status === 'confirmed' && (
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartProcessing(sale.id);
                                  }}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  İşlemi Başlat
                                </Button>
                              )}
                              
                              {/* Kargo Bilgileri butonu - sadece 'preparing' durumunda göster */}
                              {sale.status === 'preparing' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSale(sale);
                                    setShowShippingModal(true);
                                  }}
                                >
                                  <Truck className="h-4 w-4 mr-1" />
                                  Kargo Bilgileri
                                </Button>
                              )}
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => navigate(`/order/${sale.orderNumber}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Detayları Görüntüle
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-4">
            <h2 className="text-xl font-semibold">Favorilerim</h2>
            
            {favoriteListings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">Henüz favori ürünün yok</p>
                  <p className="text-sm text-muted-foreground mb-4">Beğendiğin ürünleri favorilere ekle!</p>
                  <Button onClick={() => navigate('/')}>
                    Ürünleri Keşfet
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {(favoriteListings || []).filter(listing => listing && listing.id).map((listing) => {
                  const images = parseImages(listing.images);
                  const mainImage = images.length > 0 ? getImageUrl(images[0]) : '/placeholder-image.jpg';
                  
                  return (
                    <Card key={listing.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-500">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Favori İlan Görseli */}
                          <div className="flex-shrink-0">
                            <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border">
                              {images.length > 0 ? (
                                <img 
                                  src={mainImage}
                                  alt={listing.title}
                                  className="w-full h-full object-cover"
                                  onLoad={() => console.log('? Favorite image loaded:', mainImage)}
                                  onError={(e) => {
                                    console.log('? Favorite image failed to load:', mainImage);
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-image.jpg';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Favori İlan Detayları */}
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-bold text-xl text-gray-900 mb-1">
                                {listing.title || 'İlan başlığı'}
                              </h3>
                              <p className="text-gray-600 text-sm line-clamp-2">
                                {listing.description || 'Açıklama bulunmuyor'}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <div className="flex items-center text-gray-600">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span>{listing.city || listing.location || 'Şehir belirtilmedi'}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>{getTimeAgo(listing.createdAt)}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Heart className="h-4 w-4 mr-1" />
                                <span>Favorilerde</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-green-600">
                                    {formatPriceShort(listing.budgetMax || listing.price || 0)}
                                  </span>
                                  {listing.budgetMin && listing.budgetMin !== listing.budgetMax && (
                                    <span className="text-sm text-gray-500">
                                      - {formatPriceShort(listing.budgetMin || 0)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
                                    <Heart className="h-3 w-3 mr-1" />
                                    Favori
                                  </Badge>
                                  {listing.status && (
                                    <span className="text-xs text-gray-600 capitalize">
                                      {listing.status === 'active' ? 'Aktif' : listing.status}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <FavoriteButton
                                  listingId={(listing as any).listing_id?.toString() || listing.id.toString()}
                                  userId={user.id}
                                  size="sm"
                                  initialState={true}
                                  onFavoriteChange={(listingId, isFavorite) => {
                                    console.log('?? Favorite changed in dashboard:', { listingId, isFavorite });
                                    handleFavoriteChange(listingId, isFavorite);
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Use listing_id if available (from favorites API), otherwise fall back to id
                                    const targetId = (listing as any).listing_id || listing.id;
                                    console.log('?? Navigating to listing:', { 
                                      originalListing: listing, 
                                      targetId,
                                      listing_id: (listing as any).listing_id,
                                      id: listing.id 
                                    });
                                    navigate(`/listing/${targetId}`);
                                  }}
                                >
                                  Görüntüle
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Status Update Modal */}
      {pendingReviewOrder && (
        <ReviewModal
          isOpen
          orderId={pendingReviewOrder.orderId}
          sellerName={pendingReviewOrder.sellerName ?? undefined}
          onClose={() => setPendingReviewOrder(null)}
          onSubmitted={handleReviewSubmitted}
        />
      )}

      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sipariş Durumu Güncelle</DialogTitle>
            <DialogDescription>
              Sipariş #{selectedSale?.id} için durum güncellemesi yapın
            </DialogDescription>
          </DialogHeader>
          
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="status" className="text-right">
                Durum
              </label>
              <Select value={statusForm.status} onValueChange={(value) => setStatusForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preparing">Hazırlanıyor</SelectItem>
                  <SelectItem value="shipped">Kargoya Verildi</SelectItem>
                  <SelectItem value="delivered">Teslim Edildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="tracking" className="text-right">
                Kargo No
              </label>
              <Input
                id="tracking"
                placeholder="Takip numarası"
                className="col-span-3"
                value={statusForm.trackingNumber}
                onChange={(e) => setStatusForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="carrier" className="text-right">
                Kargo Şirketi
              </label>
              <Input
                id="carrier"
                placeholder="Kargo Şirketi"
                className="col-span-3"
                value={statusForm.carrier}
                onChange={(e) => setStatusForm(prev => ({ ...prev, carrier: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowStatusModal(false)}>
                İptal
              </Button>
              <Button onClick={() => {
                handleStatusUpdate(
                  selectedSale?.id || '', 
                  {
                    status: statusForm.status,
                    trackingNumber: statusForm.trackingNumber,
                    carrier: statusForm.carrier
                  }
                );
              }}>
                Güncelle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shipping Form Modal */}
      {selectedSale && (
        <ShippingFormModal
          isOpen={showShippingModal}
          onClose={() => {
            setShowShippingModal(false);
            setSelectedSale(null);
          }}
          orderId={selectedSale.id}
          etaDays={selectedSale.etaDays}
          onSuccess={handleShippingAdded}
        />
      )}

      {/* Create Listing Modal */}
      <CreateListingModal
        open={isCreateListingModalOpen}
        onOpenChange={setIsCreateListingModalOpen}
        onSuccess={() => {
          setIsCreateListingModalOpen(false);
          loadDashboardData(); // Refresh listings after creation
        }}
      />

      {/* Edit Offer Modal */}
      {selectedOfferToEdit && (
        <EditOfferModal
          isOpen={isEditOfferModalOpen}
          onClose={() => {
            setIsEditOfferModalOpen(false);
            setSelectedOfferToEdit(null);
          }}
          offer={selectedOfferToEdit}
          onOfferUpdated={handleOfferUpdated}
        />
      )}

      {/* Return Request Dialog */}
      <Dialog open={returnDialog.open} onOpenChange={(open) => {
        if (!open) {
          setReturnDialog({ open: false, order: null, reason: '' });
          setReturnImages([]);
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              İade Talebi
            </DialogTitle>
            <DialogDescription>
              {returnDialog.order && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm"><strong>Sipariş No:</strong> {returnDialog.order.orderNumber}</p>
                  <p className="text-sm"><strong>Ürün:</strong> {returnDialog.order.listing?.title || 'Ürün bilgisi yok'}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="return-reason-select">İade Sebebi *</Label>
              <Select
                onValueChange={(val) => {
                  // Eğer 'Diğer' seçildiyse boş bırak, aksi halde metin olarak doldur
                  setReturnDialog({ ...returnDialog, reason: val === 'Diğer' ? '' : val });
                }}
                defaultValue={returnDialog.reason || ''}
              >
                <SelectTrigger id="return-reason-select" className="w-full mt-2">
                  <SelectValue placeholder="Lütfen bir neden seçin veya aşağıya detay girin" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                id="return-reason"
                placeholder="İster seçiminizi detaylandırın, ister 'Diğer' seçeneği için sebebi yazın..."
                className="min-h-[100px] mt-2"
                value={returnDialog.reason}
                onChange={(e) => setReturnDialog({ ...returnDialog, reason: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                İade talebiniz satıcıya iletilecektir. Satıcı ile iletişime geçerek iade sürecini tamamlayabilirsiniz.
              </p>
            </div>

            {/* Görsel Yükleme - Bazı nedenler için zorunlu */}
            {returnDialog.reason && RETURN_REASONS_REQUIRING_IMAGES.includes(returnDialog.reason) && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <ImageIcon className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Fotoğraf/Video Gerekli</p>
                    <p className="text-xs text-orange-700 mt-1">
                      Bu iade sebebi için ürünün mevcut durumunu gösteren en az 1 fotoğraf veya video yüklemeniz gerekmektedir.
                    </p>
                  </div>
                </div>
                
                <Label htmlFor="return-images" className="block mb-2 text-sm">
                  Fotoğraf/Video * (En fazla 5 adet, video max 20MB)
                </Label>
                <Input
                  id="return-images"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 5) {
                      toast.error('En fazla 5 dosya yükleyebilirsiniz');
                      return;
                    }
                    
                    // Video boyut kontrolü
                    const oversizedVideo = files.find(f => 
                      f.type.startsWith('video/') && f.size > 20 * 1024 * 1024
                    );
                    if (oversizedVideo) {
                      toast.error('Video boyutu en fazla 20MB olabilir');
                      return;
                    }
                    
                    setReturnImages(files);
                  }}
                  className="cursor-pointer"
                />
                
                {returnImages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {returnImages.map((file, idx) => (
                      <div key={idx} className="relative">
                        {file.type.startsWith('image/') ? (
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={`Preview ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center">
                            <div className="text-center">
                              <Play className="h-6 w-6 mx-auto text-gray-600" />
                              <span className="text-xs text-gray-500">Video</span>
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setReturnImages(returnImages.filter((_, i) => i !== idx))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setReturnDialog({ open: false, order: null, reason: '' })}
              >
                İptal
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleSubmitReturn}
                disabled={!returnDialog.reason.trim()}
              >
                İade Talebini Gönder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => !open && setCancelDialog({ open: false, order: null, reason: '' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-600" />
              Sipariş İptal
            </DialogTitle>
            <DialogDescription>
              {cancelDialog.order && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm"><strong>Sipariş No:</strong> {cancelDialog.order.orderNumber}</p>
                  <p className="text-sm"><strong>Ürün:</strong> {cancelDialog.order.listing?.title || 'Ürün bilgisi yok'}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="cancel-reason-select">İptal Sebebi *</Label>
              <Select
                onValueChange={(val) => setCancelDialog({ ...cancelDialog, reason: val === 'Diğer' ? '' : val })}
                defaultValue={cancelDialog.reason || ''}
              >
                <SelectTrigger id="cancel-reason-select" className="w-full mt-2">
                  <SelectValue placeholder="Lütfen bir neden seçin veya aşağıya detay girin" />
                </SelectTrigger>
                <SelectContent>
                  {CANCEL_REASONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                id="cancel-reason"
                placeholder="İptal sebebinizi detaylandırın veya 'Diğer' için yazın..."
                className="min-h-[100px] mt-2"
                value={cancelDialog.reason}
                onChange={(e) => setCancelDialog({ ...cancelDialog, reason: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                İptal talebiniz satıcıya bildirilecektir. Sipariş henüz kargoya verilmediği için iptal edilebilir.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setCancelDialog({ open: false, order: null, reason: '' })}
              >
                Vazgeç
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleSubmitCancel}
                disabled={!cancelDialog.reason.trim()}
              >
                Siparişi İptal Et
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Seller Reviews Modal */}
      {selectedSellerId && (
        <SellerReviewsModal
          isOpen={reviewsModalOpen}
          onClose={() => {
            setReviewsModalOpen(false);
            setSelectedSellerId(null);
            setSelectedSellerName('');
          }}
          sellerId={selectedSellerId}
          sellerName={selectedSellerName}
        />
      )}
    </div>
    </>
  );
}
