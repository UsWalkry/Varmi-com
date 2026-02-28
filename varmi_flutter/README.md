# Varmi Flutter - Mobil Uygulama

Varmi.com platformunun resmi mobil uygulaması.

## Özellikler

- ✅ Kullanıcı girişi ve kayıt (JWT auth)
- ✅ İlan oluşturma ve listeleme
- ✅ Teklif verme ve yönetme
- ✅ Sipariş takibi
- ✅ Profil yönetimi
- ✅ Bildirimler (push notifications)
- ✅ Favoriler
- ✅ Komisyon sistemi
- ✅ Admin paneli (onaylama işlemleri)

## Kurulum

### Gereksinimler
- Flutter SDK 3.2.0+
- Dart SDK 3.2.0+
- Android Studio / Xcode
- Node.js (backend için)

### Backend Bağlantısı
Backend URL'i `lib/config/api_config.dart` dosyasından ayarlanabilir:

```dart
static const String baseUrl = 'https://api.varmii.com';
// veya local development için:
// static const String baseUrl = 'http://localhost:8787';
```

### Çalıştırma

```bash
# Bağımlılıkları yükle
flutter pub get

# Uygulamayı çalıştır
flutter run

# Release build (Android)
flutter build apk --release

# Release build (iOS)
flutter build ios --release
```

## Proje Yapısı

```
lib/
├── config/           # API ve uygulama ayarları
├── models/           # Data modelleri
├── providers/        # State management (Provider)
├── screens/          # Tüm ekranlar
│   ├── auth/         # Giriş, kayıt
│   ├── home/         # Ana sayfa
│   ├── listings/     # İlan ekranları
│   ├── offers/       # Teklif ekranları
│   ├── orders/       # Sipariş ekranları
│   └── profile/      # Profil ve ayarlar
├── services/         # API servisleri
├── utils/            # Yardımcı fonksiyonlar
├── widgets/          # Tekrar kullanılabilir widget'lar
└── main.dart         # Ana dosya
```

## Backend API

Uygulama mevcut Express/MySQL backend'i kullanır:
- Auth: `/api/auth/*`
- Listings: `/api/listings/*`
- Offers: `/api/offers/*`
- Orders: `/api/orders/*`
- Profile: `/api/users/*`

## Firebase Kurulumu (Opsiyonel)

Push notification için Firebase kurulumu:

1. Firebase Console'da proje oluştur
2. `google-services.json` (Android) ve `GoogleService-Info.plist` (iOS) indir
3. İlgili klasörlere ekle
4. Backend'e FCM token gönder

## Test

```bash
flutter test
```

## Deployment

### Android
```bash
flutter build appbundle --release
```
Google Play Console'a yükle.

### iOS
```bash
flutter build ios --release
```
Xcode ile Archive ve App Store Connect'e yükle.

## Lisans

Proprietary - Varmii.com
