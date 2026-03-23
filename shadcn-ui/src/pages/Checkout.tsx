import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header-mysql.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { DataManager, Offer, Listing } from '@/lib/mockData';
import { mysqlAPI } from '@/lib/mysql-api';
import { toast } from 'sonner';
import { Plus, Minus } from 'lucide-react';

export default function Checkout() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const offerId = params.get('offerId') || '';

  const [offer, setOffer] = useState<Offer | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  
  // User Info Form
  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: ''
  });
  
  // Payment Info - boş başlat
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [qty, setQty] = useState<number>(1);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Komisyon bakiyesi
  const [commissionBalance, setCommissionBalance] = useState(0);
  const [useCommissionBalance, setUseCommissionBalance] = useState(false);
  const [commissionAmount, setCommissionAmount] = useState(0);

  const currentUser = DataManager.getCurrentUser();

  // MySQL'den kullanıcı bilgilerini yükle ve authentication kontrolü
  useEffect(() => {
    const checkAuth = async () => {
      try {
          console.log('🔐 Authentication + address load başlatılıyor...');
  const token = localStorage.getItem('mysql-auth-token');
        console.log('🎫 LocalStorage token:', token ? 'Token mevcut' : 'Token yok');
        
        const mysqlUser = await mysqlAPI.getCurrentUser();
        console.log('👤 MySQL user response:', mysqlUser);
        
        if (mysqlUser && mysqlUser.success && mysqlUser.user) {
          console.log('✅ Authentication başarılı:', mysqlUser.user.email);
          setCurrentUserId(mysqlUser.user.id);
          const user = mysqlUser.user;
            // Varsayılan adresi getir
            let address = '';
            let city = '';
            let postalCode = '';
            try {
              const addrRes = await mysqlAPI.getAddresses();
              const arr = addrRes.addresses || addrRes.data || [];
              const def = arr.find((a: any) => Number(a.is_default) === 1 || a.is_default === true) || arr[0];
              if (def) {
                // address_line1 (+ address_line2) → tek satır string
                address = [def.address_line1, def.address_line2].filter(Boolean).join(', ');
                city = def.city || '';
                postalCode = def.postal_code || '';
              }
            } catch (e) {
              console.warn('Adres bilgileri yüklenemedi:', e);
            }

            setUserInfo({
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              email: user.email || '',
              phone: user.phone || '',
              address,
              city,
              postalCode
            });
            
            // Komisyon bakiyesini yükle
            try {
              const balanceResponse = await fetch('/api/commission/balance', {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('mysql-auth-token')}`
                }
              });
              const balanceData = await balanceResponse.json();
              if (balanceData && balanceData.balance) {
                setCommissionBalance(balanceData.balance);
                console.log('💰 Komisyon bakiyesi yüklendi:', balanceData.balance);
              }
            } catch (error) {
              console.warn('⚠️ Komisyon bakiyesi yüklenemedi:', error);
            }
        } else {
          console.log('❌ MySQL authentication failed, redirecting to login');
          toast.error('Ödeme için giriş yapmalısınız');
          navigate('/?login=true');
        }
      } catch (error) {
        console.error('❌ Error checking authentication:', error);
        toast.error('Ödeme için giriş yapmalısınız');
        navigate('/?login=true');
      }
    };
    checkAuth();
  }, [navigate]);

  // Form validation
  const isFormValid = () => {
    return userInfo.firstName.trim() &&
           userInfo.lastName.trim() &&
           userInfo.email.trim() &&
           userInfo.phone.trim() &&
           userInfo.address.trim() &&
           userInfo.city.trim() &&
           cardName.trim() &&
           cardNumber.trim() &&
           expiry.trim() &&
           cvv.trim();
  };

  // Teklifi yükle
  useEffect(() => {
    const loadOffer = async () => {
      if (!offerId) {
        toast.error('Teklif ID\'si eksik');
        navigate('/');
        return;
      }
      
      try {
        const offerResponse = await mysqlAPI.getOfferById(offerId);
        if (!offerResponse.success || !offerResponse.offer) {
          toast.error(`Teklif bulunamadı (ID: ${offerId})`);
          navigate('/');
          return;
        }
        
        const foundOffer = offerResponse.offer;
        const mappedOffer: Offer = {
          id: foundOffer.id,
          listingId: foundOffer.listing_id,
          sellerId: foundOffer.seller_id,
          sellerName: foundOffer.seller_name || 'Anonim',
          sellerRating: foundOffer.seller_rating || 5.0,
          price: parseFloat(foundOffer.price) || 0,
          quantity: parseInt(foundOffer.quantity) || 1,
          condition: foundOffer.offer_condition || 'used',
          productName: foundOffer.product_name || '',
          description: foundOffer.description || '',
          deliveryType: foundOffer.delivery_type || 'shipping',
          shippingDesi: foundOffer.shipping_desi || '',
          shippingCost: parseFloat(foundOffer.shipping_cost) || 0,
          etaDays: parseInt(foundOffer.eta_days) || 3,
          status: foundOffer.status || 'active',
          validUntil: foundOffer.valid_until || '',
          createdAt: foundOffer.created_at,
          images: [], // Images skip - sadece stok için
          soldToOthers: parseInt(foundOffer.sold_to_others) || 0
        };
        
        setOffer(mappedOffer);
      } catch (error) {
        console.error('Teklif yüklenirken hata:', error);
        toast.error('Teklif yüklenemedi');
        navigate('/');
      }
    };

    loadOffer();
  }, [offerId, navigate]);

  // Satın alma işlemi
  const handlePay = async () => {
    if (!currentUserId) {
      toast.error('Ödeme için giriş yapmalısınız');
      navigate('/?login=true');
      return;
    }
    if (!offer || !isFormValid()) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }
    
    console.log('💳 Ödeme işlemi başlatılıyor...', {
      userId: currentUserId,
      offerId: offer.id,
      quantity: qty
    });
    
    setIsPaying(true);
    try {
      // MySQL API ile satın alma işlemi
      const totalAmount = (offer.price * qty) + (offer.deliveryType === 'shipping' ? (offer.shippingCost ?? 0) : 0);
      
      const purchaseResponse = await mysqlAPI.purchaseOffer(offer.id, {
        quantity: qty,
        totalAmount: totalAmount,
        userInfo: {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          email: userInfo.email,
          phone: userInfo.phone,
          address: userInfo.address,
          city: userInfo.city,
          postalCode: userInfo.postalCode
        },
        paymentInfo: {
          cardName: cardName,
          cardNumber: cardNumber,
          expiry: expiry,
          cvv: cvv
        },
        useCommissionBalance: useCommissionBalance,
        commissionAmount: useCommissionBalance ? commissionAmount : 0
      });

      if (!purchaseResponse.success) {
        toast.error(purchaseResponse.message || 'Satın alma işlemi başarısız');
        setIsPaying(false);
        return;
      }

      console.log('✅ Purchase successful, refreshing offer data...');

      // Başarılı satın alma - Offer'ı yeniden yükle
      try {
        const updatedOfferResponse = await mysqlAPI.getOfferById(offer.id);
        if (updatedOfferResponse.success && updatedOfferResponse.offer) {
          const foundOffer = updatedOfferResponse.offer;
          const updatedOffer: Offer = {
            ...offer,
            soldToOthers: parseInt(foundOffer.sold_to_others) || 0
          };
          setOffer(updatedOffer);
          console.log('📦 Offer updated with new stock:', {
            offerId: offer.id,
            previousSold: offer.soldToOthers,
            newSold: parseInt(foundOffer.sold_quantity) || 0
          });
        }
      } catch (error) {
        console.error('Error refreshing offer:', error);
        // Fallback: UI'da manual güncelle
        setOffer(prev => prev ? {
          ...prev,
          soldToOthers: (prev.soldToOthers || 0) + qty
        } : null);
      }

      let successMessage = '🎉 Ödeme başarılı! Stok güncellendi ve satıcıya email bildirim gönderildi.';
      if (purchaseResponse.commissionUsed && purchaseResponse.commissionUsed > 0) {
        successMessage += ` Komisyon bakiyenizden ${DataManager.formatPrice(purchaseResponse.commissionUsed)} kullanıldı.`;
      }
      toast.success(successMessage);

      // Dashboard'a yönlendir
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('❌ Ödeme hatası:', error);
      toast.error('Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsPaying(false);
    }
  };

  if (!offer || !currentUserId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-3xl mx-auto p-4">
          <Card>
            <CardHeader>
              <CardTitle>Ödeme</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{!offer ? 'Teklif yükleniyor...' : 'Kullanıcı bilgileri kontrol ediliyor...'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ödeme Sayfası</h1>
          <p className="text-gray-600">Güvenli ödeme işleminizi tamamlayın</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Product Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Ürün Bilgileri</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-2">{offer.productName}</h3>
              <p className="text-gray-600 text-sm mb-4">Satıcı: {offer.sellerName}</p>
              
              {/* Adet Seçimi */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Adet Seçimi</label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors disabled:opacity-50"
                    disabled={qty <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      const maxAvailable = Math.max(0, (offer.quantity || 1) - 1 - (offer.soldToOthers || 0));
                      setQty(Math.min(maxAvailable, Math.max(1, val)));
                    }}
                    className="w-16 text-center border border-gray-300 rounded-lg py-1"
                    min="1"
                    max={Math.max(0, (offer.quantity || 1) - 1 - (offer.soldToOthers || 0))}
                  />
                  <button
                    onClick={() => {
                      const maxAvailable = Math.max(0, (offer.quantity || 1) - 1 - (offer.soldToOthers || 0));
                      setQty(Math.min(maxAvailable, qty + 1));
                    }}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors disabled:opacity-50"
                    disabled={qty >= Math.max(0, (offer.quantity || 1) - 1 - (offer.soldToOthers || 0))}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-500">/ {Math.max(0, (offer.quantity || 1) - 1 - (offer.soldToOthers || 0))}</span>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Teklif Fiyatı:</span>
                  <span className="font-semibold text-green-600">{DataManager.formatPrice(offer.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kargo Ücreti:</span>
                  <span className="font-semibold text-blue-600">{offer.deliveryType === 'shipping' ? DataManager.formatPrice((offer.shippingCost ?? 0)) : 'Ücretsiz'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Adet:</span>
                  <span className="font-semibold">{qty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Toplam Stok:</span>
                  <span className="font-semibold">{offer.quantity || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Satılan Adet:</span>
                  <span className="font-semibold text-red-600">{offer.soldToOthers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Diğer kullanıcılara açık:</span>
                  <span className="font-semibold text-green-600">{Math.max(0, (offer.quantity || 1) - 1 - (offer.soldToOthers || 0))}</span>
                </div>
                <hr className="my-3"/>
                <div className="flex justify-between text-lg font-bold">
                  <span>Ödenecek Tutar:</span>
                  <span className="text-green-600">{DataManager.formatPrice((offer.price * qty) + (offer.deliveryType === 'shipping' ? (offer.shippingCost ?? 0) : 0))}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>🔒 Güvenli Ödeme</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mt-2">
                  <span>🚚 Hızlı Teslimat</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Kişisel Bilgiler Form */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Kişisel Bilgiler</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                  <Input
                    type="text"
                    placeholder="Adınız"
                    value={userInfo.firstName}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Soyad *</label>
                  <Input
                    type="text"
                    placeholder="Soyadınız"
                    value={userInfo.lastName}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-posta *</label>
                  <Input
                    type="email"
                    placeholder="ornek@email.com"
                    value={userInfo.email}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                  <Input
                    type="tel"
                    placeholder="0555 555 55 55"
                    value={userInfo.phone}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adres *</label>
                  <Input
                    type="text"
                    placeholder="Mahalle, Sokak, No"
                    value={userInfo.address}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şehir *</label>
                  <Input
                    type="text"
                    placeholder="İstanbul"
                    value={userInfo.city}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posta Kodu</label>
                  <Input
                    type="text"
                    placeholder="34000"
                    value={userInfo.postalCode}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, postalCode: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Komisyon Bakiyesi Kullanım Seçeneği */}
            {commissionBalance > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-white rounded-xl shadow-lg p-6 border-l-4 border-l-green-500">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  💰 Komisyon Bakiyesi
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Kullanılabilir Bakiye</p>
                      <p className="text-2xl font-bold text-green-600">{DataManager.formatPrice(commissionBalance)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="useCommission"
                        checked={useCommissionBalance}
                        onChange={(e) => {
                          setUseCommissionBalance(e.target.checked);
                          if (e.target.checked) {
                            const totalPrice = (offer.price * qty) + (offer.deliveryType === 'shipping' ? (offer.shippingCost ?? 0) : 0);
                            const useAmount = Math.min(commissionBalance, totalPrice);
                            setCommissionAmount(useAmount);
                          } else {
                            setCommissionAmount(0);
                          }
                        }}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                      />
                      <label htmlFor="useCommission" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Komisyon bakiyemi kullan
                      </label>
                    </div>
                  </div>
                  {useCommissionBalance && (
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Sipariş Toplamı:</span>
                          <span className="font-medium">{DataManager.formatPrice((offer.price * qty) + (offer.deliveryType === 'shipping' ? (offer.shippingCost ?? 0) : 0))}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Komisyondan Düşülecek:</span>
                          <span className="font-semibold">-{DataManager.formatPrice(commissionAmount)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-base font-bold">
                          <span>Kart ile Ödenecek:</span>
                          <span className="text-blue-600">{DataManager.formatPrice(Math.max(0, (offer.price * qty) + (offer.deliveryType === 'shipping' ? (offer.shippingCost ?? 0) : 0) - commissionAmount))}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ödeme Bilgileri Form */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900">Ödeme Bilgileri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kart Üzerindeki İsim *</label>
                  <Input 
                    value={cardName} 
                    onChange={e => setCardName(e.target.value)}
                    placeholder="Ad Soyad"
                    className="w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kart Numarası *</label>
                  <Input 
                    value={cardNumber} 
                    onChange={e => setCardNumber(e.target.value)}
                    placeholder="Kart numaranızı girin"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Son Kullanma Tarihi *</label>
                  <Input 
                    value={expiry} 
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.substring(0, 2) + '/' + value.substring(2, 4);
                      }
                      setExpiry(value);
                    }}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVV *</label>
                  <Input 
                    value={cvv} 
                    onChange={e => setCvv(e.target.value)}
                    placeholder="123"
                    maxLength={4}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Ödenecek Tutar:</span>
                  <span className="text-2xl text-green-600">{DataManager.formatPrice((offer.price * qty) + (offer.deliveryType === 'shipping' ? (offer.shippingCost ?? 0) : 0))}</span>
                </div>
                
                <div className="space-y-3 mt-4">
                  <Button 
                    className="w-full h-12 text-lg font-semibold" 
                    onClick={handlePay}
                    disabled={isPaying || !isFormValid()}
                  >
                    {isPaying ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Ödeme İşleniyor...</span>
                      </div>
                    ) : (
                      `${DataManager.formatPrice((offer.price * qty) + (offer.deliveryType === 'shipping' ? (offer.shippingCost ?? 0) : 0))} Öde`
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full h-12" 
                    onClick={() => navigate(-1)}
                  >
                    Geri Dön
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Ödeme yaparak <a href="#" className="text-blue-600 hover:underline">kullanım şartlarını</a> ve 
                  <a href="#" className="text-blue-600 hover:underline ml-1">gizlilik politikasını</a> kabul etmiş olursunuz.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}