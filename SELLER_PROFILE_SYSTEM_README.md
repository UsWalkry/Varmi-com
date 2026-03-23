# Satıcı Profili Sistemi

## 🎯 Genel Bakış

Kullanıcılar artık **teklif verebilmek için** onaylanmış bir satıcı profiline sahip olmalıdır. Bu sistem, platform kalitesini artırmak ve güvenilir satıcılar ile alıcıları bir araya getirmek için tasarlanmıştır.

## ✨ Özellikler

### Kullanıcı Tarafı

1. **Profil Yönetimi**
   - Kullanıcı profili iki bölüme ayrıldı:
     - **Kullanıcı Profili**: Genel bilgiler, adres, güvenlik, bildirimler
     - **Satıcı Profili**: Mağaza bilgileri, vergi levhası, ticari bilgiler

2. **Satıcı Profili Oluşturma**
   - Mağaza adı ve açıklaması
   - İşletme tipi (Şahıs/Şirket)
   - Vergi dairesi ve vergi numarası
   - Şirketler için: Ticaret sicil no, MERSİS no
   - İletişim bilgileri
   - Banka bilgileri (opsiyonel)

3. **Onay Süreci**
   - Profil kaydedildiğinde admin panele düşer
   - Admin onayı/reddi sonrası email bildirimi
   - Onaylanan kullanıcılar teklif verebilir
   - Reddedilen kullanıcılar profili düzenleyip tekrar gönderebilir

4. **Teklif Verme Kontrolü**
   - Onaylı satıcı profili olmayan kullanıcılar teklif veremez
   - Teklif modal'ında otomatik kontrol
   - Eksik profil durumunda yönlendirme

### Admin Tarafı

1. **Satıcı Profilleri Yönetimi** (`/admin/seller-profiles`)
   - Bekleyen, onaylanan, reddedilen ve askıya alınan profiller
   - Detaylı profil inceleme
   - Onay/red işlemleri
   - Red nedeni belirtme (email ile kullanıcıya iletilir)
   - Profil askıya alma/askıdan kaldırma

2. **Email Bildirimleri**
   - Profil onaylandığında kutlama email'i
   - Profil reddedildiğinde red nedeni ile email
   - Profesyonel HTML template'ler

3. **Audit Sistem**
   - Tüm onay/red işlemleri loglanır
   - Admin bildirimleri için yeni tip: `seller_profile_pending`

## 📁 Dosya Yapısı

### Backend

```
server/src/
├── routes/
│   ├── sellerProfile.ts           # Satıcı profili CRUD API
│   ├── admin.ts                   # Admin onay endpoint'leri eklendi
│   └── offers.ts                  # Teklif verme kontrolü eklendi
├── services/
│   └── emailService.ts            # Email template'leri eklendi
└── index.ts                       # Route eklendi
```

### Frontend

```
shadcn-ui/src/
├── pages/
│   ├── Profile.tsx                # Satıcı profili tab'ı eklendi
│   └── AdminSellerProfiles.tsx    # Admin satıcı profilleri sayfası (YENİ)
├── components/
│   ├── profile/
│   │   └── SellerProfileTab.tsx   # Satıcı profili formu (YENİ)
│   ├── AdminLayout.tsx            # Menüye eklendi
│   └── CreateOfferModal.tsx       # Satıcı profili kontrolü eklendi
├── lib/
│   └── mysql-api.ts               # API fonksiyonları eklendi
└── App.tsx                        # Route eklendi
```

### Database

```sql
create_seller_profile_system.sql              # Ana tablo yapısı
update_admin_notifications_seller_profile.sql # Admin bildirimleri güncellemesi
```

## 🗄️ Veritabanı Tabloları

### `seller_profiles`
Satıcı profil bilgilerini saklar. Ana alanlar:
- Mağaza bilgileri (ad, açıklama, logo)
- İşletme bilgileri (tip, vergi no, MERSİS no vb.)
- İletişim bilgileri
- Banka bilgileri
- Onay durumu (`pending`, `approved`, `rejected`, `suspended`)
- Red/askıya alma nedeni

### `seller_profile_approval_audit`
Tüm onay/red işlemlerinin geçmişini tutar.

### `seller_reviews` (Gelecek)
Satıcı değerlendirmeleri için hazırlanmış tablo.

### `users` Güncellemeleri
- `seller_profile_id`: Satıcı profil referansı
- `is_verified_seller`: Hızlı kontrol için flag (0/1)

## 🔌 API Endpoints

### Kullanıcı Endpoints

**GET** `/api/seller-profile/my-profile`
- Kullanıcının kendi satıcı profilini getirir

**GET** `/api/seller-profile/profile/:userId`
- Public endpoint - onaylı satıcı profillerini görüntüler

**POST** `/api/seller-profile/profile`
- Satıcı profili oluştur/güncelle
- Otomatik olarak `pending` duruma alır

**DELETE** `/api/seller-profile/profile`
- Satıcı profilini sil

**GET** `/api/seller-profile/can-make-offer`
- Kullanıcının teklif verip veremeyeceğini kontrol eder

### Admin Endpoints

**GET** `/api/admin/seller-profiles?status=pending`
- Satıcı profillerini listeler (status filtrelenebilir)

**GET** `/api/admin/seller-profiles/:profileId`
- Detaylı profil bilgisi + audit log

**POST** `/api/admin/seller-profiles/:profileId/approve`
- Profili onayla
- Kullanıcıya `is_verified_seller = 1` atar
- Email gönderir

**POST** `/api/admin/seller-profiles/:profileId/reject`
- Profili reddet
- Red nedenini kaydet
- Email gönderir

**POST** `/api/admin/seller-profiles/:profileId/suspend`
- Profili askıya al

**POST** `/api/admin/seller-profiles/:profileId/unsuspend`
- Askıyı kaldır

## 🚀 Kurulum

### 1. Veritabanı Güncellemeleri

```bash
# Ana tabloları oluştur
mysql -u root -p varmi_db < create_seller_profile_system.sql

# Admin bildirimleri güncelle
mysql -u root -p varmi_db < update_admin_notifications_seller_profile.sql
```

### 2. Backend

Değişiklik yok - zaten mevcut route'lar otomatik yüklenecek.

### 3. Frontend

```bash
cd shadcn-ui
pnpm install  # Eğer yeni dependency eklenirse
pnpm dev
```

## 📝 Kullanım Senaryosu

### Yeni Satıcı

1. Kullanıcı siteye kayıt olur
2. Profil sayfasında "Satıcı Profili" tab'ına tıklar
3. Gerekli bilgileri doldurur ve "Kaydet" der
4. Profil `pending` durumda admin panele düşer
5. Admin profili inceler ve:
   - **Onayla** → Kullanıcı email alır, teklif verebilir hale gelir
   - **Reddet** → Kullanıcı red nedeni ile email alır, profili düzenleyip tekrar gönderebilir

### Teklif Verme

1. Kullanıcı bir ilana teklif vermek ister
2. Sistem otomatik satıcı profili kontrolü yapar
3. Eğer profil yoksa veya onaylı değilse:
   - Uyarı mesajı gösterir
   - "Profil Oluştur" butonu ile yönlendirir
4. Profil onaylıysa teklif verebilir

## ⚙️ Konfigürasyon

### Environment Variables

Backend `.env` dosyasında email ayarlarının yapılandırıldığından emin olun:

```env
SMTP_HOST=mail.varmii.com
SMTP_PORT=465
SMTP_USER=noreply@varmii.com
SMTP_PASS=your_password
SMTP_SECURE=true
FRONTEND_URL=https://varmii.com.tr
```

## 🎨 UI/UX Özellikleri

- Responsive tasarım (mobil uyumlu)
- Status badge'leri (Onaylandı, Bekliyor, Reddedildi, Askıya Alındı)
- Red/askıya alma nedenlerini gösterme
- Profil oluşturma formunda adım adım validasyon
- Admin panelde filtreleme (pending, approved, rejected, suspended)
- Toast bildirimleri ile kullanıcı yönlendirme

## 🔒 Güvenlik

- Tüm endpoint'ler `authenticateToken` middleware ile korumalı
- Admin endpoint'leri ek `adminOnly` kontrolü ile korumalı
- Satıcı profili kontrolü backend'de de yapılır (sadece frontend kontrolüne güvenilmez)
- SQL injection korumalı (parametreli sorgular)
- XSS korumalı (input sanitization)

## 📊 Metrikler

Admin dashboard'da gelecekte eklenebilecek metrikler:
- Toplam satıcı sayısı
- Bekleyen başvuru sayısı
- Onaylanma/red oranları
- Ortalama onay süresi

## 🐛 Bilinen Sorunlar

Şu anda bilinen bir sorun bulunmamaktadır.

## 🔄 Gelecek Geliştirmeler

- [ ] Satıcı değerlendirme sistemi
- [ ] Satıcı istatistikleri (toplam satış, başarı oranı vb.)
- [ ] Belge yükleme sistemi (vergi levhası, ticaret sicil gazetesi vb.)
- [ ] Otomatik onay sistemi (belirli kriterleri sağlayan satıcılar için)
- [ ] Satıcı seviye sistemi (Bronze, Silver, Gold vb.)
- [ ] Toplu onay/red işlemleri

## 📞 Destek

Herhangi bir sorun için:
- GitHub Issues
- Email: destek@varmii.com.tr

---

**Son Güncelleme:** 21 Ocak 2026
**Versiyon:** 1.0.0
