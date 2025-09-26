import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, ShoppingCart, MapPin, Truck, Timer, Tag, Store, MessageCircle, Heart, TicketPercent, FileText, HelpCircle, CreditCard, Undo2 } from 'lucide-react';
import { DataManager, Product } from '@/lib/mockData';
import MessageModal from '@/components/MessageModal';
import ImageMagnifier from '@/components/ImageMagnifier';
import { toast } from '@/lib/sonner';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [fav, setFav] = useState(false);
  const [following, setFollowing] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const currentUser = DataManager.getCurrentUser();

  useEffect(() => {
    if (!id) return;
    const p = DataManager.getProductById(id);
    if (!p) {
      setProduct(null);
      return;
    }
    setProduct(p);
    // favori ve takip durumunu güncelle
    const u = DataManager.getCurrentUser();
    if (u) {
      setFav(DataManager.isProductFavorite(u.id, p.id));
      setFollowing(DataManager.isFollowingSeller(u.id, p.sellerId));
    } else {
      setFav(false);
      setFollowing(false);
    }
  }, [id]);

  const rating = useMemo(() => Math.max(0, Math.min(5, Math.round(((product?.rating ?? 0) * 10)) / 10)), [product]);

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Ürün bulunamadı</h1>
          <p className="text-muted-foreground mb-6">Aradığınız ürün kaldırılmış veya hiç yok.</p>
          <Button onClick={() => navigate('/')}>Ana sayfaya dön</Button>
        </div>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [
    'https://via.placeholder.com/800x600?text=Urun+Gorseli'
  ];

  // Sekme badge sayıları
  const reviewCount = (product.ratingCount ?? (product.reviews?.length ?? 0)) || 0;
  // Q&A veri modeli henüz eklenmedi, eklendiğinde buraya gerçek sayı bağlanacak
  const qaCount = 0;

  const handleBuy = () => {
    if (!currentUser) {
      navigate('/profile');
      return;
    }
    try {
      DataManager.purchaseProduct(product.id, currentUser.id, currentUser.name, 1);
      toast.success('Sipariş oluşturuldu');
      const updated = DataManager.getProductById(product.id);
      if (updated) setProduct(updated);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    }
  };
  const handleAddToCart = () => {
    if (!currentUser) { navigate('/profile'); return; }
    DataManager.addToCart(currentUser.id, product.id, 1);
    toast.success('Sepete eklendi');
  };

  const handleToggleFavorite = () => {
    if (!currentUser) { navigate('/profile'); return; }
    if (!fav) {
      DataManager.addProductToFavorites(currentUser.id, product.id);
      setFav(true);
      toast.success('Favorilere eklendi');
    } else {
      DataManager.removeProductFromFavorites(currentUser.id, product.id);
      setFav(false);
      toast.message('Favorilerden çıkarıldı');
    }
  };

  const handleToggleFollow = () => {
    if (!currentUser) { navigate('/profile'); return; }
    if (!following) {
      DataManager.followSeller(currentUser.id, product.sellerId);
      setFollowing(true);
      toast.success('Satıcı takip edildi');
    } else {
      DataManager.unfollowSeller(currentUser.id, product.sellerId);
      setFollowing(false);
      toast.message('Takipten çıkıldı');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gallery */}
          <div>
            <Card>
              <CardContent className="p-2">
                <div className="aspect-[4/3] bg-muted rounded-md overflow-hidden">
                  <ImageMagnifier src={images[activeIdx]} className="w-full h-full" zoom={2} zoomPaneSize={360} />
                </div>
                {product.verticalLabel && (
                  <div className="mt-2"><Badge>{product.verticalLabel}</Badge></div>
                )}
              </CardContent>
            </Card>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.map((src, idx) => (
                  <button key={idx} className={`aspect-square rounded-md overflow-hidden border ${idx===activeIdx?'ring-2 ring-blue-500':''}`} onClick={()=>setActiveIdx(idx)}>
                    <img src={src} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-extrabold leading-tight flex-1 text-gray-900">{product.title}</h1>
              {product.isBestSeller && (
                <Badge className="bg-orange-400 text-white">EN ÇOK SATAN</Badge>
              )}
            </div>
            {/* Rating & comments */}
            <div className="mt-2 flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{rating.toFixed(1)}</span>
                {product.ratingCount ? <span className="text-gray-500">({product.ratingCount} değerlendirme)</span> : null}
              </div>
            </div>

            {/* Açıklama artık en altta gösterilecek */}

            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{product.category}</Badge>
                <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" /> {product.city}</span>
              </div>
              {product.ratingCount && product.ratingCount > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{rating.toFixed(1)}</span>
                  <span className="text-gray-400">({product.ratingCount})</span>
                </div>
              )}
            </div>

            {/* Favorites count */}
            {typeof product.favoritesCount === 'number' && (
              <div className="mt-1 text-xs text-muted-foreground">{product.favoritesCount.toLocaleString('tr-TR')} kişi favoriledi</div>
            )}

            {product.promoText && (
              <div className="mt-3 text-orange-600 font-semibold">{product.promoText}</div>
            )}

            {/* Price & discount */}
            <div className="mt-4">
              <div className="flex items-end gap-3">
                <div className="text-4xl font-extrabold text-green-700">{DataManager.formatPrice(product.price)}</div>
                {product.oldPrice && product.oldPrice > product.price && (
                  <div className="text-lg text-gray-400 line-through">{DataManager.formatPrice(product.oldPrice)}</div>
                )}
                {(() => {
                  const percent = product.discountPercent ?? (product.oldPrice && product.oldPrice > product.price ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0);
                  return percent && percent > 0 ? (
                    <Badge className="bg-orange-500 text-white">%{percent} indirim</Badge>
                  ) : null;
                })()}
                {product.couponText && (
                  <span className="inline-flex items-center gap-1 text-sm text-orange-600 font-semibold">
                    <TicketPercent className="h-4 w-4" /> {product.couponText}
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{product.stock > 0 ? `Stokta ${product.stock} adet` : 'Stokta yok'}</div>
            </div>

            {/* Campaign & delivery highlights */}
            <div className="mt-4 flex flex-wrap gap-3">
              {product.fastDelivery && (
                <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
                  <Timer className="h-4 w-4" /> Hızlı Teslimat
                </span>
              )}
              {product.freeShipping && (
                <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                  <Truck className="h-4 w-4" /> Kargo Bedava
                </span>
              )}
            </div>

            {/* Primary CTAs */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleAddToCart} disabled={product.stock <= 0}>
                Sepete Ekle
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleBuy} disabled={product.stock <= 0}>
                <ShoppingCart className="h-5 w-5 mr-2" /> Şimdi Al
              </Button>
            </div>

            {/* Secondary actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={`inline-flex items-center gap-2 px-2.5 py-1.5 text-sm rounded border ${fav? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-700'}`}
                onClick={handleToggleFavorite}
              >
                <Heart className={`h-4 w-4 ${fav? 'fill-red-500 text-red-500' : ''}`} />
                {fav ? 'Favoride' : 'Favorilere Ekle'}
              </button>
              <button className="inline-flex items-center gap-2 px-2.5 py-1.5 text-sm rounded border bg-white text-gray-700" onClick={()=>navigate(`/store/${encodeURIComponent(product.sellerId)}`)}> 
                <Store className="h-4 w-4" /> Mağazaya Git
              </button>
              <button className="inline-flex items-center gap-2 px-2.5 py-1.5 text-sm rounded border bg-white text-gray-700" onClick={()=>setIsMessageOpen(true)}>
                <MessageCircle className="h-4 w-4" /> Satıcıya Sor
              </button>
              <button className={`inline-flex items-center gap-2 px-2.5 py-1.5 text-sm rounded border ${following? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700'}`} onClick={handleToggleFollow}>
                {following ? 'Takiptesin' : 'Satıcıyı Takip Et'}
              </button>
            </div>

            {/* Specs grid */}
            {product.specs && product.specs.length > 0 && (
              <div className="mt-8">
                <div className="font-semibold mb-3">Ürün Özellikleri</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.specs.map((s, i) => (
                    <div key={i} className="p-3 rounded border bg-white">
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="font-medium">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            {product.highlights && product.highlights.length > 0 && (
              <div className="mt-8">
                <div className="font-semibold mb-3">Öne Çıkan Özellikler</div>
                <ul className="space-y-2 list-disc pl-5 text-sm text-gray-800">
                  {product.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimers */}
            <div className="mt-6 space-y-2 text-xs text-muted-foreground">
              <div>Bu ürün {product.sellerName} tarafından satılmaktadır.</div>
              <div>Kampanya fiyatı stoklarla sınırlıdır.</div>
              {product.disclaimers && product.disclaimers.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>

            <div className="mt-8 p-4 border rounded-md bg-white">
              <div className="font-semibold mb-1">Satıcı</div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div>{product.sellerName}</div>
                  <div className="text-muted-foreground">İlan tarihi: {new Date(product.createdAt).toLocaleDateString('tr-TR')}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Teslimat</div>
                  <div className="font-medium">{product.deliveryType === 'shipping' ? 'Kargo' : product.deliveryType === 'pickup' ? 'Elden Teslim' : 'Kargo/Elden'}</div>
                </div>
              </div>
            </div>
          </div>
          {/* Campaign banner kaldırıldı */}

          {/* Other sellers */}
          {product.otherSellers && product.otherSellers.length > 0 && (
            <div className="mt-8">
              <div className="text-lg font-bold mb-3">Diğer Satıcılar</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {product.otherSellers.map((s, i) => (
                  <div key={i} className="p-4 border rounded bg-white flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.sellerName}</div>
                      <div className="text-sm text-muted-foreground">{s.shipping || 'Kargo/Elden'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-700">{DataManager.formatPrice(s.price)}</div>
                      <div className="text-xs text-muted-foreground">Stok: {s.stock ?? '-'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {product.reviews && product.reviews.length > 0 && (
            <div className="mt-10">
              <div className="text-lg font-bold mb-3">Kullanıcı Yorumları</div>
              <div className="space-y-3">
                {product.reviews.map((r, i) => (
                  <div key={i} className="p-4 border rounded bg-white">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.userName}</div>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{r.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    {r.date && <div className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString('tr-TR')}</div>}
                    <div className="mt-1 text-sm">{r.comment}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alt sekmeli içerik barı */}
          <div className="mt-12">
            <Tabs defaultValue="desc" className="w-full">
              <TabsList className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b w-full grid grid-cols-5">
                <TabsTrigger
                  value="desc"
                  className="px-2 py-3 text-sm sm:text-base font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent data-[state=active]:text-foreground data-[state=active]:border-orange-500 truncate justify-center"
                >
                  Ürün Açıklaması
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="px-2 py-3 text-sm sm:text-base font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent data-[state=active]:text-foreground data-[state=active]:border-orange-500 truncate justify-center"
                >
                  <span className="inline-flex items-center gap-2">
                    Değerlendirmeler
                    {reviewCount > 0 && (
                      <span className="ml-1 rounded-full bg-orange-500 text-white text-[11px] leading-none px-2 py-0.5">
                        {reviewCount.toLocaleString('tr-TR')}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="qa"
                  className="px-2 py-3 text-sm sm:text-base font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent data-[state=active]:text-foreground data-[state=active]:border-orange-500 truncate justify-center"
                >
                  <span className="inline-flex items-center gap-2">
                    Soru Cevap
                    {qaCount > 0 && (
                      <span className="ml-1 rounded-full bg-orange-500 text-white text-[11px] leading-none px-2 py-0.5">
                        {qaCount.toLocaleString('tr-TR')}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="installments"
                  className="px-2 py-3 text-sm sm:text-base font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent data-[state=active]:text-foreground data-[state=active]:border-orange-500 truncate justify-center"
                >
                  Kredi Kart Taksitleri
                </TabsTrigger>
                <TabsTrigger
                  value="returns"
                  className="px-2 py-3 text-sm sm:text-base font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent data-[state=active]:text-foreground data-[state=active]:border-orange-500 truncate justify-center"
                >
                  İptal ve İade Koşulları
                </TabsTrigger>
              </TabsList>

              <TabsContent value="desc" className="pt-4">
                <Card>
                  <CardContent className="p-4">
                    {!showFullDesc ? (
                      <div className="relative">
                        <div className="prose prose-sm max-w-none text-gray-800">
                          {truncatePlainText(product.description, 300)}
                        </div>
                        {product.description && product.description.length > 300 && (
                          <div className="mt-3 flex justify-end">
                            <button className="text-blue-600 hover:underline text-sm" onClick={()=>setShowFullDesc(true)}>
                              Daha fazla göster
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="prose max-w-none text-gray-800">
                          {renderSanitizedHtml(product.description)}
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button className="text-blue-600 hover:underline text-sm" onClick={()=>setShowFullDesc(false)}>
                            Daha az göster
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="pt-4">
                <Card>
                  <CardContent className="p-4">
                    {product.reviews && product.reviews.length > 0 ? (
                      <div className="space-y-3">
                        {product.reviews.map((r, i) => (
                          <div key={i} className="p-4 border rounded bg-white">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{r.userName}</div>
                              <div className="flex items-center gap-1 text-sm">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-medium">{r.rating.toFixed(1)}</span>
                              </div>
                            </div>
                            {r.date && <div className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString('tr-TR')}</div>}
                            <div className="mt-1 text-sm">{r.comment}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Henüz değerlendirme yok.</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="qa" className="pt-4">
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-60" />
                    <div className="text-sm">Soru-Cevap yakında burada olacak. Satıcıya soru sormak için üstteki “Satıcıya Sor” butonunu kullanabilirsiniz.</div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="installments" className="pt-4">
                {renderInstallments(product.price)}
              </TabsContent>

              <TabsContent value="returns" className="pt-4">
                {renderReturnPolicy()}
              </TabsContent>
            </Tabs>
          </div>

          {/* Mesaj Modal */}
          <MessageModal
            isOpen={isMessageOpen}
            onClose={()=>setIsMessageOpen(false)}
            recipientId={product.sellerId}
            recipientName={product.sellerName}
            listingTitle={product.title}
            listingId={product.id}
          />
        </div>
      </div>
    </div>
  );
}

function renderInstallments(price: number) {
  const plans = [3, 6, 9, 12];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {plans.map((m) => {
        const monthly = Math.ceil(price / m);
        const total = monthly * m;
        return (
          <div key={m} className="p-4 border rounded bg-white">
            <div className="text-xs text-muted-foreground">{m} Ay</div>
            <div className="text-lg font-bold">{DataManager.formatPrice(monthly)}</div>
            <div className="text-xs text-muted-foreground">Toplam: {DataManager.formatPrice(total)}</div>
          </div>
        );
      })}
      <div className="md:col-span-4 text-xs text-muted-foreground">Taksit tutarları bilgilendirme amaçlıdır, bankanıza göre değişebilir.</div>
    </div>
  );
}

function renderReturnPolicy() {
  const items = [
    'Teslimattan itibaren 14 gün içinde iade mümkündür.',
    'Ürün orijinal kutusu, aksesuarları ve faturasıyla gönderilmelidir.',
    'Kozmetik ve kişisel kullanım ürünlerinde ambalaj açılmışsa iade kabul edilmez.',
    'Ayıplı ürünlerde kargo ücreti satıcıya aittir.',
  ];
  return (
    <div className="text-sm">
      <ul className="list-disc pl-5 space-y-1">
        {items.map((it, i) => (<li key={i}>{it}</li>))}
      </ul>
      <div className="text-xs text-muted-foreground mt-2">İade süreçleri mevzuata ve mağaza politikasına göre değişebilir.</div>
    </div>
  );
}

// Basit truncation: HTML içeriği bozulmasın diye plain-text fallback ile kısaltıyoruz
function truncatePlainText(input: string, maxLen: number): string {
  if (!input) return '';
  const plain = stripHtml(input);
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen).trimEnd() + '…';
}

function stripHtml(html: string): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// DOMPurify kullanımını bir yardımcıya soyutlayalım (bağımlılığı birazdan ekleyeceğiz)
function renderSanitizedHtml(html: string) {
  try {
    const sanitized = window.DOMPurify?.sanitize ? window.DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }) : html;
    return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
  } catch {
    return <div>{stripHtml(html)}</div>;
  }
}

declare global {
  interface Window {
    DOMPurify?: { sanitize: (html: string, options?: unknown) => string };
  }
}
