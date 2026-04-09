import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle, X, Send, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth-mysql";
import { useNavigate } from "react-router-dom";

export function SupportChat() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    subject: "",
    message: "",
  });

  // Kullanıcı bilgilerini otomatik doldur
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user]);

  const categories = [
    { value: "genel", label: "Genel Soru" },
    { value: "teknik", label: "Teknik Destek" },
    { value: "siparis", label: "Sipariş & Teslimat" },
    { value: "odeme", label: "Ödeme & Fattura" },
    { value: "hesap", label: "Hesap & Güvenlik" },
    { value: "oneri", label: "Öneri & Şikayet" },
  ];

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Lütfen tüm zorunlu alanları doldurunuz");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          "Talebiniz başarıyla gönderildi! En kısa sürede size dönüş yapılacaktır.",
          { duration: 5000 }
        );
        
        // Form'u sıfırla
        setFormData({
          name: "",
          email: "",
          phone: "",
          category: "",
          subject: "",
          message: "",
        });
        
        setIsOpen(false);
        setIsMinimized(true);
      } else {
        toast.error(data.error || "Bir hata oluştu. Lütfen tekrar deneyiniz.");
      }
    } catch (error) {
      console.error("Support request error:", error);
      toast.error("Bağlantı hatası. Lütfen internet bağlantınızı kontrol ediniz.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = () => {
    if (!user) {
      // Giriş yapmamış kullanıcıya login prompt göster
      setShowLoginPrompt(true);
      return;
    }

    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(true);
    }
  };

  // Yükleme sırasında hiçbir şey gösterme
  if (loading) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {!isMinimized && (
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-sm animate-in slide-in-from-bottom-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">👋 Merhaba!</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Size nasıl yardımcı olabiliriz?
                </p>
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Sorularınız için profesyonel destek ekibimiz 7/24 hizmetinizdedir.
            </p>
            <Button
              onClick={() => {
                if (!user) {
                  setShowLoginPrompt(true);
                  return;
                }
                setIsOpen(true);
                setIsMinimized(true);
              }}
              className="w-full bg-primary hover:bg-primary/90"
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Destek Talebi Oluştur
            </Button>
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 text-white rounded-2xl px-4 py-3 shadow-lg text-sm font-medium whitespace-nowrap">
            Var mıı? Asistan'a sor
          </div>
          <button
            onClick={handleButtonClick}
            className="bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 hover:from-orange-600 hover:via-amber-300 hover:to-yellow-200 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110 group relative"
            aria-label="Asistana Sor"
          >
            <MessageCircle className="h-7 w-7 group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

      {/* Login Prompt Dialog */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              Asistan
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 via-orange-600 to-green-500 flex items-center justify-center shadow-lg">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-base text-gray-700 leading-relaxed">
                <span className="font-bold bg-gradient-to-r from-purple-600 via-orange-600 to-green-500 bg-clip-text text-transparent">Var mıı?</span> Asistan'a hoş geldiniz. 👋 Asistan görüşmeleriniz kalite standartları gereği kayıt altına alınmaktadır. Kişisel verilerinizin işlenmesine yönelik detaylı bilgi için lütfen "İşlem Rehberi" sekmesi altındaki Aydınlatma Metnimizi inceleyiniz.
              </p>
              <p className="text-sm text-gray-600 font-medium">
                Bu işlemi yapabilmek için giriş yapmanız gerekmektedir.
              </p>
            </div>

            <Button
              onClick={() => {
                setShowLoginPrompt(false);
                navigate("/?login=true");
              }}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-900 font-semibold"
              size="lg"
            >
              Giriş Yap
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Support Form Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">
              🎯 Destek Talebi
            </DialogTitle>
            <DialogDescription className="text-base">
              Sorularınız ve talepleriniz için profesyonel destek ekibimiz size yardımcı olmaktan mutluluk duyar.
              <strong className="block mt-2 text-gray-700">
                Genellikle 24 saat içinde size dönüş yapıyoruz.
              </strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">
                  Ad Soyad <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  required
                  disabled={isLoading}
                  readOnly={!!user}
                  className={user ? "bg-gray-50" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  E-posta <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="ornek@email.com"
                  required
                  disabled={isLoading}
                  readOnly={!!user}
                  className={user ? "bg-gray-50" : ""}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">
                  Telefon
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="0555 123 45 67"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-semibold">
                  Kategori
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange("category", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-semibold">
                Konu
              </Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                placeholder="Kısaca konuyu belirtiniz"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-semibold">
                Mesajınız <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleChange("message", e.target.value)}
                placeholder="Detaylı olarak sorunuzu veya talebinizi yazınız..."
                rows={6}
                required
                disabled={isLoading}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Minimum 10 karakter gereklidir
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                <strong>💡 İpucu:</strong> Ne kadar detaylı bilgi verirseniz, size o kadar hızlı ve doğru yardım edebiliriz.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Gönder
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
