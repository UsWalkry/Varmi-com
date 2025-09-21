import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DataManager, Listing, categories, cities } from '@/lib/mockData';
import Header from '@/components/Header';
import { toast } from 'sonner';

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    budgetMin: '',
    budgetMax: '',
    city: '',
    category: '',
    condition: 'new',
    deliveryType: 'shipping',
  });

  useEffect(() => {
    if (id) {
      const found = DataManager.getListings().find(l => l.id === id);
      if (found) {
        setListing(found);
        setForm({
          title: found.title,
          description: found.description,
          budgetMin: found.budgetMin.toString(),
          budgetMax: found.budgetMax.toString(),
          city: found.city,
          category: found.category,
          condition: found.condition,
          deliveryType: found.deliveryType,
        });
      }
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!listing) return;
    DataManager.updateListing(listing.id, {
      title: form.title,
      description: form.description,
      budgetMin: parseInt(form.budgetMin),
      budgetMax: parseInt(form.budgetMax),
      city: form.city,
      category: form.category,
      condition: form.condition as 'new' | 'used' | 'any',
      deliveryType: form.deliveryType as 'shipping' | 'pickup' | 'both',
    });
    toast.success('İlan başarıyla güncellendi!');
    navigate(`/listing/${listing.id}`);
  };

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>İlan yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>İlanı Düzenle</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">Başlık</label>
                <Input name="title" value={form.title} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Açıklama</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="w-full border rounded-md p-2" required />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min. Bütçe</label>
                  <Input name="budgetMin" value={form.budgetMin} onChange={handleChange} type="number" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max. Bütçe</label>
                  <Input name="budgetMax" value={form.budgetMax} onChange={handleChange} type="number" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Şehir</label>
                  <Select value={form.city} onValueChange={value => setForm(f => ({ ...f, city: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Şehir seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kategori</label>
                  <Select value={form.category} onValueChange={value => setForm(f => ({ ...f, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Durum</label>
                  <select name="condition" value={form.condition} onChange={handleChange} className="w-full border rounded-md p-2">
                    <option value="new">Sıfır</option>
                    <option value="used">2. El</option>
                    <option value="any">Farketmez</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Teslimat</label>
                  <select name="deliveryType" value={form.deliveryType} onChange={handleChange} className="w-full border rounded-md p-2">
                    <option value="shipping">Kargo</option>
                    <option value="pickup">Elden Teslim</option>
                    <option value="both">Kargo/Elden</option>
                  </select>
                </div>
              </div>
              <Button type="button" className="w-full mt-4" onClick={handleSave}>
                Kaydet
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
