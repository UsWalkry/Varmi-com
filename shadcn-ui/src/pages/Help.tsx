import { Link } from 'react-router-dom';
import { HelpCircle, Search, ShoppingBag, Package, CreditCard, Shield, Users, MessageCircle, ChevronDown, Mail } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const categories = [
    {
      id: 'getting-started',
      icon: Users,
      title: 'Başlangıç',
      color: 'blue',
      faqs: [
        {
          question: 'Varmii.com nedir?',
          answer: 'Varmii.com, kullanıcıların aradıkları ürünler için ilan oluşturduğu ve satıcıların bu ilanlar için teklif sunduğu yenilikçi bir e-ticaret platformudur. Geleneksel alışverişten farklı olarak, alıcılar ne istediklerini belirtir ve satıcılar rekabetçi teklifler sunar.'
        },
        {
          question: 'Nasıl üye olurum?',
          answer: 'Ana sayfada sağ üst köşedeki "Kayıt Ol" butonuna tıklayın. E-posta adresiniz, şifreniz ve temel bilgilerinizi girerek üyeliğinizi tamamlayabilirsiniz. Üyelik tamamen ücretsizdir.'
        },
        {
          question: 'Üyelik ücreti var mı?',
          answer: 'Hayır, Varmii.com üyeliği tamamen ücretsizdir. İlan oluşturmak ve teklif vermek için herhangi bir ücret ödemenize gerek yoktur.'
        },
        {
          question: 'Hesabımı nasıl doğrularım?',
          answer: 'Kayıt olduktan sonra e-posta adresinize bir doğrulama linki gönderilir. Bu linke tıklayarak hesabınızı doğrulayabilirsiniz. Doğrulama işlemi, hesabınızın güvenliği için önemlidir.'
        }
      ]
    },
    {
      id: 'creating-listings',
      icon: ShoppingBag,
      title: 'İlan Oluşturma',
      color: 'green',
      faqs: [
        {
          question: 'Nasıl ilan oluştururum?',
          answer: 'Giriş yaptıktan sonra "İlan Ver" butonuna tıklayın. Aradığınız ürünün başlığını, kategorisini, durumunu (yeni/ikinci el), bütçenizi, şehrinizi, teslimat tercihlerinizi ve açıklamasını girin. İsterseniz fotoğraf da ekleyebilirsiniz.'
        },
        {
          question: 'İlan başlığı nasıl olmalı?',
          answer: 'İlan başlığı açık ve net olmalıdır. Ürün adını, markasını, modelini ve önemli özelliklerini içermelidir. Örnek: "iPhone 14 Pro 256GB Uzay Grisi" gibi.'
        },
        {
          question: 'Kaç adet fotoğraf ekleyebilirim?',
          answer: 'Her ilana en fazla 5 fotoğraf ekleyebilirsiniz. Fotoğraflar JPG, PNG veya WEBP formatında olmalı ve her biri maksimum 5MB boyutunda olmalıdır.'
        },
        {
          question: 'İlanım ne kadar süre yayında kalır?',
          answer: 'İlanlar varsayılan olarak 30 gün boyunca aktif kalır. Bu süre sonunda ilanınız otomatik olarak pasif hale gelir ancak yeniden aktif edebilirsiniz.'
        },
        {
          question: 'İlanımı düzenleyebilir miyim?',
          answer: 'Evet, "Profilim" > "İlanlarım" bölümünden ilanınızı düzenleyebilir, fotoğraf ekleyip çıkarabilir veya silebilirsiniz.'
        },
        {
          question: 'İlan onay süreci nasıl işler?',
          answer: 'Oluşturduğunuz ilanlar, yayınlanmadan önce moderatörlerimiz tarafından incelenir. Bu işlem genellikle 2-24 saat sürer. İlanınız onaylandığında e-posta ile bilgilendirilirsiniz.'
        }
      ]
    },
    {
      id: 'offers',
      icon: Package,
      title: 'Teklif Verme ve Alma',
      color: 'purple',
      faqs: [
        {
          question: 'Bir ilana nasıl teklif veririm?',
          answer: 'İlan detay sayfasında "Teklif Ver" butonuna tıklayın. Teklif tutarınızı girin ve isterseniz bir not ekleyin. Teklifiniz ilan sahibine iletilecektir.'
        },
        {
          question: 'Gelen teklifleri nasıl görüntülerim?',
          answer: 'Dashboard\'da "Aldıklarım" sekmesinde ilanlarınıza gelen tüm teklifleri görebilirsiniz. Her teklif için satıcı profili, tutar ve not bilgileri görüntülenir.'
        },
        {
          question: 'Bir teklifi nasıl kabul ederim?',
          answer: 'İlanınıza gelen teklifler listesinde istediğiniz teklifin yanındaki "Kabul Et" butonuna tıklayın. Teklif kabul edildiğinde otomatik olarak sipariş oluşturulur.'
        },
        {
          question: 'Teklifimi geri çekebilir miyim?',
          answer: 'Evet, henüz kabul edilmemiş teklifinizi "Verdiklerim" bölümünden geri çekebilirsiniz. Ancak kabul edilen teklifler geri alınamaz.'
        },
        {
          question: 'Aynı ilana birden fazla teklif verebilir miyim?',
          answer: 'Hayır, her ilana sadece bir teklif verebilirsiniz. Ancak mevcut teklifinizi iptal edip yeni bir teklif gönderebilirsiniz.'
        },
        {
          question: 'Teklif kabul edilince ne olur?',
          answer: 'Teklif kabul edildiğinde otomatik olarak bir sipariş oluşturulur. Alıcı ödeme yapması için bilgilendirilir. Satıcı ise ürünü hazırlamaya başlayabilir.'
        }
      ]
    },
    {
      id: 'orders',
      icon: CreditCard,
      title: 'Sipariş ve Ödeme',
      color: 'orange',
      faqs: [
        {
          question: 'Ödeme nasıl yapılır?',
          answer: 'Teklifiniz kabul edildiğinde "Öde" butonuna tıklayarak güvenli ödeme sayfasına yönlendirilirsiniz. Kredi kartı, banka kartı veya diğer ödeme yöntemlerini kullanabilirsiniz.'
        },
        {
          question: 'Hangi ödeme yöntemlerini kullanabilirim?',
          answer: 'Kredi kartı (Visa, Mastercard, American Express), banka kartı ve havale/EFT ile ödeme yapabilirsiniz. Tüm ödemeler güvenli ödeme altyapısı ile korunur.'
        },
        {
          question: 'Siparişimi iptal edebilir miyim?',
          answer: 'Evet, sipariş "Onaylandı" veya "Hazırlanıyor" durumundayken iptal edebilirsiniz. Ürün kargoya verildikten sonra iptal yerine iade işlemi yapmanız gerekir.'
        },
        {
          question: 'İptal işleminde param ne zaman iade edilir?',
          answer: 'İptal onaylandıktan sonra ödeme tutarı 5-10 iş günü içinde kredi kartınıza veya banka hesabınıza iade edilir.'
        },
        {
          question: 'Sipariş durumumu nasıl takip ederim?',
          answer: 'Dashboard\'da "Siparişlerim" bölümünden tüm siparişlerinizin durumunu görebilirsiniz. Sipariş onaylandı, hazırlanıyor, kargoda, teslim edildi gibi durumlar anlık olarak güncellenir.'
        },
        {
          question: 'Fatura alabilir miyim?',
          answer: 'Evet, her sipariş için e-fatura düzenlenir ve sipariş detay sayfasından indirebilirsiniz.'
        }
      ]
    },
    {
      id: 'shipping-delivery',
      icon: Package,
      title: 'Kargo ve Teslimat',
      color: 'indigo',
      faqs: [
        {
          question: 'Kargo ücreti kim öder?',
          answer: 'Kargo ücreti, ilan oluşturulurken belirlenen teslimat tercihine göre değişir. Bazı ilanlar kargo dahil olabilirken, bazılarında alıcı kargo ücretini karşılar.'
        },
        {
          question: 'Hangi kargo şirketleri kullanılıyor?',
          answer: 'Aras Kargo, Yurtiçi Kargo, MNG Kargo, PTT Kargo ve Sürat Kargo gibi anlaşmalı kargo firmalarımız bulunmaktadır. Satıcı uygun kargo şirketini seçer.'
        },
        {
          question: 'Kargo takip numaramı nasıl öğrenirim?',
          answer: 'Satıcı ürünü kargoya verdiğinde sipariş detaylarında kargo firması ve takip numarası görünür. Ayrıca e-posta ile de bilgilendirilirsiniz.'
        },
        {
          question: 'Teslimat süresi ne kadar?',
          answer: 'Teslimat süresi kargo firması ve bölgenize göre değişir ancak genellikle 2-5 iş günü arasındadır. Hızlı kargo seçenekleri de mevcuttur.'
        },
        {
          question: 'Elden teslim yapılabilir mi?',
          answer: 'Evet, ilan oluştururken "Elden Teslim" seçeneğini işaretlerseniz, alıcı ve satıcı karşılıklı anlaşarak elden teslimat yapabilir.'
        },
        {
          question: 'Kargo hasarlı gelirse ne yapmalıyım?',
          answer: 'Kargoyu teslim alırken hasar varsa tutanak tutturmalısınız. Ardından 24 saat içinde destek ekibimize fotoğraflarla birlikte bildirmelisiniz.'
        }
      ]
    },
    {
      id: 'returns',
      icon: Shield,
      title: 'İade ve İptal',
      color: 'red',
      faqs: [
        {
          question: 'İade şartları nelerdir?',
          answer: 'Ürün teslim edildikten sonra 14 gün içinde iade hakkınız vardır. Ürünün kullanılmamış ve orijinal ambalajında olması gerekir. İkinci el ürünlerde iade şartları satıcıya göre değişebilir.'
        },
        {
          question: 'İade talebini nasıl oluştururum?',
          answer: 'Siparişlerim sayfasında ilgili siparişin yanındaki "İade Et" butonuna tıklayın. İade nedeninizi seçin, açıklama yazın ve gerekirse ürün fotoğrafları ekleyin.'
        },
        {
          question: 'İade kargo ücreti kim öder?',
          answer: 'Ürün kusurlu veya hatalı ise iade kargo ücreti satıcı tarafından karşılanır. Cayma hakkı kullanımında ise kargo ücreti alıcıya aittir.'
        },
        {
          question: 'İade onay süresi ne kadar?',
          answer: 'İade talebiniz satıcı tarafından incelenir ve genellikle 2-3 iş günü içinde onaylanır veya reddedilir. Onay durumu e-posta ile bildirilir.'
        },
        {
          question: 'İade edilen ürünü nasıl gönderirim?',
          answer: 'İade talebiniz onaylandıktan sonra size iade kargo kodu gönderilir. Bu kod ile ürünü kargo şubesine teslim edebilirsiniz.'
        },
        {
          question: 'İade paramı ne zaman alırım?',
          answer: 'Ürün satıcıya ulaştıktan ve kontrol edildikten sonra 5-10 iş günü içinde ödeme tutarı hesabınıza iade edilir.'
        }
      ]
    },
    {
      id: 'security',
      icon: Shield,
      title: 'Güvenlik ve Gizlilik',
      color: 'yellow',
      faqs: [
        {
          question: 'Ödeme bilgilerim güvende mi?',
          answer: 'Evet, tüm ödeme işlemleri SSL sertifikası ile şifreli olarak gerçekleştirilir. Kredi kartı bilgileriniz sistemimizde saklanmaz, güvenli ödeme altyapımız tarafından korunur.'
        },
        {
          question: 'Kişisel bilgilerim paylaşılıyor mu?',
          answer: 'Hayır, kişisel bilgileriniz gizlilik politikamız çerçevesinde korunur ve üçüncü şahıslarla paylaşılmaz. Detaylı bilgi için Gizlilik Politikası sayfamızı inceleyebilirsiniz.'
        },
        {
          question: 'İki faktörlü kimlik doğrulama nedir?',
          answer: 'Hesabınıza ekstra güvenlik katmanı ekleyen bir özelliktir. Şifrenizin yanı sıra telefonunuza gelen kod veya authenticator uygulaması ile giriş yapmanızı sağlar.'
        },
        {
          question: 'Şifremi nasıl değiştirebilirim?',
          answer: 'Profil > Güvenlik Ayarları bölümünden mevcut şifrenizi girerek yeni şifrenizi belirleyebilirsiniz.'
        },
        {
          question: 'Şifremi unuttum, ne yapmalıyım?',
          answer: 'Giriş sayfasında "Şifremi Unuttum" linkine tıklayın. E-posta adresinizi girin, size gönderilen link ile şifrenizi sıfırlayabilirsiniz.'
        },
        {
          question: 'Hesabım çalındı, ne yapmalıyım?',
          answer: 'Hemen destek@varmii.com adresine e-posta gönderin. Hesabınız derhal askıya alınacak ve güvenlik ekibimiz sizinle iletişime geçecektir.'
        }
      ]
    },
    {
      id: 'account',
      icon: Users,
      title: 'Hesap Yönetimi',
      color: 'pink',
      faqs: [
        {
          question: 'Profil bilgilerimi nasıl güncellerim?',
          answer: 'Sağ üst köşedeki profil fotoğrafınıza tıklayın ve "Profil" seçeneğini seçin. Buradan adınız, soyadınız, telefon numaranız ve adres bilgilerinizi güncelleyebilirsiniz.'
        },
        {
          question: 'E-posta adresimi değiştirebilir miyim?',
          answer: 'Evet, Profil > Güvenlik Ayarları bölümünden e-posta adresinizi değiştirebilirsiniz. Yeni e-posta adresinize doğrulama linki gönderilecektir.'
        },
        {
          question: 'Hesabımı nasıl silebilirim?',
          answer: 'Hesap silme işlemi için destek@varmii.com adresine talepte bulunmanız gerekmektedir. Aktif siparişleriniz yoksa hesabınız 7 gün içinde silinir.'
        },
        {
          question: 'Bildirimleri nasıl yönetirim?',
          answer: 'Profil > Ayarlar bölümünden e-posta bildirimleri, SMS bildirimleri ve push bildirimleri için tercihlerinizi belirleyebilirsiniz.'
        },
        {
          question: 'Favori ilanlarımı nasıl görüntülerim?',
          answer: 'Dashboard\'da "Favorilerim" sekmesinde beğendiğiniz ve daha sonra bakmak için kaydettiğiniz tüm ilanları görebilirsiniz.'
        }
      ]
    }
  ];

  const filteredCategories = categories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <HelpCircle className="h-12 w-12 text-orange-600" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Yardım Merkezi
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Varmii.com kullanımı hakkında sık sorulan sorular ve cevapları
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 mt-4 font-medium"
            >
              ← Ana Sayfaya Dön
            </Link>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Sorunuzu veya konuyu arayın..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 py-6 text-lg"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            <Link
              to="/contact"
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-center group"
            >
              <Mail className="h-8 w-8 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900">İletişim</h3>
              <p className="text-sm text-gray-500">Bize ulaşın</p>
            </Link>
            <Link
              to="/terms"
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-center group"
            >
              <Shield className="h-8 w-8 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900">Kullanım Koşulları</h3>
              <p className="text-sm text-gray-500">Şartlar ve koşullar</p>
            </Link>
            <Link
              to="/privacy"
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-center group"
            >
              <Shield className="h-8 w-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900">Gizlilik</h3>
              <p className="text-sm text-gray-500">Gizlilik politikası</p>
            </Link>
            <a
              href="mailto:destek@varmii.com"
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-center group"
            >
              <MessageCircle className="h-8 w-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900">Canlı Destek</h3>
              <p className="text-sm text-gray-500">Anlık yardım</p>
            </a>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-4">
            {(searchQuery ? filteredCategories : categories).map((category) => {
              const Icon = category.icon;
              const isExpanded = expandedCategory === category.id;
              const colorClasses = {
                blue: 'bg-orange-100 text-orange-600',
                green: 'bg-green-100 text-green-600',
                purple: 'bg-purple-100 text-purple-600',
                orange: 'bg-orange-100 text-orange-600',
                indigo: 'bg-indigo-100 text-indigo-600',
                red: 'bg-red-100 text-red-600',
                yellow: 'bg-yellow-100 text-yellow-600',
                pink: 'bg-pink-100 text-pink-600'
              };

              return (
                <div key={category.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${colorClasses[category.color as keyof typeof colorClasses]}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-xl font-bold text-gray-900">{category.title}</h2>
                        <p className="text-sm text-gray-500">{category.faqs.length} soru</p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-6 w-6 text-gray-400 transition-transform ${
                        isExpanded ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 p-6 space-y-6">
                      {category.faqs.map((faq, index) => (
                        <div key={index} className="pb-6 last:pb-0 border-b last:border-b-0 border-gray-100">
                          <h3 className="font-semibold text-gray-900 mb-2 flex items-start gap-2">
                            <span className="text-orange-600 flex-shrink-0">Q:</span>
                            <span>{faq.question}</span>
                          </h3>
                          <p className="text-gray-600 ml-6">
                            <span className="text-green-600 font-semibold">A:</span> {faq.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Still Need Help */}
          <div className="mt-12 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-8 text-center">
            <MessageCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Hala Yardıma İhtiyacınız Var mı?</h2>
            <p className="text-gray-600 mb-6">
              Destek ekibimiz size yardımcı olmak için burada. 7/24 destek hizmeti sunuyoruz.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Mail className="h-4 w-4 mr-2" />
                  İletişim Formu
                </Button>
              </Link>
              <a href="mailto:destek@varmii.com">
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  destek@varmii.com
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
