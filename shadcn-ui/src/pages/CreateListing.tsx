import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Package, MapPin, CreditCard, Clock, Info } from 'lucide-react';
import { DataManager, categories, cities } from '@/lib/mockData';
import { toast } from 'sonner';

export default function CreateListing() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budgetMin: '',
    budgetMax: '',
    condition: 'any',
    city: '',
    deliveryType: 'both',
    acceptsUsed: true,
    acceptsNew: true,
    urgentNeed: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = DataManager.getCurrentUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('İlan vermek için giriş yapmalısınız');
      return;
    }

    const budgetMin = parseFloat(formData.budgetMin);
    const budgetMax = parseFloat(formData.budgetMax);

    if (!formData.title.trim()) {
      toast.error('İlan başlığı gereklidir');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('İlan açıklaması gereklidir');
      return;
    }

    if (!formData.category) {
      toast.error('Kategori seçimi gereklidir');
      return;
    }

    if (!formData.city) {
      toast.error('Şehir seçimi gereklidir');
      return;
    }

    if (!budgetMin || !budgetMax || budgetMin <= 0 || budgetMax <= 0) {
      toast.error('Geçerli bir bütçe aralığı giriniz');
      return;
    }

    if (budgetMin >= budgetMax) {
      toast.error('Maksimum bütçe minimum bütçeden büyük olmalıdır');
      return;
    }

    setIsSubmitting(true);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 gün geçerli

      const condition = formData.acceptsNew && formData.acceptsUsed 
        ? 'any' 
        : formData.acceptsNew 
          ? 'new' 
          : 'used';

      const newListing = DataManager.addListing({
        buyerId: currentUser.id,
        buyerName: currentUser.name,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budgetMin,
        budgetMax,
        condition: condition as 'new' | 'used' | 'any',
        city: formData.city,
        deliveryType: formData.deliveryType as 'shipping' | 'pickup' | 'both',
        status: 'active',
        expiresAt: expiresAt.toISOString()
      });

      toast.success('İlanınız başarıyla oluşturuldu!');
      navigate(`/listing/${newListing.id}`);
    } catch (error) {
      toast.error('İlan oluşturulurken bir hata oluştu');
      console.error('Error creating listing:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
        toast.error('Lütfen tüm gerekli alanları doldurun');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const steps = [
    { number: 1, title: 'Ürün Bilgileri', icon: Package },
    { number: 2, title: 'Konum & Teslimat', icon: MapPin },
    { number: 3, title: 'Bütçe & Öncelikler', icon: CreditCard }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ana Sayfaya Dön
            </Button>
            <h1 className="text-xl font-bold text-blue-600">İhtiyaç İlanı Ver</h1>
            <div></div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isActive 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      Adım {step.number}
                    </p>
                    <p className={`text-xs ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Product Information */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Ne Arıyorsunuz?
                </CardTitle>
                <p className="text-muted-foreground">
                  İhtiyacınızı detaylı bir şekilde açıklayın. Bu bilgiler satıcıların size doğru teklifleri vermesine yardımcı olacak.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="title">İlan Başlığı *</Label>
                  <Input
                    id="title"
                    placeholder="Örn: iPhone 15 Pro Max Aranıyor"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    maxLength={100}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.title.length}/100 karakter
                  </p>
                </div>

                <div>
                  <Label htmlFor="category">Kategori *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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

                <div>
                  <Label htmlFor="description">Detaylı Açıklama *</Label>
                  <Textarea
                    id="description"
                    placeholder="Aradığınız ürünün özelliklerini, tercih ettiğiniz markaları, durumunu ve diğer önemli detayları yazın..."
                    rows={6}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    maxLength={1000}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.description.length}/1000 karakter
                  </p>
                </div>

                <div>
                  <Label className="text-base font-medium">Ürün Durumu Tercihi</Label>
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="acceptsNew"
                        checked={formData.acceptsNew}
                        onCheckedChange={(checked) => setFormData({ ...formData, acceptsNew: !!checked })}
                      />
                      <Label htmlFor="acceptsNew">Sıfır ürün kabul ederim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="acceptsUsed"
                        checked={formData.acceptsUsed}
                        onCheckedChange={(checked) => setFormData({ ...formData, acceptsUsed: !!checked })}
                      />
                      <Label htmlFor="acceptsUsed">2. el ürün kabul ederim</Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={nextStep}>
                    Devam Et
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Location & Delivery */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Konum & Teslimat
                </CardTitle>
                <p className="text-muted-foreground">
                  Bulunduğunuz şehir ve teslimat tercihlerinizi belirtin.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="city">Şehir *</Label>
                  <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })}>
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
                  <Label className="text-base font-medium">Teslimat Tercihi</Label>
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="shipping"
                        name="deliveryType"
                        value="shipping"
                        checked={formData.deliveryType === 'shipping'}
                        onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                      />
                      <Label htmlFor="shipping">Sadece kargo ile teslimat</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="pickup"
                        name="deliveryType"
                        value="pickup"
                        checked={formData.deliveryType === 'pickup'}
                        onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                      />
                      <Label htmlFor="pickup">Sadece elden teslim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="both"
                        name="deliveryType"
                        value="both"
                        checked={formData.deliveryType === 'both'}
                        onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                      />
                      <Label htmlFor="both">Her ikisi de olabilir</Label>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">İpucu</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        "Her ikisi de olabilir" seçeneği daha fazla satıcının size teklif vermesini sağlar.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Geri
                  </Button>
                  <Button type="button" onClick={nextStep}>
                    Devam Et
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Budget & Priorities */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Bütçe & Öncelikler
                </CardTitle>
                <p className="text-muted-foreground">
                  Bütçe aralığınızı belirleyin ve ilanınızı tamamlayın.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budgetMin">Minimum Bütçe (TL) *</Label>
                    <Input
                      id="budgetMin"
                      type="number"
                      placeholder="0"
                      min="1"
                      step="0.01"
                      value={formData.budgetMin}
                      onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="budgetMax">Maksimum Bütçe (TL) *</Label>
                    <Input
                      id="budgetMax"
                      type="number"
                      placeholder="0"
                      min="1"
                      step="0.01"
                      value={formData.budgetMax}
                      onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {formData.budgetMin && formData.budgetMax && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-700">
                      Bütçe aralığınız: <span className="font-semibold">
                        {DataManager.formatPrice(parseFloat(formData.budgetMin))} - {DataManager.formatPrice(parseFloat(formData.budgetMax))}
                      </span>
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="urgentNeed"
                      checked={formData.urgentNeed}
                      onCheckedChange={(checked) => setFormData({ ...formData, urgentNeed: !!checked })}
                    />
                    <Label htmlFor="urgentNeed" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Acil ihtiyaç (İlanınız öne çıkarılır)
                    </Label>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Önemli Bilgiler</h4>
                      <ul className="text-sm text-yellow-800 mt-1 space-y-1">
                        <li>• İlanınız 30 gün boyunca aktif kalacak</li>
                        <li>• Satıcılar size teklif verecek, siz en uygununu seçeceksiniz</li>
                        <li>• İlan vermek tamamen ücretsizdir</li>
                        <li>• İstediğiniz zaman ilanınızı düzenleyebilir veya kapatabilirsiniz</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Geri
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'İlan Oluşturuluyor...' : 'İlanı Yayınla'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  );
}