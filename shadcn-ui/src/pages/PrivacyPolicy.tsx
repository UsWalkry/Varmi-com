import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import { Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-orange-500 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gizlilik Politikası</h1>
          <p className="text-gray-600">Kişisel verilerinizin korunması bizim için önemlidir</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="prose prose-sm max-w-none p-8 text-gray-700">
            <div className="space-y-8">
              {/* GİRİŞ */}
              <section className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-500">
                <h2 className="text-2xl font-bold text-orange-900 mb-4">🔒 Gizliliğiniz Bizim İçin Önemlidir</h2>
                <p className="text-orange-800 leading-relaxed">
                  Varmii.com olarak, kişisel verilerinizin gizliliğine ve güvenliğine büyük önem veriyoruz. Bu Gizlilik Politikası, platformumuzu kullanırken toplanan kişisel bilgilerinizin nasıl işlendiğini, saklandığını ve korunduğunu açıklamaktadır. 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında hazırlanmış bu politika, tüm kullanıcılarımız için geçerlidir.
                </p>
              </section>

              {/* 1. VERİ SORUMLUSU */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Veri Sorumlusu</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="mb-3">
                    6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz; veri sorumlusu olarak Varmii.com tarafından aşağıda açıklanan kapsamda işlenebilecektir.
                  </p>
                  <div className="space-y-2 text-sm">
                    <p><strong>Şirket Adı:</strong> Varmii.com</p>
                    <p><strong>Web Sitesi:</strong> www.varmii.com</p>
                    <p><strong>E-posta:</strong> destek@varmii.com</p>
                    <p><strong>İletişim:</strong> Kişisel verilerinizle ilgili her türlü talebiniz için yukarıdaki iletişim bilgilerini kullanabilirsiniz.</p>
                  </div>
                </div>
              </section>

              {/* 2. TOPLANAN KİŞİSEL VERİLER */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Toplanan Kişisel Veriler</h2>
                <p className="mb-4">Platformumuz üzerinde aşağıdaki kişisel veriler toplanmaktadır:</p>
                
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                    <h3 className="font-bold text-green-900 mb-2">📝 Kimlik Bilgileri</h3>
                    <ul className="list-disc list-inside space-y-1 text-green-800">
                      <li>Ad, soyad</li>
                      <li>Doğum tarihi</li>
                      <li>Cinsiyet</li>
                      <li>TC Kimlik Numarası (isteğe bağlı, güvenlik için)</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                    <h3 className="font-bold text-orange-900 mb-2">📧 İletişim Bilgileri</h3>
                    <ul className="list-disc list-inside space-y-1 text-orange-800">
                      <li>E-posta adresi</li>
                      <li>Telefon numarası</li>
                      <li>Adres bilgileri (il, ilçe, posta kodu, açık adres)</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                    <h3 className="font-bold text-purple-900 mb-2">💳 Finansal Bilgiler</h3>
                    <ul className="list-disc list-inside space-y-1 text-purple-800">
                      <li>Ödeme kartı bilgileri (şifreli olarak saklanır)</li>
                      <li>Banka hesap bilgileri (satıcılar için)</li>
                      <li>Fatura bilgileri</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                    <h3 className="font-bold text-orange-900 mb-2">🌐 Teknik Veriler</h3>
                    <ul className="list-disc list-inside space-y-1 text-orange-800">
                      <li>IP adresi</li>
                      <li>Çerez bilgileri</li>
                      <li>Tarayıcı türü ve versiyonu</li>
                      <li>İşletim sistemi</li>
                      <li>Ziyaret edilen sayfalar ve tıklama verileri</li>
                    </ul>
                  </div>

                  <div className="bg-pink-50 p-4 rounded-lg border-l-4 border-pink-500">
                    <h3 className="font-bold text-pink-900 mb-2">🛍️ İşlem Bilgileri</h3>
                    <ul className="list-disc list-inside space-y-1 text-pink-800">
                      <li>İlan içerikleri ve görseller</li>
                      <li>Teklif bilgileri</li>
                      <li>Sipariş geçmişi</li>
                      <li>Favori ilanlar</li>
                      <li>Değerlendirme ve yorumlar</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 3. KİŞİSEL VERİLERİN İŞLENME AMAÇLARI */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Kişisel Verilerin İşlenme Amaçları</h2>
                <p className="mb-4">Toplanan kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-colors">
                    <div className="text-3xl mb-2">✅</div>
                    <h4 className="font-bold mb-2">Üyelik İşlemleri</h4>
                    <p className="text-sm text-gray-600">Hesap oluşturma, kimlik doğrulama ve üyelik yönetimi</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-colors">
                    <div className="text-3xl mb-2">🛒</div>
                    <h4 className="font-bold mb-2">Alışveriş İşlemleri</h4>
                    <p className="text-sm text-gray-600">İlan yayınlama, teklif verme, sipariş takibi</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-colors">
                    <div className="text-3xl mb-2">💰</div>
                    <h4 className="font-bold mb-2">Ödeme İşlemleri</h4>
                    <p className="text-sm text-gray-600">Güvenli ödeme altyapısı, fatura düzenleme</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-colors">
                    <div className="text-3xl mb-2">🚚</div>
                    <h4 className="font-bold mb-2">Teslimat</h4>
                    <p className="text-sm text-gray-600">Kargo gönderimi, adres teyidi, teslimat takibi</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-colors">
                    <div className="text-3xl mb-2">📊</div>
                    <h4 className="font-bold mb-2">Analiz ve İyileştirme</h4>
                    <p className="text-sm text-gray-600">Kullanıcı deneyimi analizi, hizmet kalitesi artırma</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-colors">
                    <div className="text-3xl mb-2">📧</div>
                    <h4 className="font-bold mb-2">İletişim</h4>
                    <p className="text-sm text-gray-600">Bildirimler, kampanyalar, müşteri destek</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-colors">
                    <div className="text-3xl mb-2">🔒</div>
                    <h4 className="font-bold mb-2">Güvenlik</h4>
                    <p className="text-sm text-gray-600">Dolandırıcılık önleme, hesap güvenliği</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-colors">
                    <div className="text-3xl mb-2">⚖️</div>
                    <h4 className="font-bold mb-2">Yasal Yükümlülükler</h4>
                    <p className="text-sm text-gray-600">Mevzuat gereği kayıt tutma, resmi taleplere cevap</p>
                  </div>
                </div>
              </section>

              {/* 4. KİŞİSEL VERİLERİN AKTARILMASI */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Kişisel Verilerin Aktarılması</h2>
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                  <p className="text-yellow-800 font-semibold mb-2">⚠️ Önemli Bilgilendirme</p>
                  <p className="text-yellow-800 text-sm">
                    Kişisel verileriniz, ancak yasal zorunluluklar veya hizmetin gereği olarak ve güvenli şekilde üçüncü taraflarla paylaşılabilir.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <span className="text-2xl">🏦</span>
                    <div>
                      <h4 className="font-bold">Ödeme Kuruluşları</h4>
                      <p className="text-sm text-gray-600">Güvenli ödeme işlemleri için banka ve ödeme hizmeti sağlayıcıları</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <span className="text-2xl">📦</span>
                    <div>
                      <h4 className="font-bold">Kargo Şirketleri</h4>
                      <p className="text-sm text-gray-600">Sipariş teslimatı için adres ve iletişim bilgileri</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <span className="text-2xl">⚖️</span>
                    <div>
                      <h4 className="font-bold">Yasal Merciler</h4>
                      <p className="text-sm text-gray-600">Mahkeme kararı veya yasal zorunluluk halinde kamu kurumları</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <span className="text-2xl">🤝</span>
                    <div>
                      <h4 className="font-bold">İş Ortakları</h4>
                      <p className="text-sm text-gray-600">Hizmet kalitesini artırmak için anlaşmalı iş ortakları (sınırlı bilgi)</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 5. ÇEREZ POLİTİKASI */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Çerez (Cookie) Politikası</h2>
                <p className="mb-4">Web sitemizde kullanıcı deneyimini iyileştirmek için çerezler kullanılmaktadır:</p>
                
                <div className="space-y-3">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-bold text-orange-900 mb-2">🍪 Zorunlu Çerezler</h4>
                    <p className="text-sm text-orange-800">Sitenin temel fonksiyonları için gereklidir (oturum yönetimi, güvenlik)</p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-bold text-green-900 mb-2">📊 Analitik Çerezler</h4>
                    <p className="text-sm text-green-800">Site kullanımını analiz eder, iyileştirme fırsatları sunar</p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-bold text-purple-900 mb-2">🎯 Pazarlama Çerezleri</h4>
                    <p className="text-sm text-purple-800">Kişiselleştirilmiş reklamlar ve kampanyalar için kullanılır (onay ile)</p>
                  </div>
                </div>

                <div className="mt-4 bg-gray-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>📌 Not:</strong> Tarayıcı ayarlarınızdan çerezleri yönetebilir, silebilir veya engelleyebilirsiniz. Ancak bazı çerezleri devre dışı bırakmanız durumunda site fonksiyonları kısıtlanabilir.
                  </p>
                </div>
              </section>

              {/* 6. VERİ GÜVENLİĞİ */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Veri Güvenliği</h2>
                <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border-2 border-red-200">
                  <h3 className="font-bold text-red-900 mb-3">🔐 Güvenlik Önlemlerimiz</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>SSL/TLS şifreleme</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Güvenlik duvarı koruması</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Düzenli güvenlik testleri</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Şifreli veri saklama</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>İki faktörlü kimlik doğrulama</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Erişim kontrol sistemleri</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 7. HAKLARINIZ */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. KVKK Kapsamındaki Haklarınız</h2>
                <p className="mb-4">6698 sayılı KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                    <span className="text-2xl">📋</span>
                    <div>
                      <h4 className="font-bold text-orange-900">Bilgi Talep Etme</h4>
                      <p className="text-sm text-orange-800">Kişisel verilerinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi talep etme</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <span className="text-2xl">🔄</span>
                    <div>
                      <h4 className="font-bold text-green-900">Düzeltme Talep Etme</h4>
                      <p className="text-sm text-green-800">Kişisel verilerinizin eksik veya yanlış işlenmiş olması halinde düzeltilmesini isteme</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                    <span className="text-2xl">🗑️</span>
                    <div>
                      <h4 className="font-bold text-red-900">Silme Talep Etme</h4>
                      <p className="text-sm text-red-800">Kişisel verilerinizin silinmesini veya yok edilmesini talep etme</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                    <span className="text-2xl">🚫</span>
                    <div>
                      <h4 className="font-bold text-purple-900">İtiraz Etme</h4>
                      <p className="text-sm text-purple-800">Kişisel verilerinizin işlenmesine itiraz etme</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                    <span className="text-2xl">📤</span>
                    <div>
                      <h4 className="font-bold text-orange-900">Aktarımı Öğrenme</h4>
                      <p className="text-sm text-orange-800">Kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-gradient-to-r from-orange-100 to-purple-100 p-6 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-3">📬 Başvuru Yöntemi</h4>
                  <p className="text-sm text-gray-700 mb-3">
                    Yukarıdaki haklarınızı kullanmak için aşağıdaki yöntemlerle başvuruda bulunabilirsiniz:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                    <li><strong>E-posta:</strong> destek@varmii.com</li>
                    <li><strong>Yazılı Başvuru:</strong> Kimlik fotokopisi ile birlikte posta yoluyla</li>
                    <li><strong>Yanıt Süresi:</strong> Başvurunuz en geç 30 gün içinde yanıtlanacaktır</li>
                  </ul>
                </div>
              </section>

              {/* 8. VERİ SAKLAMA SÜRESİ */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Veri Saklama Süresi</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="mb-3">
                    Kişisel verileriniz, işlendikleri amaç için gerekli olan süre boyunca ve ilgili mevzuatın öngördüğü süreler dahilinde saklanmaktadır:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span><strong>Üyelik Bilgileri:</strong> Hesap aktif olduğu sürece + 10 yıl (Vergi Usul Kanunu gereği)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span><strong>İşlem Kayıtları:</strong> İşlem tarihinden itibaren 10 yıl</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span><strong>İletişim Kayıtları:</strong> Silme talebi veya 2 yıl</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span><strong>Çerez Verileri:</strong> 2 yıla kadar (çerez türüne göre değişir)</span>
                    </li>
                  </ul>
                </div>
              </section>

              {/* 9. DEĞİŞİKLİKLER */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Gizlilik Politikası Değişiklikleri</h2>
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                  <p className="text-yellow-800">
                    Varmii.com, bu Gizlilik Politikası'nı dilediği zaman değiştirme hakkını saklı tutar. Değişiklikler web sitemizde yayınlandığı anda yürürlüğe girer. Önemli değişikliklerde kullanıcılarımız e-posta yoluyla bilgilendirilir. Politikayı düzenli olarak gözden geçirmenizi öneririz.
                  </p>
                </div>
              </section>

              {/* 10. İLETİŞİM */}
              <section className="bg-gradient-to-r from-orange-50 to-green-50 p-6 rounded-lg border-2 border-orange-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">📧 İletişim</h2>
                <p className="mb-4">Gizlilik politikamız veya kişisel verilerinizle ilgili sorularınız için:</p>
                <div className="space-y-2">
                  <p><strong>Platform:</strong> Varmii.com</p>
                  <p><strong>E-posta:</strong> <a href="mailto:destek@varmii.com" className="text-orange-600 hover:underline">destek@varmii.com</a></p>
                  <p><strong>KVKK Başvuruları:</strong> <a href="mailto:kvkk@varmii.com" className="text-orange-600 hover:underline">kvkk@varmii.com</a></p>
                  <p><strong>Web:</strong> <a href="https://www.varmii.com" className="text-orange-600 hover:underline">www.varmii.com</a></p>
                </div>
              </section>

              {/* FOOTER */}
              <div className="text-center text-sm text-gray-500 pt-6 border-t">
                <p className="mb-2">
                  <strong>Son Güncelleme:</strong> {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p>Bu Gizlilik Politikası, 6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca hazırlanmıştır.</p>
                <p className="mt-2">© 2024 Varmii.com - Tüm hakları saklıdır.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
