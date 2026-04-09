import React from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const Cart: React.FC = () => {
  const { cart, loading, removeFromCart, updateQuantity, clearCart, checkout } = useCart();
  const navigate = useNavigate();

  const getMainImage = (images: string | string[]): string => {
    if (!images) return '/placeholder-image.jpg';
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : images;
      } catch {
        return images;
      }
    }
    return Array.isArray(images) && images.length > 0 ? images[0] : '/placeholder-image.jpg';
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) return;
    
    const orderIds = await checkout();
    if (orderIds && orderIds.length > 0) {
      navigate('/dashboard?tab=siparislerim');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center py-16">
          <ShoppingCart className="w-24 h-24 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sepetiniz Boş</h2>
          <p className="text-gray-600 mb-6">Henüz sepetinize ürün eklemediniz</p>
          <Button onClick={() => navigate('/')} className="bg-orange-600 hover:bg-orange-700">
            Alışverişe Başla
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="w-8 h-8" />
          Sepetim
        </h1>
        <Button 
          variant="ghost" 
          onClick={clearCart}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Sepeti Temizle
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            const mainImage = getMainImage(item.listing_images);
            
            return (
              <Card key={item.cart_item_id} className="p-4">
                <div className="flex gap-4">
                  {/* Image */}
                  <img
                    src={mainImage}
                    alt={item.listing_title}
                    className="w-24 h-24 object-cover rounded-lg"
                  />

                  {/* Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {item.listing_title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {item.offer_product_name}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {item.listing_category}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {item.listing_city}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Satıcı: {item.seller_name}
                    </p>
                  </div>

                  {/* Price & Actions */}
                  <div className="flex flex-col items-end justify-between">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600">
                        ₺{item.offer_amount.toLocaleString('tr-TR')}
                      </p>
                      {item.shipping_cost > 0 && (
                        <p className="text-xs text-gray-500">
                          + ₺{item.shipping_cost.toLocaleString('tr-TR')} kargo
                        </p>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.cart_item_id, item.quantity - 1);
                          } else {
                            removeFromCart(item.cart_item_id);
                          }
                        }}
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                      </Button>
                      <span className="font-semibold min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(item.cart_item_id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-2"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Kaldır
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Sipariş Özeti
            </h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Ürün Toplamı:</span>
                <span>₺{parseFloat(cart.summary.subtotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Kargo:</span>
                <span>₺{parseFloat(cart.summary.shipping).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Toplam:</span>
                  <span className="text-orange-600">
                    ₺{parseFloat(cart.summary.total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleCheckout}
              className="w-full bg-orange-600 hover:bg-orange-700 text-lg py-6"
            >
              Siparişi Tamamla
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <div className="mt-4 text-xs text-gray-500 text-center">
              <p>Güvenli ödeme</p>
              <p className="mt-1">{cart.summary.itemCount} ürün</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Cart;
