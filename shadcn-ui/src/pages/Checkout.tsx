import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { DataManager, Offer, Listing } from '@/lib/mockData';
import { toast } from 'sonner';

// Demo ödeme sayfası: Offer veya ThirdPartyOrder ödemesi için kullanılabilir.
// Beklenen query: ?offerId=offer_xxx
export default function Checkout() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const offerId = params.get('offerId') || '';

  const [offer, setOffer] = useState<Offer | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [cardName, setCardName] = useState('Demo Kullanıcı');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/30');
  const [cvv, setCvv] = useState('123');
  const [isPaying, setIsPaying] = useState(false);
  const [qty, setQty] = useState<number>(1);

  const currentUser = DataManager.getCurrentUser();

  useEffect(() => {
    if (!offerId) return;
    const found = DataManager.getAllOffers().find(o => o.id === offerId) || null;
    setOffer(found || null);
    if (found) setListing(DataManager.getListing(found.listingId) || null);
  }, [offerId]);

  const total = useMemo(() => {
    if (!offer) return 0;
    const isBuyerNotOwner = !!currentUser && (!listing || currentUser.id !== listing.buyerId);
    const baseUnits = isBuyerNotOwner ? qty : (offer.quantity ?? 1);
    const base = offer.price * baseUnits;
    const shipping = offer.deliveryType === 'shipping' ? (offer.shippingCost ?? 0) + (offer.shippingExtraFee ?? 0) : 0;
    return base + shipping;
  }, [offer, qty, currentUser, listing]);

  const computedUnits = useMemo(() => {
    if (!offer) return 0;
    const isBuyerNotOwner = !!currentUser && (!listing || currentUser.id !== listing.buyerId);
    return isBuyerNotOwner ? qty : (offer.quantity ?? 1);
  }, [offer, qty, currentUser, listing]);

  // Alıcı için satın alınabilir maksimum adet (ilan sahibinin 1 adet hakkı ayrıdır)
  const maxPurchasable = useMemo(() => {
    if (!offer || !currentUser || !listing) return 0;
    if (currentUser.id === listing.buyerId) return 0; // ilan sahibi bu alanı kullanmaz
    const offerQty = offer.quantity ?? 1;
    const sold = offer.soldToOthers ?? 0;
    return Math.max(0, offerQty - 1 - sold);
  }, [offer, currentUser, listing]);

  const handlePay = async () => {
    if (!currentUser) {
      toast.error('Ödeme için giriş yapmalısınız');
      navigate('/');
      return;
    }
    if (!offer) return;
    setIsPaying(true);
    try {
      // Demo: 1.5s bekleyip başarılı say
      await new Promise((r) => setTimeout(r, 1500));
      // Demo davranış: ödeme başarılı
      // Normal kullanıcı (ilan sahibi değil) ise satın alma kaydı oluştur
      if (currentUser && listing && currentUser.id !== listing.buyerId) {
        // Ön doğrulama: miktar stok sınırını aşmasın
        if (maxPurchasable <= 0) {
          toast.error('Satın alınabilir stok yok');
          setIsPaying(false);
          return;
        }
        if (qty > maxPurchasable) {
          toast.error(`En fazla ${maxPurchasable} adet satın alabilirsiniz`);
          setQty(maxPurchasable);
          setIsPaying(false);
          return;
        }
        const res = DataManager.purchaseFromOffer(offer.id, currentUser.id, qty);
        if (!res.success) {
          toast.error(res.message || 'Satın alma oluşturulamadı');
          setIsPaying(false);
          return;
        }
      } else if (currentUser && listing && currentUser.id === listing.buyerId) {
        // İlan sahibi: ödeme sonrası teklifi kabul et
        DataManager.acceptOffer(offer.id);
      }
      toast.success('Ödeme başarılı!');
      // Alıcı tarafında sipariş durumu görüntülemek üzere dashboard’a yönlendirelim
      navigate('/dashboard');
    } catch (e) {
      toast.error('Ödeme başarısız. Lütfen tekrar deneyin.');
    } finally {
      setIsPaying(false);
    }
  };

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-3xl mx-auto p-4">
          <Card>
            <CardHeader>
              <CardTitle>Ödeme</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Geçerli bir teklif bulunamadı.</p>
              <Button className="mt-4" onClick={() => navigate('/')}>Anasayfaya Dön</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Ödeme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>İlan: <span className="text-foreground font-medium">{listing?.title || offer.listingId}</span></div>
              <div>Satıcı: <span className="text-foreground">{offer.sellerName}</span></div>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-sm">Kart Üzerindeki İsim</label>
                <Input value={cardName} onChange={e => setCardName(e.target.value)} />
                <label className="text-sm">Kart Numarası</label>
                <Input value={cardNumber} onChange={e => setCardNumber(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">SKT (AA/YY)</label>
                    <Input value={expiry} onChange={e => setExpiry(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm">CVV</label>
                    <Input value={cvv} onChange={e => setCvv(e.target.value)} />
                  </div>
                </div>
                {currentUser && listing && currentUser.id !== listing.buyerId && (
                  <div>
                    <label className="text-sm">Adet</label>
                    <Input
                      type="number"
                      min={1}
                      max={Math.max(1, maxPurchasable) || 1}
                      value={qty}
                      onChange={(e) => {
                        const next = Math.max(1, Number(e.target.value) || 1);
                        setQty(maxPurchasable > 0 ? Math.min(next, maxPurchasable) : 1);
                      }}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Maksimum satın alınabilir: {maxPurchasable}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span>Ürün</span><span>{DataManager.formatPrice(offer.price)} × {computedUnits}</span></div>
                {offer.deliveryType === 'shipping' && (
                  <div className="flex justify-between text-sm"><span>Kargo</span><span>{DataManager.formatPrice((offer.shippingCost ?? 0) + (offer.shippingExtraFee ?? 0))}</span></div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold"><span>Toplam</span><span>{DataManager.formatPrice(total)}</span></div>
                <Button className="w-full mt-2" disabled={isPaying} onClick={handlePay}>
                  {isPaying ? 'Ödeniyor…' : 'Ödemeyi Tamamla'}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>Geri Dön</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
