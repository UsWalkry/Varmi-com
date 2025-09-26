import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, ShoppingCart, Heart, MapPin } from 'lucide-react';
import { DataManager, Product } from '@/lib/mockData';

interface Props {
  product: Product;
  onClick?: () => void;
  onBuy?: () => void;
}

export default function ProductCard({ product, onClick, onBuy }: Props) {
  const rating = Math.max(0, Math.min(5, Math.round((product.rating ?? 0) * 10) / 10));
  const ratingCount = product.ratingCount ?? 0;
  const inCarts = product.inCartsCount ?? 0;

  return (
    <Card className="group hover:shadow-xl transition-all cursor-pointer border border-gray-100" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="relative">
          {/* Best seller badge */}
          {product.isBestSeller && (
            <div className="absolute -left-2 -top-2 z-10">
              <Badge className="rounded-full bg-orange-400 text-white shadow-md">EN ÇOK SATAN</Badge>
            </div>
          )}
          <div className="aspect-[4/3] bg-muted rounded-md overflow-hidden">
            {product.images?.[0] && (
              <img src={product.images[0]} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            )}
          </div>
          {/* Vertical label */}
          {product.verticalLabel && (
            <div className="absolute right-2 top-2 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
              {product.verticalLabel}
            </div>
          )}
          {/* Favorite outline (görsel amaçlı) */}
          <button
            type="button"
            className="absolute right-2 bottom-2 bg-white/80 backdrop-blur-sm rounded-full p-1 hover:bg-white"
            aria-label="Favori"
            onClick={(e)=>{ e.stopPropagation(); }}
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardTitle className="text-base mb-1 line-clamp-2 text-gray-900">{product.title}</CardTitle>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-1"><MapPin className="h-3 w-3"/>{product.city}</div>
          {ratingCount > 0 && (
            <div className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{rating.toFixed(1)}</span>
              <span className="text-gray-400">({ratingCount.toLocaleString('tr-TR')})</span>
            </div>
          )}
        </div>
        {product.promoText && (
          <div className="text-orange-600 text-xs font-semibold mb-1">{product.promoText}</div>
        )}
        <div className="flex items-end gap-2">
          <div className="text-lg font-extrabold text-green-700">{DataManager.formatPrice(product.price)}</div>
          {product.oldPrice && product.oldPrice > product.price && (
            <div className="text-sm text-gray-400 line-through">{DataManager.formatPrice(product.oldPrice)}</div>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="text-gray-500 inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {ratingCount > 0 ? (
              <span>{rating.toFixed(1)} ({ratingCount.toLocaleString('tr-TR')})</span>
            ) : (
              <span>Henüz değerlendirme yok</span>
            )}
          </div>
          <div className="text-gray-500">{product.stock > 0 ? `Stok: ${product.stock}` : 'Tükendi'}</div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button className="flex-1" variant="secondary" onClick={(e)=>{ e.stopPropagation(); onBuy?.(); }}>
            <ShoppingCart className="h-4 w-4 mr-1"/> Satın Al
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
