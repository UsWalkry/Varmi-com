import Header from '@/components/Header';
import { DataManager, Product } from '@/lib/mockData';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import ProductCard from '@/components/ProductCard';

export default function Store() {
  const { id } = useParams();
  const navigate = useNavigate();
  const all = DataManager.getProducts();
  const products = useMemo(() => all.filter(p => p.sellerId === id), [all, id]);
  const sellerName = products[0]?.sellerName || 'Satıcı';
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{sellerName} Mağazası</h1>
          <button className="text-sm text-muted-foreground" onClick={()=>navigate(-1)}>Geri</button>
        </div>
        {products.length === 0 ? (
          <div className="text-muted-foreground">Bu mağazada ürün bulunamadı.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => (
              <ProductCard key={p.id} product={p} onClick={()=>navigate(`/product/${p.id}`)} onBuy={()=>{}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
