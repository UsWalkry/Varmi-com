import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { mysqlAPI } from '@/lib/mysql-api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth-mysql';

interface CartItem {
  cart_item_id: string;
  cart_id: string;
  quantity: number;
  added_at: string;
  user_id: string;
  listing_id: string;
  listing_title: string;
  listing_images: string | string[];
  listing_city: string;
  listing_category: string;
  offer_id: string;
  offer_amount: number;
  offer_product_name: string;
  offer_images: string | string[];
  seller_id: string;
  seller_name: string;
  seller_email: string;
  delivery_type: string;
  shipping_cost: number;
  offer_description: string;
  subtotal: number;
  total_with_shipping: number;
}

interface CartSummary {
  itemCount: number;
  subtotal: string;
  shipping: string;
  total: string;
}

interface Cart {
  id: string;
  items: CartItem[];
  summary: CartSummary;
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  addToCart: (listingId: string, quantity?: number, offerId?: string) => Promise<boolean>;
  removeFromCart: (cartItemId: string) => Promise<boolean>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  checkout: () => Promise<string[] | null>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const refreshCart = useCallback(async () => {
    // Giriş yapmamış kullanıcılar için sepet çağrısı yapma
    const token = localStorage.getItem('mysql-auth-token');
    if (!token) {
      setCart(null);
      return;
    }
    try {
      setLoading(true);
      const response = await mysqlAPI.get('/cart');
      
      if (response.success && response.cart) {
        setCart(response.cart);
      } else {
        setCart(null);
      }
    } catch (error) {
      console.error('Cart refresh error:', error);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (listingId: string, quantity: number = 1, offerId?: string): Promise<boolean> => {
    try {
      const payload: any = { listingId, quantity };
      if (offerId) {
        payload.offerId = offerId;
      }
      
      const response = await mysqlAPI.post('/cart/add', payload);
      
      if (response.success) {
        toast.success(response.message || 'Ürün sepete eklendi');
        await refreshCart();
        return true;
      } else {
        toast.error(response.message || 'Sepete eklenemedi');
        return false;
      }
    } catch (error: any) {
      console.error('Add to cart error:', error);
      toast.error(error.message || 'Sepete eklenirken hata oluştu');
      return false;
    }
  }, [refreshCart]);

  const removeFromCart = useCallback(async (cartItemId: string): Promise<boolean> => {
    try {
      const response = await mysqlAPI.delete(`/cart/item/${cartItemId}`);
      
      if (response.success) {
        toast.success('Ürün sepetten çıkarıldı');
        await refreshCart();
        return true;
      } else {
        toast.error('Sepetten çıkarılamadı');
        return false;
      }
    } catch (error) {
      console.error('Remove from cart error:', error);
      toast.error('Sepetten çıkarılırken hata oluştu');
      return false;
    }
  }, [refreshCart]);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number): Promise<boolean> => {
    try {
      const response = await mysqlAPI.put(`/cart/item/${cartItemId}`, { quantity });
      
      if (response.success) {
        await refreshCart();
        return true;
      } else {
        toast.error('Miktar güncellenemedi');
        return false;
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      toast.error('Miktar güncellenirken hata oluştu');
      return false;
    }
  }, [refreshCart]);

  const clearCart = useCallback(async (): Promise<boolean> => {
    try {
      const response = await mysqlAPI.delete('/cart/clear');
      
      if (response.success) {
        toast.success('Sepet temizlendi');
        setCart(null);
        return true;
      } else {
        toast.error('Sepet temizlenemedi');
        return false;
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      toast.error('Sepet temizlenirken hata oluştu');
      return false;
    }
  }, []);

  const checkout = useCallback(async (): Promise<string[] | null> => {
    try {
      const response = await mysqlAPI.post('/cart/checkout', {});
      
      if (response.success) {
        toast.success('Sipariş başarıyla oluşturuldu!');
        setCart(null);
        return response.orderIds || [];
      } else {
        toast.error(response.message || 'Sipariş oluşturulamadı');
        return null;
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Sipariş oluşturulurken hata oluştu');
      return null;
    }
  }, []);

  useEffect(() => {
    // Kullanıcı giriş yapmışsa sepeti getir, çıkmışsa sıfırla
    if (user) {
      refreshCart();
    } else {
      setCart(null);
    }
  }, [user, refreshCart]);

  const itemCount = cart?.summary?.itemCount || 0;

  const contextValue = useMemo(() => ({
    cart,
    loading,
    itemCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    checkout,
    refreshCart
  }), [cart, loading, itemCount, addToCart, removeFromCart, updateQuantity, clearCart, checkout, refreshCart]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
