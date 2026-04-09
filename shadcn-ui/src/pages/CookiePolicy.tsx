import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import Header from '../components/Header';

export default function CookiePolicy() {
  const [cookieSettings, setCookieSettings] = useState({
    necessary: true, // Always enabled
    functional: true,
    analytics: true,
    marketing: true,
  });

  useEffect(() => {
    // Load saved preferences
    const consent = localStorage.getItem('varmi-cookie-consent');
    const savedSettings = localStorage.getItem('varmi-cookie-settings');
    
    if (savedSettings) {
      setCookieSettings(JSON.parse(savedSettings));
    } else if (consent === 'accepted') {
      // If user accepted all, enable everything
      setCookieSettings({
        necessary: true,
        functional: true,
        analytics: true,
        marketing: true,
      });
    } else if (consent === 'rejected') {
      // If user rejected all, disable optional cookies
      setCookieSettings({
        necessary: true,
        functional: false,
        analytics: false,
        marketing: false,
      });
    }
  }, []);

  const handleSavePreferences = () => {
    localStorage.setItem('varmi-cookie-settings', JSON.stringify(cookieSettings));
    localStorage.setItem('varmi-cookie-consent', 'custom');
    toast.success('Çerez tercihleriniz kaydedildi!', {
      description: 'Ayarlarınız başarıyla güncellendi.',
    });
  };

  const handleAcceptAll = () => {
    const allEnabled = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setCookieSettings(allEnabled);
    localStorage.setItem('varmi-cookie-settings', JSON.stringify(allEnabled));
    localStorage.setItem('varmi-cookie-consent', 'accepted');
    toast.success('Tüm çerezler kabul edildi!');
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setCookieSettings(onlyNecessary);
    localStorage.setItem('varmi-cookie-settings', JSON.stringify(onlyNecessary));
    localStorage.setItem('varmi-cookie-consent', 'rejected');
    toast.success('Opsiyonel çerezler reddedildi!');
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Ana Sayfaya Dön
          </Link>

          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl">
                <Cookie className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Çerez Politikası
                </h1>
                <p className="text-gray-600 text-sm mt-1">Son Güncelleme: 24 Ekim 2025</p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Varmii.com olarak, web sitemizde çerez (cookie) teknolojisini kullanmaktayız. 
              Bu politika, çerezlerin nasıl kullanıldığını ve yönetildiğini açıklamaktadır.
            </p>
          </div>

          {/* Cookie Settings Panel */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border-2 border-orange-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Çerez Ayarları</h2>
                <p className="text-gray-600 text-sm">Çerez tercihlerinizi yönetin</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {/* Necessary Cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">Gerekli Çerezler</h3>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Zorunlu
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Web sitesinin temel işlevlerini sağlar. Devre dışı bırakılamaz.
                  </p>
                </div>
                <Switch checked={true} disabled className="ml-4" />
              </div>

              {/* Functional Cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">İşlevsel Çerezler</h3>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      Opsiyonel
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Gelişmiş özellikler ve kişiselleştirme sunar (dil tercihi, tema vb.).
                  </p>
                </div>
                <Switch 
                  checked={cookieSettings.functional}
                  onCheckedChange={(checked) => setCookieSettings(prev => ({ ...prev, functional: checked }))}
                  className="ml-4"
                />
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">Analitik Çerezler</h3>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      Opsiyonel
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Site kullanımını analiz eder ve performansı iyileştirmemize yardımcı olur.
                  </p>
                </div>
                <Switch 
                  checked={cookieSettings.analytics}
                  onCheckedChange={(checked) => setCookieSettings(prev => ({ ...prev, analytics: checked }))}
                  className="ml-4"
                />
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">Pazarlama Çerezleri</h3>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      Opsiyonel
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    İlgi alanlarınıza göre özelleştirilmiş reklamlar gösterir.
                  </p>
                </div>
                <Switch 
                  checked={cookieSettings.marketing}
                  onCheckedChange={(checked) => setCookieSettings(prev => ({ ...prev, marketing: checked }))}
                  className="ml-4"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
              <Button
                onClick={handleSavePreferences}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Tercihleri Kaydet
              </Button>
              <Button
                onClick={handleAcceptAll}
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50 font-semibold"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Tümünü Kabul Et
              </Button>
              <Button
                onClick={handleRejectAll}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50 font-semibold"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Tümünü Reddet
              </Button>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-6">
            {/* Section 1 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-orange-600">1.</span>
                Çerez Nedir?
              </h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  Çerezler, bir web sitesini ziyaret ettiğinizde cihazınıza (bilgisayar, tablet, akıllı telefon) 
                  kaydedilen küçük metin dosyalarıdır. Çerezler, web sitesinin daha verimli çalışmasını sağlar 
                  ve kullanıcı deneyimini iyileştirir.
                </p>
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <p className="text-sm">
                    💡 <strong>Not:</strong> Çerezler virüs veya zararlı yazılım içermez ve cihazınıza zarar vermez.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-orange-600">2.</span>
                Çerez Türleri
              </h2>
              <div className="space-y-4">
                {/* Zorunlu Çerezler */}
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    🔒 Zorunlu Çerezler
                  </h3>
                  <p className="text-gray-700 mb-2">
                    Web sitesinin temel işlevlerini yerine getirebilmesi için gerekli olan çerezlerdir. 
                    Bu çerezler olmadan site düzgün çalışamaz.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Oturum yönetimi (giriş durumu)</li>
                    <li>Güvenlik önlemleri</li>
                    <li>Alışveriş sepeti işlevleri</li>
                    <li>Form verilerinin saklanması</li>
                  </ul>
                </div>

                {/* Fonksiyonel Çerezler */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    ⚙️ Fonksiyonel Çerezler
                  </h3>
                  <p className="text-gray-700 mb-2">
                    Kullanıcı tercihlerinizi hatırlayarak daha kişiselleştirilmiş bir deneyim sunar.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Dil tercihi</li>
                    <li>Tema seçimi (açık/koyu mod)</li>
                    <li>Bölge ayarları</li>
                    <li>Önceki aramalar</li>
                  </ul>
                </div>

                {/* Analitik Çerezler */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    📊 Analitik Çerezler
                  </h3>
                  <p className="text-gray-700 mb-2">
                    Web sitesi kullanımını analiz etmek ve performansı iyileştirmek için kullanılır.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Sayfa görüntüleme istatistikleri</li>
                    <li>Kullanıcı davranış analizi</li>
                    <li>Site performans ölçümü</li>
                    <li>Hata raporlama</li>
                  </ul>
                </div>

                {/* Reklam Çerezleri */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    🎯 Reklam ve Pazarlama Çerezleri
                  </h3>
                  <p className="text-gray-700 mb-2">
                    Size özel reklamlar göstermek ve pazarlama kampanyalarının etkinliğini ölçmek için kullanılır.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Hedefli reklamlar</li>
                    <li>Sosyal medya entegrasyonu</li>
                    <li>Remarketing kampanyaları</li>
                    <li>Reklam performans analizi</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-orange-600">3.</span>
                Çerezleri Nasıl Yönetebilirsiniz?
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Tarayıcı ayarlarınızdan çerezleri kontrol edebilir, kabul veya reddedebilirsiniz. 
                  Ancak, zorunlu çerezleri devre dışı bırakmanız durumunda web sitesinin bazı özellikleri 
                  düzgün çalışmayabilir.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900">Popüler Tarayıcılarda Çerez Ayarları:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600">🌐</span>
                      <div>
                        <strong>Google Chrome:</strong>
                        <span className="text-sm text-gray-600 block">
                          Ayarlar → Gizlilik ve güvenlik → Çerezler ve diğer site verileri
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600">🦊</span>
                      <div>
                        <strong>Mozilla Firefox:</strong>
                        <span className="text-sm text-gray-600 block">
                          Seçenekler → Gizlilik ve Güvenlik → Çerezler ve Site Verileri
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400">🧭</span>
                      <div>
                        <strong>Safari:</strong>
                        <span className="text-sm text-gray-600 block">
                          Tercihler → Gizlilik → Çerezler ve web sitesi verileri
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500">🌊</span>
                      <div>
                        <strong>Microsoft Edge:</strong>
                        <span className="text-sm text-gray-600 block">
                          Ayarlar → Gizlilik, arama ve hizmetler → Çerezler
                        </span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-orange-600">4.</span>
                Üçüncü Taraf Çerezler
              </h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  Web sitemizde, analiz ve reklam hizmetleri için üçüncü taraf hizmet sağlayıcılarının 
                  çerezlerini kullanabiliriz:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">📊 Google Analytics</h4>
                    <p className="text-sm text-gray-600">
                      Web sitesi trafiğini ve kullanıcı davranışlarını analiz eder.
                    </p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">📱 Facebook Pixel</h4>
                    <p className="text-sm text-gray-600">
                      Reklam kampanyalarının etkinliğini ölçer ve hedefli reklamlar gösterir.
                    </p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">🎯 Google Ads</h4>
                    <p className="text-sm text-gray-600">
                      Remarketing ve reklam performans takibi yapar.
                    </p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">🔍 Hotjar</h4>
                    <p className="text-sm text-gray-600">
                      Kullanıcı deneyimini iyileştirmek için davranış analizi yapar.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-orange-600">5.</span>
                Değişiklikler
              </h2>
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <p className="text-gray-700">
                  ⚠️ Varmii.com, bu Çerez Politikası'nı herhangi bir zamanda güncelleme hakkını saklı tutar. 
                  Değişiklikler bu sayfada yayınlanacak ve "Son Güncelleme" tarihi güncellenecektir.
                </p>
              </div>
            </div>

            {/* Section 6 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-orange-600">6.</span>
                İletişim
              </h2>
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-6">
                <p className="text-gray-700 mb-4">
                  Çerez politikamız hakkında sorularınız için bizimle iletişime geçebilirsiniz:
                </p>
                <div className="space-y-2 text-gray-700">
                  <p className="flex items-center gap-2">
                    <span className="font-semibold">📧 E-posta:</span>
                    <a href="mailto:cerez@varmii.com" className="text-orange-600 hover:text-orange-700 underline">
                      cerez@varmii.com
                    </a>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-semibold">🌐 Web:</span>
                    <a href="https://www.varmii.com" className="text-orange-600 hover:text-orange-700 underline">
                      www.varmii.com
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                Bu çerez politikası, web sitemizi ziyaret ettiğinizde kabul etmiş sayılırsınız.
                <br />
                <span className="text-xs text-gray-500">© 2025 Varmii.com - Tüm hakları saklıdır.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
