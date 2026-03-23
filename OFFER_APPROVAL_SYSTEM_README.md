# Teklif Onay Sistemi (Offer Approval System)

## 📋 Genel Bakış

Teklif onay sistemi, kullanıcıların verdiği tekliflerin admin tarafından onaylanmasını gerektirir. Bu sistem ile:
- ✅ Tüm yeni teklifler admin onayına düşer
- ✅ Teklifler düzenlendiğinde tekrar onaya gider
- ✅ Admin teklifleri onaylayabilir veya reddedebilir
- ✅ Kullanıcılar tekliflerinin durumunu görebilir

## 🗄️ Veritabanı Değişiklikleri

### Yeni Kolonlar (`offers` tablosu)
```sql
approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
approved_by VARCHAR(36) NULL
approved_at TIMESTAMP NULL
rejection_reason TEXT NULL
```

### Yeni Tablolar

#### 1. `offer_approval_audit`
Teklif onay/red işlemlerinin audit kaydı
```sql
- id (UUID)
- offer_id (UUID)
- action (approved/rejected/resubmitted)
- performed_by (admin user_id)
- reason (red sebebi)
- created_at
```

#### 2. `admin_notifications` (güncellendi)
Admin bildirim tablosuna yeni tipler eklendi:
- `new_offer` - Yeni teklif onay bekliyor
- `offer_resubmitted` - Teklif güncellendi, tekrar onay bekliyor

Yeni kolon:
- `offer_id VARCHAR(36)` - Teklifle ilişki

### View

#### `pending_offers_view`
Onay bekleyen tekliflerin detaylı görünümü:
- Teklif bilgileri
- Satıcı bilgileri
- İlan bilgileri
- İlan sahibi bilgileri

## 🚀 Kurulum

### 1. SQL Script'i Çalıştır
```bash
mysql -u root -p varmi < add_offer_approval_system.sql
```

### 2. Backend'i Yeniden Başlat
```bash
cd server
npm run dev
```

### 3. Frontend'i Yeniden Başlat
```bash
cd shadcn-ui
npm run dev
```

## 📡 API Endpoints

### Admin Endpoints

#### Onay Bekleyen Teklifler
```http
GET /api/admin/pending-offers
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "productName": "iPhone 15 Pro",
      "price": 45000,
      "sellerName": "Ahmet Yılmaz",
      "listingTitle": "iPhone Aranıyor",
      "approvalStatus": "pending",
      ...
    }
  ]
}
```

#### Teklifi Onayla
```http
POST /api/admin/offers/:offerId/approve
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Teklif onaylandı ve aktif hale getirildi"
}
```

#### Teklifi Reddet
```http
POST /api/admin/offers/:offerId/reject
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "reason": "Ürün açıklaması yetersiz"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Teklif reddedildi"
}
```

## 🎯 İş Akışı

### Yeni Teklif Oluşturma
1. Kullanıcı teklif oluşturur
2. Teklif `approval_status='pending'` ve `status='inactive'` olarak kaydedilir
3. Admin'e bildirim gönderilir (`admin_notifications`)
4. Kullanıcı "Admin onayı bekleniyor" mesajı görür

### Teklif Düzenleme
1. Kullanıcı aktif teklifini düzenler
2. Teklif tekrar `approval_status='pending'` ve `status='inactive'` olur
3. Admin'e yeni bildirim gönderilir (`offer_resubmitted`)
4. Audit kaydı oluşturulur

### Admin Onay
1. Admin pending offers listesini görür
2. Teklif detaylarını inceler
3. Onaylar veya reddeder
4. **Onay:** `approval_status='approved'`, `status='active'`
5. **Red:** `approval_status='rejected'`, `status='rejected'`, `rejection_reason` kaydedilir
6. Audit kaydı oluşturulur

## 🎨 Kullanıcı Arayüzü

### Panelim - Tekliflerim Sekmesi

Kullanıcı kendi tekliflerinde şu bilgileri görür:

#### Onay Durumu Badge'leri:
- 🟠 **Pending**: "⏳ Admin Onayı Bekleniyor" (turuncu)
- ✅ **Approved**: "✅ Onaylandı" (yeşil)
- ❌ **Rejected**: "❌ Reddedildi" (kırmızı)

#### Teklif Durumu Badge'leri:
- ⚪ **Inactive**: Pasif (onay bekleniyor)
- 🟠 **Active**: Aktif (onaylandı, görünür)
- 🟢 **Accepted**: İlan sahibi kabul etti
- 🔴 **Rejected**: İlan sahibi reddetti
- ⚪ **Withdrawn**: Kullanıcı geri çekti

#### Red Durumu
Teklif reddedildiğinde kırmızı kutucukta red sebebi gösterilir:
```
❌ Red Sebebi: Ürün açıklaması yetersiz. Lütfen daha detaylı bilgi ekleyiniz.
```

### Düzenleme Kısıtlamaları
- ❌ Sadece `status='active'` ve `approval_status='approved'` teklifler düzenlenebilir
- ✅ Düzenleme sonrası tekrar onaya düşer
- ⚠️ Pending veya rejected teklifler düzenlenemez

## 📊 Admin Dashboard

Admin panelinde yeni bölümler:

### Bekleyen Teklifler (Pending Offers)
- Onay bekleyen tüm teklifler
- Teklif detayları, satıcı bilgileri, ilan bilgileri
- Hızlı onay/red butonları

### İstatistikler
- Toplam bekleyen teklif sayısı
- Onaylanan/Reddedilen teklif sayıları
- Ortalama onay süresi

## 🔔 Bildirimler

### Admin Bildirimleri
1. **new_offer**: Yeni teklif oluşturuldu
   - Başlık: "Yeni Teklif Onay Bekliyor"
   - Mesaj: "{satıcı_adı} bir teklif verdi. İncelemeniz gerekiyor."

2. **offer_resubmitted**: Teklif güncellendi
   - Başlık: "Teklif Güncellendi - Onay Bekliyor"
   - Mesaj: "Bir teklif güncellendi ve yeniden onay bekliyor."

### Kullanıcı Bildirimleri (Toast)
- ✅ "Teklifiniz başarıyla gönderildi! Admin onayından sonra yayınlanacaktır."
- ✅ "Teklifiniz başarıyla güncellendi. Admin onayından sonra yayınlanacaktır."

## 🛡️ Güvenlik

- Admin middleware kontrolü (`adminOnly`)
- Token authentication (`authenticateToken`)
- Sadece teklif sahibi düzenleyebilir
- Sadece admin onaylayabilir/reddedebilir
- Audit trail tüm işlemler için

## 📝 Değişiklik Geçmişi

### v1.0.0 (2025-10-22)
- ✅ İlk versiyon oluşturuldu
- ✅ Teklif onay sistemi eklendi
- ✅ Admin endpoints hazırlandı
- ✅ Kullanıcı arayüzü güncellendi
- ✅ Bildirim sistemi entegre edildi

## 🔄 İlan Onay Sistemi ile Karşılaştırma

| Özellik | İlan Onay | Teklif Onay |
|---------|-----------|-------------|
| Onay Mekanizması | ✅ | ✅ |
| Düzenleme Sonrası Onay | ✅ | ✅ |
| Red Sebebi | ✅ | ✅ |
| Audit Trail | ✅ | ✅ |
| Admin Bildirimleri | ✅ | ✅ |
| Kullanıcı Badge'leri | ✅ | ✅ |

## 🚧 Gelecek Geliştirmeler

- [ ] Email bildirimleri (onay/red)
- [ ] Toplu onay işlemleri
- [ ] Otomatik spam filtreleme
- [ ] Teklif kalite skoru
- [ ] Analitik raporları

## 📞 Destek

Sorularınız için:
- Backend: `server/src/routes/offers.ts`, `server/src/routes/admin.ts`
- Frontend: `shadcn-ui/src/components/EditOfferModal.tsx`, `shadcn-ui/src/pages/Dashboard.tsx`
- API: `shadcn-ui/src/lib/mysql-api.ts`
