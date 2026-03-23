# Admin İlan Onay Sistemi - UI Güncellemesi

## 🎯 Yapılan Değişiklikler

### 1. AdminListings.tsx Güncellemesi

#### Eklenen Özellikler:
- ✅ **Onay Durumu Kolonu**: İlanların onay durumunu gösteren yeni kolon
- ✅ **Onaylama/Reddetme İşlemleri**: İşlemler dropdown menüsünde yeni aksiyonlar
- ✅ **Onay Filtreleme**: Onay durumuna göre filtreleme seçeneği
- ✅ **İstatistikler**: Onay bekleyen ilanların sayısını gösteren kart
- ✅ **Onaylama Modalı**: İlan onaylama için onay dialogu
- ✅ **Reddetme Modalı**: Red nedeni girişi ile reddetme dialogu

#### Değişiklikler:

**1. Interface Güncellemesi**
```typescript
interface Listing {
  // ... mevcut alanlar
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}
```

**2. Yeni State'ler**
- `selectedApprovalStatus`: Onay durumu filtresi
- `showApproveDialog`: Onaylama dialogu kontrolü
- `showRejectDialog`: Reddetme dialogu kontrolü
- `rejectionReason`: Red nedeni

**3. Yeni Helper Fonksiyonlar**
- `getApprovalStatusText()`: Onay durumu metni
- `getApprovalStatusColor()`: Onay durumu badge rengi
- `handleApproveListing()`: İlan onaylama işlemi
- `handleRejectListing()`: İlan reddetme işlemi

**4. UI Bileşenleri**
- Onay Durumu kolonu tabloya eklendi
- Onay durumu filtre dropdown'u eklendi
- "Onay Bekliyor" istatistik kartı eklendi
- İşlemler menüsüne "İlanı Onayla" ve "İlanı Reddet" seçenekleri eklendi

## 📋 Kullanım Senaryoları

### Senaryo 1: Yeni İlan Onaylama
1. Admin panelde **İlanlar** sayfasına git
2. **Onay Bekliyor** filtresiyle pending ilanları göster
3. İlan satırındaki **İşlemler** (⋮) butonuna tıkla
4. **İlanı Onayla** seçeneğini seç
5. Onay dialogunda **Onayla ve Yayınla** butonuna tıkla
6. ✅ İlan onaylanır, `approval_status='approved'` ve `status='active'` olur
7. 📧 Kullanıcıya onay e-postası gönderilir

### Senaryo 2: İlan Reddetme
1. Admin panelde **İlanlar** sayfasına git
2. **Onay Bekliyor** filtresiyle pending ilanları göster
3. İlan satırındaki **İşlemler** (⋮) butonuna tıkla
4. **İlanı Reddet** seçeneğini seç
5. Red nedeni text alanına açıklama gir (zorunlu)
6. **Reddet** butonuna tıkla
7. ❌ İlan reddedilir, `approval_status='rejected'`
8. 📧 Kullanıcıya red nedeniyle birlikte e-posta gönderilir

### Senaryo 3: Filtreleme ve İnceleme
1. **Onay Bekliyor** filtresini seç → Sadece pending ilanlar
2. **Onaylandı** filtresini seç → Onaylanmış ilanlar
3. **Reddedildi** filtresini seç → Reddedilen ilanlar (red nedeni gösterilir)
4. Arama kutusuna kelime gir → Tüm alanlarda arama yapar

## 🎨 UI Elementleri

### Onay Durumu Badge Renkleri
- 🟡 **Onay Bekliyor** (pending): Sarı
- 🟢 **Onaylandı** (approved): Yeşil
- 🔴 **Reddedildi** (rejected): Kırmızı

### İstatistik Kartları
```
┌─────────────┬──────────────┬────────────┬──────────┬───────────┐
│ Toplam İlan │ Onay Bekliyor│ Aktif İlan │ Askıda   │ Bu Hafta  │
│     156     │      23      │     98     │    5     │    34     │
└─────────────┴──────────────┴────────────┴──────────┴───────────┘
```

### Tablo Yapısı
```
┌────────┬──────────┬────────┬────────┬──────────────┬──────────┬─────────────┬────────┬──────────┐
│  İlan  │ Kategori │ Bütçe  │ Durum  │ Onay Durumu  │ İlan     │ İstatistikler│ Tarih  │ İşlemler │
│        │          │        │        │              │ Sahibi   │              │        │          │
├────────┼──────────┼────────┼────────┼──────────────┼──────────┼─────────────┼────────┼──────────┤
│ [IMG]  │ Elektronik│25,000₺│ Pasif  │ 🟡 Onay     │ Ahmet K. │ 📊 3 teklif │ 2 saat │   ⋮     │
│ iPhone │          │'ye kadar│        │   Bekliyor  │          │ 👁️ 45 görünt│  önce  │          │
│  15    │          │        │        │              │          │ ❤️ 12 favori│        │          │
└────────┴──────────┴────────┴────────┴──────────────┴──────────┴─────────────┴────────┴──────────┘
```

## 🔌 Backend Entegrasyonu

### API Endpoint'leri (Zaten Mevcut)
```typescript
// İlan Onaylama
POST /api/admin/listings/approve/:id
Response: { success: true, message: '...' }

// İlan Reddetme  
POST /api/admin/listings/reject/:id
Body: { reason: 'Red nedeni açıklaması' }
Response: { success: true, message: '...' }

// Pending İlanları Listeleme
GET /api/admin/listings/pending
Response: { success: true, listings: [...] }
```

### Frontend API Client (mysqlAPI)
```typescript
// Zaten eklenmiş metodlar
mysqlAPI.approveListing(listingId)
mysqlAPI.rejectListing(listingId, reason)
mysqlAPI.getAdminPendingListings()
```

## 🧪 Test Senaryoları

### Test 1: Pending İlanı Görüntüleme
- [ ] Admin panelde pending ilanlar listeleniyor
- [ ] Onay durumu sarı badge ile gösteriliyor
- [ ] İstatistik kartında doğru sayı gösteriliyor

### Test 2: İlan Onaylama
- [ ] Onaylama modalı açılıyor
- [ ] API çağrısı başarılı
- [ ] Toast mesajı gösteriliyor
- [ ] İlan listesi yenileniyor
- [ ] İlan aktif hale geliyor

### Test 3: İlan Reddetme
- [ ] Reddetme modalı açılıyor
- [ ] Red nedeni textarea'sı var
- [ ] Boş red nedeni ile submit bloklanıyor
- [ ] API çağrısı başarılı
- [ ] Toast mesajı gösteriliyor
- [ ] İlan listesi yenileniyor
- [ ] Tabloda red nedeni gösteriliyor

### Test 4: Filtreleme
- [ ] Onay durumu filtreleri çalışıyor
- [ ] Filtreler kombine ediliyor (durum + onay durumu + arama)
- [ ] Tablo doğru sayıda satır gösteriyor

## 📁 Değişen Dosyalar

```
shadcn-ui/src/pages/AdminListings.tsx
├── Interface güncellemeleri
├── Yeni state'ler
├── Yeni helper fonksiyonlar
├── UI güncellemeleri (tablo, filtreler, dialoglar)
└── Backend entegrasyonu
```

## 🚀 Deployment

### Frontend (Zaten Deploy Edilmiş)
- mysqlAPI metodları zaten prod'da mevcut
- Backend endpoints zaten çalışıyor
- Sadece frontend UI güncellemesi gerekiyor

### Test Etme Adımları
```bash
# 1. Frontend dev server'ı başlat
cd shadcn-ui
pnpm dev

# 2. Admin kullanıcısı ile giriş yap

# 3. /admin/listings sayfasına git

# 4. Test ilanını kontrol et:
# - Onay bekliyor durumunda mı?
# - İşlemler menüsünde onay/red seçenekleri var mı?
# - Onaylama/reddetme işlevleri çalışıyor mu?
```

## ✨ Öne Çıkan Özellikler

1. **Kullanıcı Dostu UI**: Modern, temiz ve anlaşılır arayüz
2. **Görsel Geri Bildirim**: Renkli badge'ler ve ikonlar
3. **Detaylı Bilgi**: Red nedenleri tabloda gösteriliyor
4. **Hızlı Filtreleme**: Çoklu filtre seçenekleri
5. **Toast Bildirimleri**: İşlem sonuçları anında gösteriliyor
6. **Responsive Tasarım**: Mobil ve desktop uyumlu
7. **Güvenli İşlemler**: Onay dialogları ile kazara tıklamaları önleme

## 🔄 İş Akışı

```mermaid
User Creates Listing → approval_status='pending', status='inactive'
                            ↓
                    Admin Reviews in Panel
                            ↓
                ┌───────────┴───────────┐
                ↓                       ↓
         APPROVE                    REJECT
                ↓                       ↓
    approval_status='approved'   approval_status='rejected'
    status='active'              status='inactive'
    Email sent ✅                Email sent with reason ❌
```

## 📧 E-posta Bildirimleri

### Onay E-postası
```
Konu: İlanınız Onaylandı!
İçerik: 
- İlan başlığı
- Onay tarihi
- İlan detay linki
- "İlanınız yayına alındı" mesajı
```

### Red E-postası
```
Konu: İlanınız Hakkında
İçerik:
- İlan başlığı
- Red nedeni (admin tarafından yazılan açıklama)
- İlan düzenleme linki
- Düzeltme yapıp tekrar gönderebileceği bilgisi
```

## 🎯 Sonuç

Admin artık:
- ✅ Tüm pending ilanları görebilir
- ✅ İlanları tek tıkla onaylayabilir
- ✅ İlanları nedeniyle birlikte reddedebilir
- ✅ Onay durumlarına göre filtreleme yapabilir
- ✅ İstatistikleri takip edebilir
- ✅ Kullanıcılara otomatik e-posta gönderebilir

Sistem tamamen hazır ve test edilmeye hazır! 🚀
