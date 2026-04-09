import { Link } from 'react-router-dom';
import { Search, FileText, MessageSquare, ShoppingCart, Package, CheckCircle, ArrowRight, Users, TrendingUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HowItWorks() {
  const steps = [
    {
      step: 1,
      icon: Search,
      title: 'Aradığınız Ürün İçin İlan Oluşturun',
      description: 'İhtiyacınız olan ürünü, özelliklerini, bütçenizi ve tercihlerinizi belirterek ilan oluşturun.',
      color: 'blue',
      details: [
        'Ürün adı, kategori ve özelliklerini girin',
        'Yeni veya ikinci el olma durumunu seçin',
        'Bütçenizi belirleyin',
        'Teslimat tercihlerinizi seçin (kargo/elden teslim)',
        'İsterseniz fotoğraf ekleyin'
      ]
    },
    {
      step: 2,
      icon: FileText,
      title: 'İlanınız Onaylanır',
      description: 'Moderatörlerimiz ilanınızı 2-24 saat içinde inceler ve onaylar.',
      color: 'purple',
      details: [
        'İlanınız içerik kontrolünden geçer',
        'Yasaklı ürün kontrolü yapılır',
        'Fotoğraflar ve açıklamalar kontrol edilir',
        'Onaylanan ilan aktif hale gelir',
        'E-posta ile bilgilendirilirsiniz'
      ]
    },
    {
      step: 3,
      icon: MessageSquare,
      title: 'Satıcılar Teklif Gönderir',
      description: 'İlanınızı gören satıcılar size rekabetçi teklifler sunar.',
      color: 'green',
      details: [
        'Birden fazla satıcıdan teklif alırsınız',
        'Her teklifin detaylarını görürsünız',
        'Satıcı profillerini inceleyebilirsiniz',
        'Satıcı puanlarını ve yorumlarını okuyabilirsiniz',
        'Teklif karşılaştırması yapabilirsiniz'
      ]
    },
    {
      step: 4,
      icon: ShoppingCart,
      title: 'En İyi Teklifi Seçin',
      description: 'Size uyan teklifi kabul edin ve sipariş oluşturun.',
      color: 'orange',
      details: [
        'Gelen teklifleri karşılaştırın',
        'Fiyat, satıcı puanı ve yorumlara bakın',
        'İstediğiniz teklifi kabul edin',
        'Otomatik sipariş oluşturulur',
        'Güvenli ödeme sayfasına yönlendirilirsiniz'
      ]
    },
    {
      step: 5,
      icon: Package,
      title: 'Ödeme Yapın ve Ürün Gönderilir',
      description: 'Güvenli ödeme yapın, satıcı ürünü hazırlar ve kargoya verir.',
      color: 'indigo',
      details: [
        'Kredi kartı veya banka kartı ile ödeme',
        'Güvenli ödeme altyapısı',
        'Satıcı ürünü hazırlar',
        'Kargoya verilir ve takip numarası paylaşılır',
        'Kargo takibi yapabilirsiniz'
      ]
    },
    {
      step: 6,
      icon: CheckCircle,
      title: 'Ürünü Teslim Alın',
      description: 'Ürününüz kapınıza gelir, teslim alın ve siparişi tamamlayın.',
      color: 'red',
      details: [
        'Ürün adresinize teslim edilir',
        'Ürünü kontrol edin',
        '"Teslim Aldım" butonuna tıklayın',
        'Satıcıya puan ve yorum bırakın',
        '14 gün içinde iade hakkınız vardır'
      ]
    }
  ];

  const features = [
    {
      icon: Users,
      title: 'Alıcı Odaklı',
      description: 'Siz ne istediğinizi belirtin, satıcılar size teklif getirsin. Zaman kazanın.'
    },
    {
      icon: TrendingUp,
      title: 'Rekabetçi Fiyatlar',
      description: 'Birden fazla satıcıdan teklif alarak en iyi fiyatı bulun.'
    },
    {
      icon: Shield,
      title: 'Güvenli Alışveriş',
      description: 'Tüm ödemeler güvenli altyapı ile korunur, alıcı koruması sağlanır.'
    }
  ];

  const colorClasses = {
    blue: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    indigo: 'from-indigo-500 to-indigo-600',
    red: 'from-red-500 to-red-600'
  };

  const iconBgClasses = {
    blue: 'bg-orange-100',
    purple: 'bg-purple-100',
    green: 'bg-green-100',
    orange: 'bg-orange-100',
    indigo: 'bg-indigo-100',
    red: 'bg-red-100'
  };

  const iconColorClasses = {
    blue: 'text-orange-600',
    purple: 'text-purple-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    indigo: 'text-indigo-600',
    red: 'text-red-600'
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Varmii.com Nasıl Çalışır?
            </h1>
            <p className="text-xl text-orange-100 max-w-3xl mx-auto mb-6">
              Geleneksel e-ticaretten farklı, alıcı odaklı yeni nesil alışveriş deneyimi
            </p>
            <Link to="/">
              <Button variant="outline" className="bg-white text-orange-600 hover:bg-orange-50">
                Ana Sayfaya Dön
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Introduction */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              6 Basit Adımda Alışveriş
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Varmii.com'da alışveriş yapmak çok kolay. İhtiyacınızı belirtin, 
              teklifleri karşılaştırın ve en uygun olanı seçin.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-8 mb-20">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;

              return (
                <div key={step.step} className="relative">
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute left-1/2 top-32 w-0.5 h-24 bg-gradient-to-b from-gray-300 to-transparent transform -translate-x-1/2 z-0" />
                  )}

                  <div className={`md:grid md:grid-cols-2 gap-8 items-center ${isEven ? '' : 'md:grid-flow-dense'}`}>
                    {/* Step Number and Icon */}
                    <div className={`flex justify-center md:justify-${isEven ? 'end' : 'start'} mb-6 md:mb-0`}>
                      <div className="relative">
                        <div className={`absolute -inset-4 bg-gradient-to-r ${colorClasses[step.color as keyof typeof colorClasses]} opacity-20 blur-xl rounded-full`} />
                        <div className="relative bg-white rounded-2xl shadow-xl p-8 w-48 h-48 flex flex-col items-center justify-center">
                          <div className={`${iconBgClasses[step.color as keyof typeof iconBgClasses]} p-4 rounded-full mb-3`}>
                            <Icon className={`h-10 w-10 ${iconColorClasses[step.color as keyof typeof iconColorClasses]}`} />
                          </div>
                          <div className={`text-4xl font-bold bg-gradient-to-r ${colorClasses[step.color as keyof typeof colorClasses]} bg-clip-text text-transparent`}>
                            Adım {step.step}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className={`${isEven ? '' : 'md:col-start-1'} bg-white rounded-xl shadow-lg p-6 md:p-8`}>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">
                        {step.title}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {step.description}
                      </p>
                      <ul className="space-y-2">
                        {step.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <ArrowRight className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColorClasses[step.color as keyof typeof iconColorClasses]}`} />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Features */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-8 md:p-12 mb-16">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Neden Varmii.com?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Icon className="h-10 w-10 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Example Scenarios */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
              Örnek Senaryolar
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  📱 Telefon Arıyorum
                </h3>
                <p className="text-gray-600 mb-3">
                  <strong>Durum:</strong> Ahmet yeni bir iPhone almak istiyor ancak hangi mağazada daha uygun olduğunu araştırmak istemıyor.
                </p>
                <p className="text-gray-600 mb-3">
                  <strong>Çözüm:</strong> Varmii.com'da "iPhone 14 Pro 256GB" ilanı oluşturuyor ve 45.000₺ bütçe belirtiyor.
                </p>
                <p className="text-gray-600">
                  <strong>Sonuç:</strong> 5 satıcıdan teklif alıyor, en iyi fiyat ve puanlı satıcıyı seçiyor. Zaman kazanıyor ve en iyi fiyatı buluyor.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  💻 İkinci El Laptop
                </h3>
                <p className="text-gray-600 mb-3">
                  <strong>Durum:</strong> Elif üniversite için uygun fiyatlı ikinci el laptop arıyor.
                </p>
                <p className="text-gray-600 mb-3">
                  <strong>Çözüm:</strong> "İkinci el Macbook Air 2020" ilanı oluşturuyor, 15.000₺ bütçe ve özellikler belirtiyor.
                </p>
                <p className="text-gray-600">
                  <strong>Sonuç:</strong> Bireysel satıcılar ve mağazalardan 8 teklif geliyor. Detaylı karşılaştırma yapıp garantili bir teklifi seçiyor.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  🎮 Oyun Konsolu
                </h3>
                <p className="text-gray-600 mb-3">
                  <strong>Durum:</strong> Mehmet oğluna PlayStation 5 almak istiyor ama stokta bulamıyor.
                </p>
                <p className="text-gray-600 mb-3">
                  <strong>Çözüm:</strong> İlan oluşturuyor ve "yeni, kutusunda" tercihini belirtiyor.
                </p>
                <p className="text-gray-600">
                  <strong>Sonuç:</strong> Stoku olan satıcılar hemen teklif gönderiyor. 2 saat içinde siparişini veriyor ve 3 gün içinde teslim alıyor.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  🏠 Ev Elektroniği
                </h3>
                <p className="text-gray-600 mb-3">
                  <strong>Durum:</strong> Zeynep taşınacağı ev için çamaşır makinesi arıyor.
                </p>
                <p className="text-gray-600 mb-3">
                  <strong>Çözüm:</strong> Marka, kapasite ve özelliklerini belirterek ilan oluşturuyor.
                </p>
                <p className="text-gray-600">
                  <strong>Sonuç:</strong> Yerel satıcılardan "elden teslim" teklifleri geliyor. Hem kargo ücreti ödemıyor hem de ürünü görerek alıyor.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Hazır mısınız? Hemen Başlayın!
            </h2>
            <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
              Ücretsiz üye olun ve aradığınız ürün için ilan oluşturmaya başlayın. 
              Satıcılar size en iyi teklifleri getirsin.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50">
                  Ücretsiz Üye Ol
                </Button>
              </Link>
              <Link to="/help">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Yardım Merkezi
                </Button>
              </Link>
            </div>
          </div>

          {/* FAQ Preview */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Daha Fazla Sorunuz mu Var?
            </h2>
            <p className="text-gray-600 mb-6">
              45'ten fazla sık sorulan soru ve cevabı için Yardım Merkezimizi ziyaret edin.
            </p>
            <Link to="/help">
              <Button variant="outline" className="border-orange-600 text-orange-600 hover:bg-orange-50">
                Yardım Merkezine Git →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
