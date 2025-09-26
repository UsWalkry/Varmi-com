import Header from '@/components/Header';
import { DataManager } from '@/lib/mockData';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Cart() {
  const navigate = useNavigate();
  const user = DataManager.getCurrentUser();
  const [items, setItems] = useState(DataManager.getCart(user?.id || ''));

  useEffect(() => {
    const handler = () => setItems(DataManager.getCart(user?.id || ''));
    window.addEventListener('cart-updated', handler);
    return () => window.removeEventListener('cart-updated', handler);
  }, [user?.id]);

  const detailed = useMemo(() => items.map(i => ({
    ...i,
    product: DataManager.getProduct(i.productId)!
  })).filter(x => !!x.product), [items]);

  const total = detailed.reduce((sum, x) => sum + (x.product?.price || 0) * x.quantity, 0);

  const updateQty = (pid: string, q: number) => {
    if (!user) { navigate('/profile'); return; }
    DataManager.updateCartItem(user.id, pid, q);
    setItems(DataManager.getCart(user.id));
  };

  const removeItem = (pid: string) => {
    if (!user) { navigate('/profile'); return; }
    DataManager.removeFromCart(user.id, pid);
    setItems(DataManager.getCart(user.id));
  };

  const checkout = () => {
    if (!user) { navigate('/profile'); return; }
    // Basitçe mevcut tüm ürünleri 1-1 satın almayı dene
    detailed.forEach(x => {
      try { DataManager.purchaseProduct(x.product.id, user.id, user.name, x.quantity); } catch (e) {
        // stok yetersiz vb. durumlarda yoksay
      }
    });
    DataManager.clearCart(user.id);
    setItems([]);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold mb-4">Alışveriş Sepeti</h1>
        {detailed.length === 0 ? (
          <div className="text-muted-foreground">Sepetiniz boş.</div>
        ) : (
          <div className="space-y-3">
            {detailed.map(x => (
              <div key={x.productId} className="flex items-center justify-between p-3 border rounded bg-white">
                <div className="flex items-center gap-3">
                  <img src={x.product.images?.[0]} className="w-16 h-16 rounded object-cover" />
                  <div>
                    <div className="font-medium">{x.product.title}</div>
                    <div className="text-sm text-muted-foreground">{DataManager.formatPrice(x.product.price)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} className="w-16 border rounded px-2 py-1"
                    value={x.quantity}
                    onChange={(e)=>updateQty(x.productId, Math.max(1, Number(e.target.value)||1))}
                  />
                  <Button variant="outline" size="sm" onClick={()=>removeItem(x.productId)}>Kaldır</Button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 border rounded bg-white">
              <div className="font-semibold">Toplam</div>
              <div className="text-lg">{DataManager.formatPrice(total)}</div>
            </div>
            <div className="flex justify-end">
              <Button onClick={checkout}>Satın Al</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
