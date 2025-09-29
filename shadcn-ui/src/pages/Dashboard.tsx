import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  MessageCircle, 
  Heart, 
  Package, 
  TrendingUp, 
  Clock,
  MapPin,
  Star,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataManager, Listing, Offer, ThirdPartyOrder } from '@/lib/mockData';
import { maskDisplayName } from '@/lib/utils';
import Header from '@/components/Header';
import FavoriteButton from '@/components/FavoriteButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// removed Input and Textarea imports as manual inputs are no longer used
import Stepper from '@/components/ui/stepper';

export default function Dashboard() {
  const navigate = useNavigate();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<Offer[]>([]); // Aldığım teklifler (ilanlarıma gelen)
  // Üçüncü taraf siparişler (tekliften satın aldıklarım ve sattıklarım)
  const [myPurchases, setMyPurchases] = useState<ThirdPartyOrder[]>([]);
  const [myTpSales, setMyTpSales] = useState<ThirdPartyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDialogOffer, setOrderDialogOffer] = useState<Offer | null>(null);
  // Satıcı (verdiğim teklifler) için sipariş işlemleri diyaloğu
  const [sellerDialogOpen, setSellerDialogOpen] = useState(false);
  const [sellerDialogOffer, setSellerDialogOffer] = useState<Offer | null>(null);
  const [trackingNo, setTrackingNo] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');
  // TP sipariş diyalogları
  const [tpBuyerDialogOpen, setTpBuyerDialogOpen] = useState(false);
  const [tpBuyerOrder, setTpBuyerOrder] = useState<ThirdPartyOrder | null>(null);
  const [tpSellerDialogOpen, setTpSellerDialogOpen] = useState(false);
  const [tpSellerOrder, setTpSellerOrder] = useState<ThirdPartyOrder | null>(null);

  const currentUser = DataManager.getCurrentUser();
  const userId = currentUser?.id;

  // Load data only once when component mounts
  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    const loadDashboardData = () => {
      try {
        // Get user's listings
        const allListings = DataManager.getListings();
        const userListings = allListings.filter(listing => 
          listing && listing.buyerId === userId
        );
        
        // Get all offers
        const allOffers = DataManager.getAllOffers();
        // Outgoing: user gave these offers as satıcı
        const userOffers = allOffers.filter(offer => 
          offer && offer.sellerId === userId
        );
        // Incoming: offers given by others on user's listings
        const offersOnMyListings = allOffers.filter(offer => 
          offer && offer.sellerId !== userId && userListings.some(l => l.id === offer.listingId)
        );
        
    // Third-party orders
    const tpPurchases = DataManager.getThirdPartyOrdersForBuyer(userId);
    const tpSales = DataManager.getThirdPartyOrdersForSeller(userId);

    // Get favorite listings
        const favoriteIds = DataManager.getFavorites(userId);
        const favorites = allListings.filter(listing => 
          listing && favoriteIds.includes(listing.id)
        );

  setMyListings(userListings);
  setMyOffers(userOffers);
  setIncomingOffers(offersOnMyListings);
  setMyPurchases(tpPurchases);
  setMyTpSales(tpSales);
        setFavoriteListings(favorites);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setMyListings([]);
        setMyOffers([]);
        setFavoriteListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [userId, navigate]);

  // Memoize statistics to prevent recalculation
  const stats = useMemo(() => {
    if (!userId) return { totalListings: 0, totalOffers: 0, totalFavorites: 0, unreadMessages: 0 };
    
    return {
      totalListings: myListings.length,
      totalOffers: myOffers.length,
      totalFavorites: favoriteListings.length,
      unreadMessages: DataManager.getUnreadMessageCount(userId)
    };
  }, [userId, myListings.length, myOffers.length, favoriteListings.length]);

  const handleOfferAction = (offerId: string, action: 'accept' | 'reject') => {
    if (!userId) return;

    try {
      if (action === 'accept') {
        // Kabul işlemini ödeme sonrası yapacağız
        navigate(`/checkout?offerId=${offerId}`);
      } else {
        DataManager.rejectOffer(offerId);
      }
      
      // Refresh offers
      const allOffers = DataManager.getAllOffers();
      const userOffers = allOffers.filter(offer => 
        offer && offer.sellerId === userId
      );
      setMyOffers(userOffers);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  // Satıcı tarafı: aşama geçişleri ve otomatik mesaj gönderimi
  const refreshSellerOffer = (offerId: string) => {
    const fresh = DataManager.getAllOffers().find(o => o.id === offerId);
    if (fresh) setSellerDialogOffer(fresh);
    // Ayrıca listeleri tazeleyelim
    if (userId) {
      const allOffers = DataManager.getAllOffers();
      const userOffers = allOffers.filter(o => o && o.sellerId === userId);
      setMyOffers(userOffers);
    }
  };

  const sendAutoMessageToOwner = (offer: Offer, text: string) => {
    const listing = DataManager.getListing(offer.listingId);
    if (!listing || !currentUser) return;
    try {
      DataManager.addMessage({
        listingId: offer.listingId,
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        toUserId: listing.buyerId,
        message: text,
      });
    } catch (e) {
      console.error('Otomatik mesaj gönderilemedi', e);
    }
  };

  // Alıcıdan satıcıya otomatik mesaj (örn. Teslim aldım)
  const sendAutoMessageToSeller = (offer: Offer, text: string) => {
    if (!currentUser) return;
    try {
      DataManager.addMessage({
        listingId: offer.listingId,
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        toUserId: offer.sellerId,
        message: text,
      });
    } catch (e) {
      console.error('Otomatik mesaj gönderilemedi (satıcıya)', e);
    }
  };

  const carriers = [
    { id: 'surat', name: 'Sürat Kargo', extraFee: 19.9 },
    { id: 'aras', name: 'Aras Kargo', extraFee: 24.9 },
    { id: 'ptt', name: 'PTT Kargo', extraFee: 0 },
  ];

  const handleSelectCarrier = (offer: Offer) => {
    const c = carriers.find(c => c.id === selectedCarrier);
    if (!c) return;
    const ok = DataManager.setOfferCarrier(offer.id, c);
    if (ok) {
      const tn = DataManager.getAllOffers().find(o => o.id === offer.id)?.trackingNo;
      setTrackingNo(tn || '');
      refreshSellerOffer(offer.id);
    }
  };

  const handleMarkShipped = (offer: Offer) => {
    const tn = trackingNo.trim();
    if (!tn) return;
    const ok = DataManager.setOfferShipped(offer.id, tn);
    if (ok) {
      const msg = `Siparişiniz kargoya verildi. Takip No: ${tn}`;
      sendAutoMessageToOwner(offer, msg);
      setTrackingNo('');
      refreshSellerOffer(offer.id);
    }
  };

  const handleMarkCompleted = (offer: Offer) => {
    const ok = DataManager.setOfferCompleted(offer.id);
    if (ok) {
      sendAutoMessageToOwner(offer, 'İşlem tamamlandı. Ödeme satıcıya aktarıldı. Teşekkürler.');
      refreshSellerOffer(offer.id);
    }
  };

  // TP seller handlers
  const refreshTpSellerOrder = (orderId: string) => {
    const fresh = DataManager.getAllThirdPartyOrders().find(o => o.id === orderId);
    if (fresh) setTpSellerOrder(fresh);
    if (userId) setMyTpSales(DataManager.getThirdPartyOrdersForSeller(userId));
  };

  const sendMessageSellerToTpBuyer = (order: ThirdPartyOrder, text: string) => {
    const buyerId = order.buyerId;
    if (!currentUser) return;
    try {
      DataManager.addMessage({
        listingId: order.listingId,
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        toUserId: buyerId,
        message: text,
      });
    } catch (e) {
      // messaging failed; ignore
    }
  };

  const handleSelectCarrierTP = (order: ThirdPartyOrder) => {
    const c = carriers.find(c => c.id === selectedCarrier);
    if (!c) return;
    const ok = DataManager.setTPOrderCarrier(order.id, c);
    if (ok) {
      const tn = DataManager.getAllThirdPartyOrders().find(o => o.id === order.id)?.trackingNo;
      setTrackingNo(tn || '');
      refreshTpSellerOrder(order.id);
    }
  };

  const handleMarkShippedTP = (order: ThirdPartyOrder) => {
    const tn = trackingNo.trim();
    if (!tn) return;
    const ok = DataManager.setTPOrderShipped(order.id, tn);
    if (ok) {
      sendMessageSellerToTpBuyer(order, `Siparişiniz kargoya verildi. Takip No: ${tn}`);
      setTrackingNo('');
      refreshTpSellerOrder(order.id);
    }
  };

  const handleMarkCompletedTP = (order: ThirdPartyOrder) => {
    const ok = DataManager.setTPOrderCompleted(order.id);
    if (ok) {
      sendMessageSellerToTpBuyer(order, 'İşlem tamamlandı. Ödeme satıcıya aktarıldı. Teşekkürler.');
      refreshTpSellerOrder(order.id);
    }
  };

  const handleWithdrawOffer = (offerId: string) => {
    if (!userId) return;
    try {
      DataManager.withdrawOffer(offerId, userId);
      const allOffers = DataManager.getAllOffers();
      const userOffers = allOffers.filter(o => o && o.sellerId === userId);
      const offersOnMyListings = allOffers.filter(o => o && o.sellerId !== userId && myListings.some(l => l.id === o.listingId));
      setMyOffers(userOffers);
      setIncomingOffers(offersOnMyListings);
    } catch (e) {
      console.error('withdraw error', e);
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'new': return 'Sıfır';
      case 'used': return '2. El';
      case 'any': return 'Farketmez';
      default: return condition;
    }
  };

  if (!userId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {/* Kabul edilen teklif için sipariş durumu diyaloğu */}
      <Dialog open={orderDialogOpen} onOpenChange={(v) => { if (!v) { setOrderDialogOpen(false); setOrderDialogOffer(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sipariş Durumu</DialogTitle>
          </DialogHeader>
          {orderDialogOffer && (() => {
            const listing = DataManager.getListing(orderDialogOffer.listingId);
            const acceptedAt = orderDialogOffer.acceptedAt ? DataManager.formatDate(orderDialogOffer.acceptedAt) : '-';
            // 5 aşamalı dinamik akış (alıcı görünümü)
            const steps = [
              { id: 1, title: 'Sipariş Alındı', description: `Tarih: ${acceptedAt}` },
              { id: 2, title: 'Kargo Firması Seçildi', description: orderDialogOffer.shippingCarrierName ? `${orderDialogOffer.shippingCarrierName}${orderDialogOffer.shippingExtraFee && orderDialogOffer.shippingExtraFee > 0 ? ` • Ek ücret: ${DataManager.formatPrice(orderDialogOffer.shippingExtraFee)}` : ''}` : 'Satıcı firma seçecek.' },
              { id: 3, title: 'Kargolandı', description: orderDialogOffer.trackingNo ? `Takip No: ${orderDialogOffer.trackingNo}` : (orderDialogOffer.deliveryType === 'pickup' ? 'Elden teslim için planlanıyor.' : 'Kargoya verilecek.') },
              { id: 4, title: 'Teslim Edildi', description: 'Paket teslim edildi.' },
              { id: 5, title: 'Tamamlandı & Ödeme Aktarıldı', description: orderDialogOffer.completedAt ? `Tarih: ${DataManager.formatDate(orderDialogOffer.completedAt)}` : 'Ödeme aktarımı bekleniyor.' }
            ];
            const stageMap: Record<string, number> = { accepted: 1, received: 1, carrierSelected: 2, shipped: 3, delivered: 4, completed: 5 } as const;
            const current = orderDialogOffer.orderStage ? (stageMap[orderDialogOffer.orderStage] || 1) : 1;
            const hasTracking = !!orderDialogOffer.trackingNo;
            const isShipped = orderDialogOffer.orderStage === 'shipped';
            const isDelivered = orderDialogOffer.orderStage === 'delivered';
            const showConfirmSection = (current === 3 || current === 4) && (hasTracking || isShipped || isDelivered);
            const canConfirmDelivery = isShipped;
            const handleBuyerConfirmDelivered = () => {
              if (!orderDialogOffer) return;
              // Önce teslim edildi, ardından otomatik tamamla ve ödemeyi aktarılmış say
              DataManager.setOfferDelivered(orderDialogOffer.id);
              DataManager.setOfferCompleted(orderDialogOffer.id);
              // Alıcı, satıcıya otomatik bilgi versin
              sendAutoMessageToSeller(orderDialogOffer, 'Siparişi teslim aldım. Teşekkürler.');
              const updated = DataManager.getAllOffers().find(o => o.id === orderDialogOffer.id);
              if (updated) setOrderDialogOffer(updated);
            };
            return (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="font-semibold">{listing?.title || 'İlan'}</div>
                  <div className="text-sm text-muted-foreground">Satıcı: {orderDialogOffer.sellerName}</div>
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const baseUnits = Math.max(1, Number(orderDialogOffer.quantity ?? 1));
                      // İlan sahibi için ödeme esnasında seçilen adet (ownerPurchasedQuantity) varsa onu göster
                      const u = Math.max(1, Number(orderDialogOffer.ownerPurchasedQuantity ?? baseUnits));
                      const subtotal = orderDialogOffer.price * u;
                      return (
                        <>
                          Teklif: {DataManager.formatPrice(orderDialogOffer.price)} × {u} = {DataManager.formatPrice(subtotal)}
                          {orderDialogOffer.shippingCost > 0 ? ` + ${DataManager.formatPrice(orderDialogOffer.shippingCost)} kargo` : ''}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <Stepper current={current} steps={steps} />
                {showConfirmSection && (
                  <div className="rounded-md border p-3 space-y-2">
                    <div className="font-semibold">Adım 4: Teslim Edildi</div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Takip No: <span className="font-mono select-all">{orderDialogOffer.trackingNo || '—'}</span></div>
                      {orderDialogOffer.shippingCarrierName && (
                        <div>Kargo: {orderDialogOffer.shippingCarrierName}{orderDialogOffer.shippingExtraFee && orderDialogOffer.shippingExtraFee > 0 ? ` • Ek ücret: ${DataManager.formatPrice(orderDialogOffer.shippingExtraFee)}` : ''}</div>
                      )}
                    </div>
                    <div className="space-y-1 pt-1">
                      <Button className="w-full" disabled={!canConfirmDelivery} onClick={handleBuyerConfirmDelivered}>Teslim Aldım</Button>
                      {!canConfirmDelivery && (
                        <div className="text-xs text-muted-foreground">Kargo firması paketi teslim aldıktan sonra bu buton aktif olur.</div>
                      )}
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Son güncelleme: {orderDialogOffer.orderUpdatedAt ? DataManager.formatDate(orderDialogOffer.orderUpdatedAt) : '-'}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      {/* Satıcı tarafı: Verdiğim teklif için işlem diyaloğu */}
  <Dialog open={sellerDialogOpen} onOpenChange={(v) => { if (!v) { setSellerDialogOpen(false); setSellerDialogOffer(null); setTrackingNo(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Satıcı İşlemleri</DialogTitle>
          </DialogHeader>
          {sellerDialogOffer && (() => {
            const listing = DataManager.getListing(sellerDialogOffer.listingId);
            const acceptedAt = sellerDialogOffer.acceptedAt ? DataManager.formatDate(sellerDialogOffer.acceptedAt) : '-';
            const effDelivery: 'shipping' | 'pickup' = sellerDialogOffer.deliveryType
              ? sellerDialogOffer.deliveryType
              : ((sellerDialogOffer.shippingCost && sellerDialogOffer.shippingCost > 0) ? 'shipping' : (listing?.deliveryType === 'pickup' ? 'pickup' : 'shipping'));
            const steps = [
              { id: 1, title: 'Sipariş Alındı', description: `Tarih: ${acceptedAt}` },
              { id: 2, title: effDelivery === 'shipping' ? 'Kargo Firması Seçimi' : 'Teslim Hazırlığı', description: effDelivery === 'shipping' ? (sellerDialogOffer.shippingCarrierName ? `${sellerDialogOffer.shippingCarrierName}${sellerDialogOffer.shippingExtraFee && sellerDialogOffer.shippingExtraFee > 0 ? ` • Ek ücret: ${DataManager.formatPrice(sellerDialogOffer.shippingExtraFee)}` : ''}` : 'Bir kargo firması seçin.') : 'Elden teslim için hazırlayın.' },
              { id: 3, title: 'Kargolandı', description: 'Takip numarası otomatik oluşturulur.' },
              { id: 4, title: 'Teslim Edildi', description: 'Paket alıcıya ulaştığında işaretleyin.' },
              { id: 5, title: 'Tamamlandı & Ödeme', description: 'Ödeme aktarıldıktan sonra tamamlayın.' },
            ];
            const stageMap: Record<string, number> = { accepted: 1, received: 1, carrierSelected: 2, shipped: 3, delivered: 4, completed: 5 } as const;
            const current = sellerDialogOffer.orderStage ? (stageMap[sellerDialogOffer.orderStage] || 1) : 1;
            return (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="font-semibold">{listing?.title || 'İlan'}</div>
                  <div className="text-sm text-muted-foreground">Alıcı: {listing?.buyerName}</div>
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      // İlan sahibi ödeme sırasında farklı bir adet seçtiyse onu (ownerPurchasedQuantity) baz al
                      const fallbackQty = Math.max(1, Number(sellerDialogOffer.quantity ?? 1));
                      const u = Math.max(1, Number(sellerDialogOffer.ownerPurchasedQuantity ?? fallbackQty));
                      const subtotal = sellerDialogOffer.price * u;
                      return (
                        <>
                          Teklif: {DataManager.formatPrice(sellerDialogOffer.price)} × {u} = {DataManager.formatPrice(subtotal)}
                          {sellerDialogOffer.shippingCost && sellerDialogOffer.shippingCost > 0 ? ` + ${DataManager.formatPrice(sellerDialogOffer.shippingCost)} kargo` : ''}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <Stepper current={current} steps={steps} />

                {/* Aşama eylemleri */}
                <div className="space-y-3">
                  {(sellerDialogOffer.orderStage === 'received' || sellerDialogOffer.orderStage === 'accepted') && effDelivery === 'shipping' && (
                    <div className="space-y-2">
                      <Select value={selectedCarrier} onValueChange={(v) => setSelectedCarrier(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Kargo firması seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {carriers.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} {c.extraFee && c.extraFee > 0 ? `(+${DataManager.formatPrice(c.extraFee)})` : '(Ek ücret yok)'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button className="w-full" disabled={!selectedCarrier} onClick={() => handleSelectCarrier(sellerDialogOffer)}>Onayla</Button>
                    </div>
                  )}

                  {(sellerDialogOffer.orderStage === 'carrierSelected' || sellerDialogOffer.orderStage === 'received' || sellerDialogOffer.orderStage === 'accepted') && effDelivery === 'shipping' && (
                    <div className="space-y-2">
                      <div className="text-sm">Takip No: <span className="font-mono select-all">{trackingNo || sellerDialogOffer.trackingNo || '—'}</span></div>
                      <Button className="w-full" onClick={() => handleMarkShipped(sellerDialogOffer)}>Kargoya Ver</Button>
                    </div>
                  )}

                  {sellerDialogOffer.orderStage === 'delivered' && (
                    <div className="space-y-2">
                      <Button className="w-full" onClick={() => handleMarkCompleted(sellerDialogOffer)}>Tamamlandı & Ödeme Aktarıldı</Button>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">Son güncelleme: {sellerDialogOffer.orderUpdatedAt ? DataManager.formatDate(sellerDialogOffer.orderUpdatedAt) : '-'}</div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* TP Buyer: Satın aldığım teklif sipariş durumu */}
      <Dialog open={tpBuyerDialogOpen} onOpenChange={(v) => { if (!v) { setTpBuyerDialogOpen(false); setTpBuyerOrder(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sipariş Durumu</DialogTitle>
          </DialogHeader>
          {tpBuyerOrder && (() => {
            const listing = DataManager.getListing(tpBuyerOrder.listingId);
            const steps = [
              { id: 1, title: 'Sipariş Alındı', description: `Tarih: ${DataManager.formatDate(tpBuyerOrder.acceptedAt)}` },
              { id: 2, title: 'Kargo Firması Seçildi', description: tpBuyerOrder.shippingCarrierName ? `${tpBuyerOrder.shippingCarrierName}${tpBuyerOrder.shippingExtraFee && tpBuyerOrder.shippingExtraFee > 0 ? ` • Ek ücret: ${DataManager.formatPrice(tpBuyerOrder.shippingExtraFee)}` : ''}` : 'Satıcı firma seçecek.' },
              { id: 3, title: 'Kargolandı', description: tpBuyerOrder.trackingNo ? `Takip No: ${tpBuyerOrder.trackingNo}` : (tpBuyerOrder.deliveryType === 'pickup' ? 'Elden teslim için planlanıyor.' : 'Kargoya verilecek.') },
              { id: 4, title: 'Teslim Edildi', description: 'Paket teslim edildi.' },
              { id: 5, title: 'Tamamlandı & Ödeme Aktarıldı', description: tpBuyerOrder.completedAt ? `Tarih: ${DataManager.formatDate(tpBuyerOrder.completedAt)}` : 'Ödeme aktarımı bekleniyor.' }
            ];
            const stageMap: Record<string, number> = { received: 1, carrierSelected: 2, shipped: 3, delivered: 4, completed: 5 } as const;
            const current = tpBuyerOrder.orderStage ? (stageMap[tpBuyerOrder.orderStage] || 1) : 1;
            const canConfirmDelivery = tpBuyerOrder.orderStage === 'shipped';
            const handleBuyerConfirmDelivered = () => {
              if (!tpBuyerOrder) return;
              DataManager.setTPOrderDelivered(tpBuyerOrder.id);
              DataManager.setTPOrderCompleted(tpBuyerOrder.id);
              const updated = DataManager.getAllThirdPartyOrders().find(o => o.id === tpBuyerOrder.id);
              if (updated) setTpBuyerOrder(updated);
              if (userId) setMyPurchases(DataManager.getThirdPartyOrdersForBuyer(userId));
            };
            return (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="font-semibold">{listing?.title || 'İlan'}</div>
                  <div className="text-sm text-muted-foreground">Satıcı: {tpBuyerOrder.sellerName}</div>
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const u = Math.max(1, Number(tpBuyerOrder.quantity ?? 1));
                      const subtotal = tpBuyerOrder.price * u;
                      return (
                        <>
                          Teklif: {DataManager.formatPrice(tpBuyerOrder.price)} × {u} = {DataManager.formatPrice(subtotal)}
                          {tpBuyerOrder.shippingCost > 0 ? ` + ${DataManager.formatPrice(tpBuyerOrder.shippingCost)} kargo` : ''}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <Stepper current={current} steps={steps} />
                {(current === 3 || current === 4) && (
                  <div className="rounded-md border p-3 space-y-2">
                    <div className="font-semibold">Adım 4: Teslim Edildi</div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Takip No: <span className="font-mono select-all">{tpBuyerOrder.trackingNo || '—'}</span></div>
                      {tpBuyerOrder.shippingCarrierName && (
                        <div>Kargo: {tpBuyerOrder.shippingCarrierName}{tpBuyerOrder.shippingExtraFee && tpBuyerOrder.shippingExtraFee > 0 ? ` • Ek ücret: ${DataManager.formatPrice(tpBuyerOrder.shippingExtraFee)}` : ''}</div>
                      )}
                    </div>
                    <div className="space-y-1 pt-1">
                      <Button className="w-full" disabled={!canConfirmDelivery} onClick={handleBuyerConfirmDelivered}>Teslim Aldım</Button>
                      {!canConfirmDelivery && (
                        <div className="text-xs text-muted-foreground">Kargo firması paketi teslim aldıktan sonra bu buton aktif olur.</div>
                      )}
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">Son güncelleme: {tpBuyerOrder.orderUpdatedAt ? DataManager.formatDate(tpBuyerOrder.orderUpdatedAt) : '-'}</div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* TP Seller: Satın alınan teklifler için satıcı işlemleri */}
      <Dialog open={tpSellerDialogOpen} onOpenChange={(v) => { if (!v) { setTpSellerDialogOpen(false); setTpSellerOrder(null); setTrackingNo(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Satıcı İşlemleri</DialogTitle>
          </DialogHeader>
          {tpSellerOrder && (() => {
            const listing = DataManager.getListing(tpSellerOrder.listingId);
            const steps = [
              { id: 1, title: 'Sipariş Alındı', description: `Tarih: ${DataManager.formatDate(tpSellerOrder.acceptedAt)}` },
              { id: 2, title: 'Kargo Firması Seçimi', description: tpSellerOrder.shippingCarrierName ? `${tpSellerOrder.shippingCarrierName}${tpSellerOrder.shippingExtraFee && tpSellerOrder.shippingExtraFee > 0 ? ` • Ek ücret: ${DataManager.formatPrice(tpSellerOrder.shippingExtraFee)}` : ''}` : 'Bir kargo firması seçin.' },
              { id: 3, title: 'Kargolandı', description: 'Takip numarası otomatik oluşturulur.' },
              { id: 4, title: 'Teslim Edildi', description: 'Paket alıcıya ulaştığında işaretleyin.' },
              { id: 5, title: 'Tamamlandı & Ödeme', description: 'Ödeme aktarıldıktan sonra tamamlayın.' },
            ];
            const stageMap: Record<string, number> = { received: 1, carrierSelected: 2, shipped: 3, delivered: 4, completed: 5 } as const;
            const current = tpSellerOrder.orderStage ? (stageMap[tpSellerOrder.orderStage] || 1) : 1;
            return (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="font-semibold">{listing?.title || 'İlan'}</div>
                  <div className="text-sm text-muted-foreground">Alıcı: {tpSellerOrder.buyerName}</div>
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const u = Math.max(1, Number(tpSellerOrder.quantity ?? 1));
                      const subtotal = tpSellerOrder.price * u;
                      return (
                        <>
                          Teklif: {DataManager.formatPrice(tpSellerOrder.price)} × {u} = {DataManager.formatPrice(subtotal)}
                          {tpSellerOrder.shippingCost && tpSellerOrder.shippingCost > 0 ? ` + ${DataManager.formatPrice(tpSellerOrder.shippingCost)} kargo` : ''}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <Stepper current={current} steps={steps} />
                <div className="space-y-3">
                  {tpSellerOrder.orderStage === 'received' && (
                    <div className="space-y-2">
                      <Select value={selectedCarrier} onValueChange={(v) => setSelectedCarrier(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Kargo firması seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {carriers.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} {c.extraFee && c.extraFee > 0 ? `(+${DataManager.formatPrice(c.extraFee)})` : '(Ek ücret yok)'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button className="w-full" disabled={!selectedCarrier} onClick={() => handleSelectCarrierTP(tpSellerOrder)}>Onayla</Button>
                    </div>
                  )}
                  {(tpSellerOrder.orderStage === 'carrierSelected' || tpSellerOrder.orderStage === 'received') && (
                    <div className="space-y-2">
                      <div className="text-sm">Takip No: <span className="font-mono select-all">{trackingNo || tpSellerOrder.trackingNo || '—'}</span></div>
                      <Button className="w-full" onClick={() => handleMarkShippedTP(tpSellerOrder)}>Kargoya Ver</Button>
                    </div>
                  )}
                  {tpSellerOrder.orderStage === 'delivered' && (
                    <div className="space-y-2">
                      <Button className="w-full" onClick={() => handleMarkCompletedTP(tpSellerOrder)}>Tamamlandı & Ödeme Aktarıldı</Button>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Son güncelleme: {tpSellerOrder.orderUpdatedAt ? DataManager.formatDate(tpSellerOrder.orderUpdatedAt) : '-'}</div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Hoş geldin, {currentUser?.name}!
          </h1>
          <p className="text-gray-600">
            İlanlarını yönet, teklifleri görüntüle ve favorilerini kontrol et.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam İlanlarım</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalListings}</div>
              <p className="text-xs text-muted-foreground">Aktif ilanların</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gelen Teklifler</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOffers}</div>
              <p className="text-xs text-muted-foreground">Değerlendirmen gereken</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favorilerim</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFavorites}</div>
              <p className="text-xs text-muted-foreground">Takip ettiğin ilanlar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Okunmamış Mesaj</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unreadMessages}</div>
              <p className="text-xs text-muted-foreground">Yeni mesajların</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="listings">İlanlarım ({stats.totalListings})</TabsTrigger>
            <TabsTrigger value="offers">Teklifler</TabsTrigger>
            <TabsTrigger value="favorites">Favoriler ({stats.totalFavorites})</TabsTrigger>
          </TabsList>

          {/* My Listings Tab */}
          <TabsContent value="listings">
            <Card>
              <CardHeader>
                <CardTitle>İlanlarım</CardTitle>
              </CardHeader>
              <CardContent>
                {myListings.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Henüz ilanın yok</h3>
                    <p className="text-muted-foreground mb-4">
                      İlk ilanını vererek satıcılardan teklif almaya başla!
                    </p>
                    <Button onClick={() => navigate('/create-listing')}>
                      İlan Ver
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myListings.map(listing => (
                      <Card 
                        key={listing.id} 
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => navigate(`/listing/${listing.id}`)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg line-clamp-2 flex-1 mr-2">
                              {listing.title}
                            </CardTitle>
                            <Badge className="bg-green-100 text-green-800">
                              {listing.status === 'active' ? 'Aktif' : 'Kapalı'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                            {listing.description}
                          </p>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Bütçe</span>
                              <span className="font-semibold text-green-600">
                                {DataManager.formatPrice(listing.budgetMax)}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">{listing.category}</Badge>
                              <Badge variant="outline">{getConditionText(listing.condition)}</Badge>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{listing.city}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{DataManager.getTimeAgo(listing.createdAt)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-blue-600">
                                <TrendingUp className="h-4 w-4" />
                                <span className="font-semibold">{listing.offerCount || 0} teklif</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offers Tab (split into outgoing/incoming) */}
          <TabsContent value="offers">
            <Card>
              <CardHeader>
                <CardTitle>Teklifler</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="outgoing" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="outgoing">Verdiğim Teklifler ({myOffers.length})</TabsTrigger>
                    <TabsTrigger value="incoming">Aldığım Teklifler ({incomingOffers.length})</TabsTrigger>
                    <TabsTrigger value="purchases">Satın Aldıklarım ({myPurchases.length})</TabsTrigger>
                    <TabsTrigger value="store">Mağaza Siparişleri ({myTpSales.length})</TabsTrigger>
                  </TabsList>
                  {/* Outgoing Offers */}
                  <TabsContent value="outgoing" className="space-y-4">
                    {myOffers.length === 0 ? (
                      <div className="text-center py-10">
                        <TrendingUp className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Henüz teklif vermedin</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">İlanlara girerek teklif verebilirsin. Verdiğin teklifler burada listelenir.</p>
                      </div>
                    ) : (
                      myOffers.map(offer => {
                        const listing = DataManager.getListings().find(l => l.id === offer.listingId);
                        return (
                          <Card key={offer.id} className="border">
                            <CardContent className="p-5">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold mb-1 line-clamp-1">{listing?.title}</h4>
                                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-2">
                                    <span>{DataManager.getTimeAgo(offer.createdAt)}</span>
                                    <span>Durum: {offer.status === 'active' ? 'Bekliyor' : offer.status === 'accepted' ? 'Kabul Edildi' : offer.status === 'rejected' ? 'Reddedildi' : offer.status === 'withdrawn' ? 'Geri Çekildi' : offer.status}</span>
                                  </div>
                                  {offer.message && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{offer.message}</p>}
                                  <div className="flex items-center gap-4">
                                    <span className="font-semibold text-green-600">{DataManager.formatPrice(offer.price)}</span>
                                    {offer.shippingCost > 0 && <span className="text-xs text-muted-foreground">+ {DataManager.formatPrice(offer.shippingCost)} kargo</span>}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 min-w-[130px]">
                                  <Badge variant={offer.status === 'active' ? 'secondary' : offer.status === 'accepted' ? 'default' : offer.status === 'rejected' ? 'destructive' : offer.status === 'withdrawn' ? 'outline' : 'outline'}>
                                    {offer.status === 'active' ? 'Bekliyor' : offer.status === 'accepted' ? 'Kabul Edildi' : offer.status === 'rejected' ? 'Reddedildi' : offer.status === 'withdrawn' ? 'Geri Çekildi' : offer.status}
                                  </Badge>
                                  {offer.status === 'active' && (
                                    <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleWithdrawOffer(offer.id)}>Geri Çek</Button>
                                  )}
                                  {offer.status === 'accepted' && (
                                    <Button size="sm" variant="outline" onClick={() => { setSellerDialogOffer(offer); setSellerDialogOpen(true); setTrackingNo(offer.trackingNo || ''); setSelectedCarrier(offer.shippingCarrierId || ''); }}>
                                      <Package className="h-4 w-4 mr-1" /> Sipariş İşlemleri
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </TabsContent>
                  {/* Incoming Offers */}
                  <TabsContent value="incoming" className="space-y-4">
                    {incomingOffers.length === 0 ? (
                      <div className="text-center py-10">
                        <TrendingUp className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">İlanlarına henüz teklif gelmedi</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">Satıcılar ilanlarına teklif verdiğinde burada görüntülenecek.</p>
                      </div>
                    ) : (
                      incomingOffers.map(offer => {
                        const listing = DataManager.getListings().find(l => l.id === offer.listingId);
                        return (
                          <Card key={offer.id} className="border">
                            <CardContent className="p-5">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold mb-1 line-clamp-1">{listing?.title}</h4>
                                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-2">
                                    <span>Satıcı: {offer.sellerName}</span>
                                    <span>{DataManager.getTimeAgo(offer.createdAt)}</span>
                                  </div>
                                  {offer.message && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{offer.message}</p>}
                                  <div className="flex items-center gap-4">
                                    <span className="font-semibold text-green-600">{DataManager.formatPrice(offer.price)}</span>
                                    {offer.shippingCost > 0 && <span className="text-xs text-muted-foreground">+ {DataManager.formatPrice(offer.shippingCost)} kargo</span>}
                                  </div>
                                </div>
                                <div className="flex flex-col sm:items-end gap-2 min-w-[140px]">
                                  <Badge variant={offer.status === 'active' ? 'secondary' : offer.status === 'accepted' ? 'default' : offer.status === 'rejected' ? 'destructive' : 'outline'}>
                                    {offer.status === 'active' ? 'Bekliyor' : offer.status === 'accepted' ? 'Kabul Edildi' : offer.status === 'rejected' ? 'Reddedildi' : offer.status === 'withdrawn' ? 'Geri Çekildi' : offer.status}
                                  </Badge>
                                  {offer.status === 'active' && (
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleOfferAction(offer.id, 'accept')} className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="h-4 w-4 mr-1" /> Kabul
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => handleOfferAction(offer.id, 'reject')}>
                                        <XCircle className="h-4 w-4 mr-1" /> Reddet
                                      </Button>
                                    </div>
                                  )}
                                  {offer.status === 'accepted' && (
                                    <Button size="sm" variant="outline" onClick={() => { setOrderDialogOffer(offer); setOrderDialogOpen(true); }}>
                                      <Package className="h-4 w-4 mr-1" /> Sipariş Durumu
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </TabsContent>

                  {/* Purchases (Third-party orders as buyer) */}
                  <TabsContent value="purchases" className="space-y-4">
                    {myPurchases.length === 0 ? (
                      <div className="text-center py-10">
                        <TrendingUp className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Henüz satın alma yok</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">Tekliflerden satın aldığın ürünler burada listelenir.</p>
                      </div>
                    ) : (
                      myPurchases.map(order => {
                        const listing = DataManager.getListing(order.listingId);
                        return (
                          <Card key={order.id} className="border">
                            <CardContent className="p-5 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="font-semibold mb-1 line-clamp-1">{listing?.title}</h4>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-2">
                                  <span>Satıcı: {order.sellerName}</span>
                                  <span>{DataManager.getTimeAgo(order.acceptedAt)}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="font-semibold text-green-600">{DataManager.formatPrice(order.price)}</span>
                                  {order.shippingCost > 0 && <span className="text-xs text-muted-foreground">+ {DataManager.formatPrice(order.shippingCost)} kargo</span>}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 min-w-[140px]">
                                <Badge variant={order.orderStage === 'completed' ? 'default' : 'secondary'}>
                                  {order.orderStage === 'received' ? 'Sipariş Alındı' : order.orderStage === 'carrierSelected' ? 'Kargo Seçildi' : order.orderStage === 'shipped' ? 'Kargolandı' : order.orderStage === 'delivered' ? 'Teslim Edildi' : 'Tamamlandı'}
                                </Badge>
                                <Button size="sm" variant="outline" onClick={() => { setTpBuyerOrder(order); setTpBuyerDialogOpen(true); }}>
                                  <Package className="h-4 w-4 mr-1" /> Sipariş Durumu
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </TabsContent>

                  {/* Store sales (Third-party orders as seller) */}
                  <TabsContent value="store" className="space-y-4">
                    {myTpSales.length === 0 ? (
                      <div className="text-center py-10">
                        <TrendingUp className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Henüz mağaza siparişi yok</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">Tekliflerinden yapılan satın almalar burada listelenir.</p>
                      </div>
                    ) : (
                      myTpSales.map(order => {
                        const listing = DataManager.getListing(order.listingId);
                        return (
                          <Card key={order.id} className="border">
                            <CardContent className="p-5 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="font-semibold mb-1 line-clamp-1">{listing?.title}</h4>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-2">
                                  <span>Alıcı: {order.buyerName}</span>
                                  <span>{DataManager.getTimeAgo(order.acceptedAt)}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="font-semibold text-green-600">{DataManager.formatPrice(order.price)}</span>
                                  {order.shippingCost > 0 && <span className="text-xs text-muted-foreground">+ {DataManager.formatPrice(order.shippingCost)} kargo</span>}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 min-w-[140px]">
                                <Badge variant={order.orderStage === 'completed' ? 'default' : 'secondary'}>
                                  {order.orderStage === 'received' ? 'Sipariş Alındı' : order.orderStage === 'carrierSelected' ? 'Kargo Seçildi' : order.orderStage === 'shipped' ? 'Kargolandı' : order.orderStage === 'delivered' ? 'Teslim Edildi' : 'Tamamlandı'}
                                </Badge>
                                <Button size="sm" variant="outline" onClick={() => { setTpSellerOrder(order); setTpSellerDialogOpen(true); setTrackingNo(order.trackingNo || ''); setSelectedCarrier(order.shippingCarrierId || ''); }}>
                                  <Package className="h-4 w-4 mr-1" /> Sipariş İşlemleri
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites">
            <Card>
              <CardHeader>
                <CardTitle>Favorilerim</CardTitle>
              </CardHeader>
              <CardContent>
                {favoriteListings.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Henüz favori yok</h3>
                    <p className="text-muted-foreground">
                      Beğendiğin ilanları favorilere ekleyerek buradan takip edebilirsin.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favoriteListings.map(listing => (
                      <Card 
                        key={listing.id} 
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => navigate(`/listing/${listing.id}`)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg line-clamp-2 flex-1 mr-2">
                              {listing.title}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <FavoriteButton 
                                listingId={listing.id}
                                userId={userId}
                                size="sm"
                                variant="ghost"
                              />
                              <Badge className="bg-green-100 text-green-800">
                                {listing.status === 'active' ? 'Aktif' : 'Kapalı'}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                            {listing.description}
                          </p>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Bütçe</span>
                              <span className="font-semibold text-green-600">
                                {DataManager.formatPrice(listing.budgetMax)}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">{listing.category}</Badge>
                              <Badge variant="outline">{getConditionText(listing.condition)}</Badge>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{listing.city}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{DataManager.getTimeAgo(listing.createdAt)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">İlan sahibi:</span>
                                <span className="font-medium">{listing.maskOwnerName ? maskDisplayName(listing.buyerName) : listing.buyerName}</span>
                              </div>
                              <div className="flex items-center gap-1 text-blue-600">
                                <TrendingUp className="h-4 w-4" />
                                <span className="font-semibold">{listing.offerCount || 0} teklif</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}