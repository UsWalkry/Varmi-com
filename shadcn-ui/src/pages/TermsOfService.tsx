import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import { ScrollText } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4">
            <ScrollText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Üyelik Sözleşmesi</h1>
          <p className="text-gray-600">Varmii.com platformunu kullanmadan önce lütfen dikkatle okuyunuz</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="prose prose-sm max-w-none p-8 text-gray-700">
            <div className="space-y-8">
              {/* 1. TARAFLAR */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. TARAFLAR</h2>
                <p className="mb-3">
                  <strong>1.1.</strong> İşbu üyelik sözleşmesi ("Üyelik Sözleşmesi") merkezi [Adres Bilgisi] adresinde bulunan Varmii.com ("Varmii.com" veya "Platform") ile Üye ("Üye") arasında, Üye'nin Varmii.com'un Websitesi'nde sunduğu Hizmetler'den yararlanmasına ilişkin koşulların belirlenmesi için akdedilmiştir.
                </p>
                <p>
                  <strong>1.2.</strong> Varmii.com ve Üye işbu Üyelik Sözleşmesi'nde münferiden "Taraf" ve müştereken "Taraflar" olarak anılacaklardır.
                </p>
              </section>

              {/* 2. TANIMLAR */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. TANIMLAR</h2>
                
                <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                  <p><strong>İlan:</strong> Alıcıların aradıkları ürün veya hizmetleri tanımladıkları, bütçe ve tercihlerini belirttikleri içeriği ifade eder.</p>
                  
                  <p><strong>Teklif:</strong> Satıcıların, ilanlar üzerinden alıcılara sundukları ürün/hizmet tekliflerini ifade eder.</p>
                  
                  <p><strong>Alıcı (İlan Sahibi):</strong> Varmii.com platformunda ihtiyacı olan ürün veya hizmeti ilan oluşturarak talep eden, satıcılardan gelen teklifleri değerlendiren ve satın alma işlemini gerçekleştiren gerçek kişiyi ifade eder.</p>
                  
                  <p><strong>Satıcı (Teklif Sahibi):</strong> Varmii.com platformunda yer alan ilanlara teklif veren, alıcı tarafından kabul edilen tekliflere istinaden ürün/hizmet tedarik eden gerçek veya tüzel kişiyi ifade eder.</p>
                  
                  <p><strong>Hesabım Sayfası:</strong> Üye'nin Websitesi'nde yer alan çeşitli uygulamalardan ve Hizmetler'den yararlanabilmesi için gerekli işlemleri gerçekleştirebildiği, kişisel verilerini ve uygulama bazında kendisinden talep edilen bilgilerini girdiği sadece ilgili Üye tarafından belirlenen kullanıcı adı ve şifre ile erişilebilen Üye'ye özel sayfayı ifade eder.</p>
                  
                  <p><strong>Hizmet:</strong> Üyeler'in işbu Üyelik Sözleşmesi içerisinde tanımlı olan iş ve işlemlerini gerçekleştirmelerini sağlamak amacıyla Varmii.com tarafından sunulan hizmet ve uygulamaları ifade eder.</p>
                  
                  <p><strong>Websitesi:</strong> Mülkiyeti Varmii.com'a ait olan ve Varmii.com'un işbu Sözleşme ile belirlenen Hizmetler'i üzerinde sunmakta olduğu www.Varmii.com alan adına sahip internet sitesini, mobil uygulamalarını ve mobil siteyi ifade eder.</p>
                  
                  <p><strong>Ziyaretçi:</strong> Websitesi'ni Üye olmadan kullanan ve Hizmetler'den faydalanan gerçek kişiyi ifade eder.</p>
                </div>
              </section>

              {/* 3. SÖZLEŞMENİN KAPSAM VE AMACI */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. ÜYELIK SÖZLEŞMESI'NIN KAPSAM VE AMACI</h2>
                <p className="mb-3">
                  <strong>3.1.</strong> Varmii.com, Websitesi'ni işletmekte olup, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca aracı hizmet sağlayıcıdır. Platform, alıcılar ve satıcılar arasında buluşma noktası sağlayarak, alıcıların ihtiyaçlarını ilan etmelerini ve satıcıların bu ihtiyaçlara teklif sunmalarını sağlar.
                </p>
                <p className="mb-3">
                  <strong>3.2.</strong> Üyelik Sözleşmesi uyarınca Üye, Websitesi'ne üye olmak, Hizmetler'den faydalanmak ve bu platformda ilan oluşturmak, teklifler vermek veya teklifleri değerlendirmek istemektedir.
                </p>
                <p className="mb-3">
                  <strong>3.3.</strong> Üyelik Sözleşmesi'nin amacını, Hizmetler'den yararlanmasına ilişkin koşulların belirlenmesi ve bu doğrultuda Taraflar'ın hak ve yükümlülüklerinin tespiti oluşturmaktadır.
                </p>
                <p>
                  <strong>3.4.</strong> İşbu Üyelik Sözleşmesi, yalnızca Taraflar arasında olup, Websitesi'nde yer alan ve yer alacak olan Hizmetler'e yönelik şekil ve şartları kapsamaktadır. Alıcılar (İlan Sahipleri) ile Satıcılar (Teklif Sahipleri) arasındaki alım-satım ilişkisi işbu Üyelik Sözleşmesi'nin kapsamına girmemektedir ve Varmii.com, Alıcılar ile Satıcılar arasındaki ilişkiden hiçbir şekilde sorumlu değildir. Alıcılar, Satıcılar'a karşı 6502 sayılı Tüketicinin Korunması Hakkında Kanun başta olmak üzere sair mevzuat çerçevesinde haklarını arayabileceklerdir.
                </p>
              </section>

              {/* 4. TARAFLARIN HAK VE YÜKÜMLÜLÜKLERİ */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. TARAFLAR'IN HAK VE YÜKÜMLÜLÜKLERİ</h2>
                
                <div className="space-y-3">
                  <p>
                    <strong>4.1.</strong> Üyelik statüsünün kazanılması için, Üyelik Sözleşmesi'nin onaylanması ve üyelik sayfasında talep edilen bilgilerin doğru ve güncel bilgilerle doldurulması gerekmektedir. Üye olmak isteyen kullanıcının 18 (on sekiz) yaşını doldurmuş olması gerekmektedir. Üyelik Sözleşmesi'ni doldururken doğru ve güncel bilgi sağlamayan Üye, bu sebeple doğabilecek tüm zararlardan bizzat sorumludur.
                  </p>
                  
                  <p>
                    <strong>4.2.</strong> Varmii.com'un Websitesi'nde yer alan herhangi bir ürün veya hizmetin satıcısı konumunda olmaması ve 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca yalnızca 'aracı hizmet sağlayıcı' olması sebebiyle; Websitesi'nde yer alan ve kendisi tarafından yayınlanmamış içeriğe ilişkin bir sorumluluğu bulunmamakta ve söz konusu içeriğin hukuka uygun olup olmadığını kontrol etme gibi bir yükümlülüğü bulunmamaktadır.
                  </p>
                  
                  <p>
                    <strong>4.3.</strong> Üye, Websitesi üzerinden yapacağı tüm işlemlerde, mesafeli satış sözleşmelerinde Satıcı'nın satıcı taraf, kendisinin ise alıcı taraf olduğunu; Varmii.com'un bahsi geçen mesafeli satış sözleşmesi ilişkisinde taraf olmadığını; dolayısıyla da kendisine karşı sadece Satıcı'nın yürürlükteki tüketici hukuku mevzuatı ve sair mevzuat kapsamında her anlamda bizzat sorumlu olduğunu kabul ve beyan eder.
                  </p>
                  
                  <p>
                    <strong>4.4.</strong> Üye, Websitesi üzerinde gerçekleştirdiği işlemlerde ve yazışmalarda, işbu Üyelik Sözleşmesi'nin hükümlerine, Websitesi'nde belirtilen tüm koşullara, yürürlükteki mevzuata ve ahlak kurallarına uygun olarak hareket edeceğini kabul ve beyan eder. Üye'nin Websitesi dâhilinde yaptığı işlem ve eylemlere ilişkin hukuki ve cezai sorumluluk kendisine aittir.
                  </p>
                  
                  <p>
                    <strong>4.5.</strong> Varmii.com, yürürlükteki mevzuat uyarınca yetkili makamların talebi halinde, Üye'nin kendisinde bulunan bilgilerini 6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca gerekli olduğu takdirde Üye'yi önceden bilgilendirmek suretiyle söz konusu makamlarla paylaşabilecektir.
                  </p>
                  
                  <p>
                    <strong>4.6.</strong> Üye'nin Hesabım Sayfası'na erişmek ve Websitesi üzerinden işlem gerçekleştirebilmek için ihtiyaç duyduğu kullanıcı adı ve şifre bilgisi, Üye tarafından oluşturulmakta olup, söz konusu bilgilerin güvenliği ve gizliliği tamamen Üye'nin sorumluluğundadır.
                  </p>
                  
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
                    <p className="font-semibold text-red-900 mb-2">4.7. Üye, Websitesi'ni aşağıda sayılan haller başta olmak üzere hukuka ve ahlaka aykırı bir şekilde kullanmayacaktır:</p>
                    <ul className="list-disc list-inside space-y-2 text-red-800">
                      <li>Yanlış bilgiler veya başka bir kişinin bilgileri kullanılarak işlem yapılması</li>
                      <li>Sahte veya yanıltıcı ilan oluşturulması</li>
                      <li>Platformu kötüye kullanarak haksız kazanç elde etmeye çalışılması</li>
                      <li>Virüs veya Websitesi'ne zarar verici teknoloji yayılması</li>
                      <li>Diğer üyeler hakkında izinsiz bilgi toplanması</li>
                      <li>Otomatik programlar (bot, crawler vb.) kullanılması</li>
                      <li>Kampanya ve avantajların kötü niyetle kullanılması</li>
                    </ul>
                  </div>
                  
                  <p>
                    <strong>4.8.</strong> Üye, Websitesi'nde yaptığı işlemleri Websitesi'ne teknik olarak hiçbir surette zarar vermeyecek şekilde yürütmekle yükümlüdür.
                  </p>
                </div>
              </section>

              {/* 5. SÖZLEŞME'NİN FESHİ */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. SÖZLEŞME'NİN FESHİ</h2>
                <p className="mb-3">
                  <strong>5.1.</strong> Taraflar'dan herhangi biri, işbu Üyelik Sözleşmesi'ni tek taraflı olarak ve tazminat ödemeksizin her zaman feshedilebilir. Böyle bir fesih halinde Taraflar fesih tarihine kadar doğmuş olan hak ve borçları karşılıklı olarak tamamen ifa edeceklerdir.
                </p>
                <p>
                  <strong>5.2.</strong> Varmii.com, Üye'nin işbu Üyelik Sözleşmesi'nin herhangi bir maddesini ihlal ettiğini tespit etmesi veya buna ilişkin makul bir şüphe duyması halinde üyeliği askıya alma, sonlandırma, dava ve takip haklarına sahiptir.
                </p>
              </section>

              {/* 6. GİZLİLİK VE KİŞİSEL VERİLERİN KORUNMASI */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. GİZLİLİK ve KİŞİSEL VERİLERİN KORUNMASI</h2>
                <div className="bg-green-50 border-l-4 border-green-500 p-4 space-y-3">
                  <p>
                    <strong>6.1.</strong> Varmii.com, Üye'nin Websitesi'nde sunulan Hizmetler'den yararlanabilmek için Websitesi üzerinden kendisine sağladığı kişisel verilerin 6698 sayılı Kişisel Verilerin Korunması Kanunu da dahil her türlü mevzuata uygun bir şekilde işlenmesine, güvenliğinin sağlanmasına ve korunmasına önem vermektedir.
                  </p>
                  <p>
                    <strong>6.2.</strong> Üye tarafından Websitesi'nde Üyelik oluşturmak veya Websitesi'nden faydalanmak amacıyla paylaşılan kişisel veriler; üyelik yükümlülüklerinin ifası, ödeme işlemlerinin gerçekleştirilmesi, sipariş teslimatlarının yapılması, müşteri hizmetleri işlemlerinin gerçekleştirilmesi amacıyla işlenmektedir.
                  </p>
                </div>
              </section>

              {/* 7. FİKRİ MÜLKİYET HAKLARI */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. FİKRİ MÜLKİYET HAKLARI</h2>
                <p>
                  Varmii.com markası ve logosu, Varmii.com mobil uygulamasının ve Websitesi'nin tasarımı, yazılımı, alan adı ve bunlara ilişkin olarak Varmii.com tarafından oluşturulan her türlü marka, tasarım, logo, ticari takdim şekli, slogan ve diğer tüm içeriğin her türlü fikri mülkiyet hakkı Varmii.com'un mülkiyetindedir. Üye, Varmii.com'un mülkiyetine tabi fikri mülkiyet haklarını Varmii.com'un izni olmaksızın kullanamaz, paylaşamaz, dağıtamaz, sergileyemez, çoğaltamaz veya bunlardan türemiş çalışmalar yapamaz.
                </p>
              </section>

              {/* 8. SÖZLEŞME DEĞİŞİKLİKLERİ */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. SÖZLEŞME DEĞİŞİKLİKLERİ</h2>
                <p>
                  Varmii.com, tamamen kendi takdirine bağlı olmak üzere, işbu Üyelik Sözleşmesi'ni ve Websitesi'nde yer alan her türlü politikayı, hüküm ve şartı uygun göreceği herhangi bir zamanda, yürürlükteki mevzuat hükümlerine aykırı olmamak kaydıyla Websitesi'nde ilan ederek tek taraflı olarak değiştirebilir. İşbu Üyelik Sözleşmesi'nin değişen hükümleri, Websitesi'nde ilan edildikleri tarihte geçerlilik kazanacak, geri kalan hükümler aynen yürürlükte kalarak hüküm ve sonuçlarını doğurmaya devam edecektir.
                </p>
              </section>

              {/* 9. MÜCBİR SEBEP */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. MÜCBİR SEBEP</h2>
                <p>
                  Ayaklanma, ambargo, devlet müdahalesi, isyan, işgal, savaş, seferberlik, grev, lokavt, siber saldırı, iletişim sorunları, altyapı ve internet arızaları, elektrik kesintisi, yangın, patlama, fırtına, sel, deprem, salgın veya diğer bir doğal felaket veya Varmii.com'un kontrolü dışında gerçekleşen, kusurundan kaynaklanmayan ve makul olarak öngörülemeyecek diğer olaylar ("Mücbir Sebep") Varmii.com'un işbu Üyelik Sözleşmesi'nden doğan yükümlülüklerini ifa etmesini engeller veya geciktirirse, Varmii.com ifası Mücbir Sebep sonucunda engellenen veya geciken yükümlülüklerinden dolayı sorumlu tutulamaz.
                </p>
              </section>

              {/* 10. MUHTELİF HÜKÜMLER */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. MUHTELİF HÜKÜMLER</h2>
                <div className="space-y-3">
                  <p>
                    <strong>10.1. Delil Sözleşmesi:</strong> Üye, işbu Üyelik Sözleşmesi'nden doğabilecek ihtilaflarda Varmii.com'un resmi defter ve ticari kayıtları ile veri tabanında, sunucularında tutulan e-arşiv kayıtlarının, elektronik bilgilerin, elektronik yazışmaların ve bilgisayar kayıtlarının, bağlayıcı, kesin ve münhasır delil teşkil edeceğini kabul eder.
                  </p>
                  <p>
                    <strong>10.2. Uygulanacak Hukuk ve Uyuşmazlıkların Çözümü:</strong> İşbu Üyelik Sözleşmesi münhasıran Türkiye Cumhuriyeti kanunlarına tabi olacaktır. İşbu Üyelik Sözleşmesi'nden kaynaklanan veya işbu Üyelik Sözleşmesi ile bağlantılı olan her türlü ihtilaf, yetkili Mahkemeler ve İcra Müdürlükleri'nin münhasır yargı yetkisinde olacaktır.
                  </p>
                  <p>
                    <strong>10.3. Bildirim:</strong> Varmii.com, Üye ile Üye'nin kayıt olurken bildirmiş olduğu elektronik posta adresi vasıtasıyla veya telefon numarasına arama yapmak ve SMS göndermek suretiyle iletişim kuracaktır. Üye, elektronik posta adresini ve telefon numarasını güncel tutmakla yükümlüdür.
                  </p>
                  <p>
                    <strong>10.4. Sözleşmenin Bütünlüğü ve Bölünebilirliği:</strong> İşbu Üyelik Sözleşmesi, konuya ilişkin olarak Taraflar arasındaki anlaşmanın tamamını oluşturmaktadır.
                  </p>
                  <p>
                    <strong>10.5. Sözleşmenin Devri:</strong> Üye, Varmii.com'un önceden yazılı onayını almaksızın işbu Üyelik Sözleşmesi'ndeki haklarını veya yükümlülüklerini tümüyle veya kısmen temlik edemeyecektir.
                  </p>
                </div>
              </section>

              {/* ONAY */}
              <section className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
                <p className="text-center font-semibold text-lg text-gray-900 mb-3">
                  📋 SÖZLEŞME ONAY BEYANNAMESİ
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  10 (on) maddeden ibaret bu Üyelik Sözleşmesi, Üye tarafından her bir hükmü okunarak ve bütünüyle anlaşılarak elektronik ortamda onaylanmak suretiyle yürürlüğe girmiştir. Varmii.com'a üye olmakla, işbu sözleşmenin tüm maddelerini okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmektesiniz.
                </p>
              </section>

              {/* İLETİŞİM */}
              <section className="bg-gray-100 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-3">📧 İletişim Bilgileri</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Platform:</strong> Varmii.com</p>
                  <p><strong>E-posta:</strong> destek@varmii.com</p>
                  <p><strong>Web:</strong> www.varmii.com</p>
                </div>
              </section>

              <div className="text-center text-sm text-gray-500 pt-6 border-t">
                <p>Son Güncelleme: {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="mt-2">© 2024 Varmii.com - Tüm hakları saklıdır.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


