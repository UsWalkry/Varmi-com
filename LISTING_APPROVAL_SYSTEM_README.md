# Admin Listing Approval System - İlan Onay Sistemi

## 🎯 Genel Bakış

Bu sistem, kullanıcıların girdiği yeni ilanların admin onayından geçtikten sonra yayına çıkmasını sağlar.

## ✨ Özellikler

### 1. İlan Durumları
- **Pending (Beklemede)**: Yeni ilan girildiğinde varsayılan durum
- **Approved (Onaylandı)**: Admin tarafından onaylanmış, aktif olarak yayında
- **Rejected (Reddedildi)**: Admin tarafından reddedilmiş, sebep ile birlikte

### 2. Admin Özellikleri
- ✅ Onay bekleyen ilanları görüntüleme
- ✅ İlanları onaylama (yayına alma)
- ❌ İlanları reddetme (sebep belirtme)
- 📊 Onaylanan/reddedilen ilanların geçmişi
- 📧 Kullanıcılara otomatik email bildirimi

### 3. Kullanıcı Deneyimi
- 📝 İlan girildikten sonra "Admin onayı bekleniyor" mesajı
- ✅ Onaylandığında email ile bildirim
- ❌ Reddedildiğinde sebep ile birlikte email
- 🔄 Reddedilen ilanı düzenleyip tekrar gönderme

## 📦 Kurulum

### Adım 1: Veritabanı Şemasını Güncelleyin

**Otomatik Kurulum (Önerilen):**
```powershell
cd server
.\install-approval-system.ps1
```

**Manuel Kurulum:**
```bash
# MySQL'e bağlanın
mysql -u root -p

# Veritabanını seçin
USE varmi_db;

# SQL script'i çalıştırın
SOURCE c:/Users/Burak AYDIN/Desktop/Varmi-com-sql/add_listing_approval_system.sql;
```

### Adım 2: Backend'i Yeniden Başlatın
```bash
cd server
pnpm dev
```

### Adım 3: Frontend'i Yeniden Başlatın
```bash
cd shadcn-ui
pnpm dev
```

## 🔧 Teknik Detaylar

### Veritabanı Değişiklikleri

#### listings tablosu - Yeni alanlar:
```sql
approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
approved_by VARCHAR(36) NULL  -- Admin user ID
approved_at TIMESTAMP NULL
rejection_reason TEXT NULL
```

#### Yeni tablolar:
- `listing_approval_audit` - Onay/red işlemlerinin audit kaydı
- `admin_notifications` - Admin bildirimleri
- `pending_listings_view` - Onay bekleyen ilanlar view'ı

### API Endpoints

#### Admin Endpoints:
```
GET    /api/admin/listings/pending        # Onay bekleyen ilanlar
POST   /api/admin/listings/approve/:id    # İlanı onayla
POST   /api/admin/listings/reject/:id     # İlanı reddet (reason gerekli)
GET    /api/admin/listings/approved       # Onaylanmış ilanlar
GET    /api/admin/listings/rejected       # Reddedilmiş ilanlar
```

#### Frontend API (mysqlAPI):
```typescript
mysqlAPI.getAdminPendingListings()        // Onay bekleyen ilanlar
mysqlAPI.approveListing(listingId)        // İlanı onayla
mysqlAPI.rejectListing(listingId, reason) // İlanı reddet
```

### Email Bildirimleri

#### Onay Emaili:
- ✅ İlan başlığı ile birlikte onay mesajı
- 🔗 Dashboard linki
- 💚 Yeşil tema

#### Red Emaili:
- ❌ Red sebebi açıklaması
- 🔧 Düzenleme linki
- 🔴 Kırmızı tema

## 📋 Kullanım Senaryoları

### 1. Kullanıcı İlan Girer
```
1. Kullanıcı formu doldurur
2. İlan `approval_status='pending'` ve `status='inactive'` olarak kaydedilir
3. Admin bildirimi oluşturulur
4. Kullanıcıya "Onay bekleniyor" mesajı gösterilir
```

### 2. Admin İlanı Onaylar
```
1. Admin pending ilanları görür
2. "Onayla" butonuna tıklar
3. İlan `approval_status='approved'` ve `status='active'` olur
4. Audit kaydı oluşturulur
5. Kullanıcıya email gönderilir
6. İlan yayına çıkar
```

### 3. Admin İlanı Reddeder
```
1. Admin pending ilanları görür
2. Reddetme sebebi yazar
3. "Reddet" butonuna tıklar
4. İlan `approval_status='rejected'` olur
5. Audit kaydı oluşturulur (sebep ile birlikte)
6. Kullanıcıya sebep ile birlikte email gönderilir
```

## 🔍 Test Etme

### 1. Yeni İlan Oluşturma Testi
```typescript
// Frontend'de yeni ilan oluştur
const result = await mysqlAPI.createListing({
  title: "Test İlan",
  description: "Test açıklama",
  category: "elektronik",
  budgetMax: 1000,
  city: "İstanbul",
  // ... diğer alanlar
});

// Beklenen sonuç:
// result.data.requiresApproval === true
// result.data.message içinde "admin onayı" geçmeli
```

### 2. Admin Onay Testi
```bash
# Admin olarak giriş yap
# Dashboard -> Admin Panel -> Onay Bekleyen İlanlar
# İlanı onayla veya reddet
```

### 3. Email Testi
```bash
# server/.env dosyasında SMTP ayarlarını kontrol et
# İlan onaylandığında/reddedildiğinde email kontrolü yap
```

## 🐛 Sorun Giderme

### Sorun: "approval_status column not found"
```bash
# Veritabanı şemasını kontrol et
DESCRIBE listings;

# Eksikse tekrar çalıştır
SOURCE add_listing_approval_system.sql;
```

### Sorun: Admin endpoints 403 hatası veriyor
```bash
# Kullanıcının admin olduğundan emin ol
UPDATE users SET role='admin' WHERE email='admin@example.com';
```

### Sorun: Email gönderilmiyor
```bash
# SMTP ayarlarını kontrol et
# server/.env
SMTP_HOST=mail.varmii.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@varmii.com
SMTP_PASS=***
```

## 📚 Dosya Listesi

### SQL:
- `add_listing_approval_system.sql` - Ana schema güncellemesi

### Backend:
- `server/src/routes/admin.ts` - Admin approval endpoints
- `server/src/routes/listings.ts` - Create listing güncellendi
- `server/src/services/emailService.ts` - Approval/rejection emails

### Frontend:
- `shadcn-ui/src/lib/mysql-api.ts` - API client metotları

### Scripts:
- `server/install-approval-system.ps1` - Otomatik kurulum scripti

## 🎨 Frontend Geliştirme (Gelecek)

Admin paneline şu bileşenleri eklemek gerekecek:

```typescript
// PendingListingsTable.tsx
- Onay bekleyen ilanları listele
- Her ilan için Onayla/Reddet butonları
- Reddetme modal'ı (sebep girme)

// ApprovedListingsTable.tsx  
- Onaylanmış ilanlar listesi
- Onaylayan admin ve tarih bilgisi

// RejectedListingsTable.tsx
- Reddedilen ilanlar listesi
- Red sebebi gösterimi
```

## ✅ Başarılı Kurulum Kontrolü

```sql
-- 1. Yeni alanları kontrol et
DESCRIBE listings;
-- approval_status, approved_by, approved_at, rejection_reason görünmeli

-- 2. Yeni tabloları kontrol et
SHOW TABLES LIKE '%approval%';
-- listing_approval_audit görünmeli

SHOW TABLES LIKE 'admin_notifications';
-- admin_notifications görünmeli

-- 3. View'ı kontrol et
SELECT * FROM pending_listings_view LIMIT 1;
-- Hata vermemeli

-- 4. Test ilanı oluştur
INSERT INTO listings (...) VALUES (...);
-- approval_status varsayılan olarak 'pending' olmalı
```

## 🚀 Deployment

Canlı ortama almadan önce:

1. ✅ Veritabanı backup'ı alın
2. ✅ Test ortamında test edin
3. ✅ Admin kullanıcılarının `role='admin'` olduğundan emin olun
4. ✅ SMTP ayarlarının doğru olduğundan emin olun
5. ✅ Frontend deployment'ta yeni API endpoints'leri kullanın

---

**© 2025 Varmii.com - Admin Listing Approval System**
