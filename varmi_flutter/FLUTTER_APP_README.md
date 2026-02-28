# Varmi.com Flutter Mobil Uygulaması

Flutter ile geliştirilmiş Varmi.com mobil uygulaması. Bu uygulama, kullanıcıların ürün araması yapmasını, ilan oluşturmasını, teklif vermesini ve siparişleri yönetmesini sağlar.

## 🎯 Özellikler

### ✅ Tamamlanan Özellikler

#### Kimlik Doğrulama
- ✅ Kullanıcı kaydı
- ✅ Giriş yapma
- ✅ JWT token tabanlı kimlik doğrulama
- ✅ Otomatik oturum yönetimi

#### İlanlar
- ✅ İlan listesi görüntüleme (grid view)
- ✅ İlan detayları görüntüleme
- ✅ Yeni ilan oluşturma
- ✅ Kullanıcının kendi ilanlarını görüntüleme
- ✅ İlan silme
- ✅ Resim yükleme (max 5 resim)
- ✅ Favorilere ekleme/çıkarma
- ✅ Görüntülenme sayacı
- ✅ İlan durumu (aktif/pasif/onay bekliyor)

#### Teklifler
- ✅ İlana teklif verme
- ✅ Kullanıcının tekliflerini görüntüleme
- ✅ Teklif durumu takibi
- ✅ Teklifi geri çekme
- ✅ Admin onay sistemi entegrasyonu

#### Sipariş Yönetimi
- ✅ Alıcı siparişleri görüntüleme
- ✅ Satıcı siparişleri görüntüleme
- ✅ Sipariş detayları ve durum takibi
- ✅ Sipariş onaylama (alıcı)
- ✅ Hazırlamaya başlama (satıcı)
- ✅ Kargoya verme (satıcı)
- ✅ Teslimat onaylama (alıcı)
- ✅ Durum zaman çizelgesi

#### Profil
- ✅ Kullanıcı profili görüntüleme
- ✅ Profil düzenleme
- ✅ E-posta doğrulama durumu
- ✅ Çıkış yapma

#### Favoriler
- ✅ Favori ilanları listeleme
- ✅ Favorilerden çıkarma
- ✅ Hızlı detay görüntüleme

#### Navigasyon
- ✅ Alt navigasyon barı (Ana Sayfa, Favoriler, İlan Oluştur, Tekliflerim, Profil)
- ✅ Üst menü (İlanlarım, Siparişler, Bildirimler)
- ✅ Giriş gerektiren sayfalar için koruma

## 📱 Ekranlar

### Ana Ekranlar
1. **Ana Sayfa** - İlanları grid view ile gösterir
2. **Favoriler** - Favori ilanlar listesi
3. **İlan Oluştur** - Yeni ilan formu
4. **Tekliflerim** - Kullanıcının verdiği teklifler
5. **Profil** - Kullanıcı bilgileri ve ayarlar

### Alt Ekranlar
- **İlan Detay** - İlan detayları ve teklif verme
- **İlanlarım** - Kullanıcının oluşturduğu ilanlar
- **Siparişler** - Alım/satım siparişleri (tab view)
- **Sipariş Detay** - Sipariş bilgileri ve aksiyonlar
- **Profil Düzenle** - Kullanıcı bilgilerini güncelleme
- **Giriş** - Kullanıcı girişi
- **Kayıt** - Yeni kullanıcı kaydı

## 🏗️ Mimari

### Klasör Yapısı
```
lib/
├── config/          # Uygulama konfigürasyonu
├── models/          # Veri modelleri (User, Listing, Offer, Order)
├── providers/       # State management (AuthProvider)
├── screens/         # UI ekranları
│   ├── auth/       # Giriş/Kayıt
│   ├── home/       # Ana sayfa ve favoriler
│   ├── listings/   # İlan ekranları
│   ├── offers/     # Teklif ekranları
│   ├── orders/     # Sipariş ekranları
│   └── profile/    # Profil ekranları
├── services/        # API servisleri
│   ├── api_service.dart         # Temel API
│   ├── auth_service.dart        # Kimlik doğrulama
│   ├── listing_service.dart     # İlan işlemleri
│   ├── offer_service.dart       # Teklif işlemleri
│   └── order_service.dart       # Sipariş işlemleri
├── utils/           # Yardımcı fonksiyonlar
└── widgets/         # Paylaşılan UI bileşenleri
```

### State Management
- Provider paketi kullanılıyor
- `AuthProvider`: Kullanıcı oturumu ve kimlik doğrulama durumu

### API Entegrasyonu
- Backend: Express + MySQL (port 8787)
- Authentication: JWT token tabanlı
- Token localStorage'da saklanıyor
- Otomatik 401 yönlendirmesi

## 🚀 Kurulum

### Gereksinimler
- Flutter SDK (3.0+)
- Dart SDK
- Android Studio / VS Code
- iOS için Xcode (macOS)

### Adımlar

1. **Projeyi klonlayın**
```bash
cd varmi_flutter
```

2. **Bağımlılıkları yükleyin**
```bash
flutter pub get
```

3. **Backend'in çalıştığından emin olun**
Backend'in `http://localhost:8787` adresinde çalışıyor olması gerekiyor.

4. **Uygulamayı çalıştırın**
```bash
flutter run
```

## 📦 Kullanılan Paketler

```yaml
dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.1        # State management
  http: ^1.1.2            # HTTP istekleri
  shared_preferences: ^2.2.2  # Local storage
  image_picker: ^1.0.7    # Resim seçme
  cupertino_icons: ^1.0.6 # iOS iconları
```

## 🔧 Konfigürasyon

### API Endpoint
API base URL `lib/config/` klasöründe yapılandırılmıştır:
```dart
static const String baseUrl = 'http://localhost:8787/api';
```

**Önemli:** Production ortamı için bu URL'i değiştirmeyi unutmayın!

### Platform Ayarları

#### Android
- `android/app/src/main/AndroidManifest.xml` içinde internet izni ekli
- Minimum SDK: 21
- Target SDK: 34

#### iOS
- `ios/Runner/Info.plist` içinde kamera ve galeri izinleri ekli
- Minimum iOS: 12.0

## 🎨 Tema ve Tasarım

- Material Design 3
- Özel renk paleti
- Responsive tasarım
- Dark mode desteği (planlanan)

## 🔐 Güvenlik

- JWT token tabanlı kimlik doğrulama
- Token localStorage'da saklanıyor
- Otomatik token yenileme (planlanan)
- 401 hatalarında otomatik çıkış

## 📝 API Endpoints

### Auth
- `POST /auth/register` - Kayıt
- `POST /auth/login` - Giriş
- `GET /auth/me` - Kullanıcı bilgileri
- `PUT /auth/profile` - Profil güncelleme

### Listings
- `GET /listings` - İlan listesi
- `GET /listings/:id` - İlan detayı
- `POST /listings` - İlan oluştur
- `DELETE /listings/:id` - İlan sil
- `GET /listings/my` - Kullanıcının ilanları
- `POST /listings/:id/favorite` - Favorilere ekle/çıkar
- `GET /favorites` - Favori ilanlar

### Offers
- `GET /offers/listing/:id` - İlana ait teklifler
- `POST /offers` - Teklif oluştur
- `GET /offers/my` - Kullanıcının teklifleri
- `PUT /offers/:id/withdraw` - Teklifi geri çek

### Orders
- `GET /orders/buyer` - Alıcı siparişleri
- `GET /orders/seller` - Satıcı siparişleri
- `GET /orders/:id` - Sipariş detayı
- `PUT /orders/:id/confirm` - Siparişi onayla
- `PUT /orders/:id/start-processing` - Hazırlamaya başla
- `PUT /orders/:id/ship` - Kargoya ver
- `PUT /orders/:id/confirm-delivery` - Teslimatı onayla

## 🐛 Bilinen Sorunlar

- [ ] Resim yükleme bazen yavaş çalışabiliyor
- [ ] Bildirimler henüz implement edilmedi
- [ ] Offline mode desteklenmiyor

## 🔮 Gelecek Özellikler

- [ ] Push notifications
- [ ] Real-time chat
- [ ] Dark mode
- [ ] Çoklu dil desteği
- [ ] Gelişmiş arama ve filtreleme
- [ ] Kullanıcı değerlendirmeleri
- [ ] Google/Apple ile giriş
- [ ] Offline çalışma modu
- [ ] Sipariş izleme haritası

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje özel bir projedir.

## 📧 İletişim

Sorularınız için: [varmi.com](https://varmi.com)

---

**Not:** Bu uygulama aktif geliştirme aşamasındadır. Özellikler ve API endpointleri değişebilir.
