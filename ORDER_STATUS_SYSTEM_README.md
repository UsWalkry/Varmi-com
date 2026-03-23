# Sipariş Durumu Yönetim Sistemi - Güncelleme

Bu güncelleme, alıcı-satıcı pazaryeri projesine gelişmiş sipariş durumu yönetim sistemi ekler.

## ✨ Yeni Özellikler

### 🛍️ Satıcı Özellikleri
- **İşlemi Başlat**: Onaylanmış siparişleri "hazırlanıyor" durumuna geçirme
- **Kargo Bilgileri**: Takip numarası, kargo firması ve tahmini teslimat tarihi ekleme
- **Otomatik Durum Geçişleri**: confirmed → preparing → shipped
- **Gerçek Zamanlı Güncelleme**: Dashboard'da anlık durum değişiklikleri

### 🛒 Alıcı Özellikleri  
- **Canlı Sipariş Takibi**: Sipariş durumunu gerçek zamanlı görüntüleme
- **Teslim Aldım**: Kargoda olan siparişleri teslim alındı olarak işaretleme
- **Timeline Görünümü**: Sipariş sürecinin görsel takibi
- **Kargo Bilgileri**: Takip numarası ve kargo firması görüntüleme

### 📧 Bildirimler
- **E-posta Bildirimleri**: Her durum değişikliği için otomatik e-posta
- **Güzel Tasarım**: HTML e-posta şablonları
- **Kişiselleştirme**: Kullanıcı adı ve sipariş bilgileri dahil

### 🔒 Güvenlik & Audit
- **İzin Kontrolü**: Sadece sipariş sahibi/satıcısı işlem yapabilir
- **Audit Log**: Tüm durum değişiklikleri kayıt altına alınır
- **Veri Validasyonu**: Giriş verilerinin doğrulanması
- **Hata Yönetimi**: Kapsamlı hata yakalama ve raporlama

## 🗄️ Veritabanı Değişiklikleri

### Yeni Tablolar
```sql
-- Sipariş durumu audit kayıtları
order_status_audit (id, order_id, previous_status, new_status, changed_by, change_reason, ...)

-- Sipariş bildirimleri
order_notifications (id, order_id, user_id, notification_type, title, message, ...)
```

### Güncellenmiş Tablolar
```sql
-- orders tablosuna yeni alanlar
ALTER TABLE orders ADD COLUMN carrier_company VARCHAR(100);
ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100);
ALTER TABLE orders ADD COLUMN started_processing_at TIMESTAMP NULL;
-- ... diğer timestamp alanları
```

### Yeni Durum Değerleri
- `pending` → `confirmed` → `preparing` → `shipped` → `delivered` → `completed`
- `cancelled` (herhangi bir aşamada)

## 🔧 Kurulum

### 1. Veritabanı Güncellemesi
```bash
# MySQL veritabanında çalıştırın
mysql -u username -p database_name < update_order_status_system.sql
```

### 2. Backend Bağımlılıkları
```bash
cd server
pnpm install
```

### 3. Frontend Bağımlılıkları
```bash
cd shadcn-ui
pnpm install
```

### 4. Çevre Değişkenleri
Backend `.env` dosyasında SMTP ayarları:
```env
SMTP_HOST=mail.varmii.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@varmi.com
SMTP_PASS=your_password
```

## 🚀 Kullanım

### Satıcı Akışı
1. **Sipariş Listesi**: Dashboard → Sattıklarım sekmesi
2. **İşlemi Başlat**: Onaylanmış siparişte "İşlemi Başlat" butonuna tıkla
3. **Kargo Bilgileri**: Hazırlama tamamlandıktan sonra "Kargo Bilgileri" butonuna tıkla
4. **Form Doldur**: Kargo firması, takip numarası ve tahmini teslimat girin
5. **Otomatik Bildirim**: Alıcıya e-posta bildirimi gönderilir

### Alıcı Akışı
1. **Sipariş Takibi**: Dashboard → Aldıklarım sekmesi
2. **Durum Kontrolü**: Sipariş durumunu timeline'dan takip et
3. **Teslim Alma**: Kargoda durumundayken "Teslim Aldım" butonuna tıkla
4. **Onay**: Sipariş "teslim edildi" durumuna geçer

### API Endpoints

#### Yeni Endpoints
```bash
# Satıcı işlemleri
PATCH /api/orders/:orderId/start-processing     # İşlemi başlat
PATCH /api/orders/:orderId/add-shipping        # Kargo bilgileri ekle

# Alıcı işlemleri  
PATCH /api/orders/:orderId/mark-delivered      # Teslim aldım

# Takip
GET /api/orders/:orderId/tracking              # Takip geçmişi
```

## 🎨 UI Bileşenleri

### Yeni Bileşenler
- `OrderStatusBadge`: Durum gösterimi için renkli badge
- `ShippingFormModal`: Kargo bilgileri formu
- `OrderStatusTimeline`: Sipariş sürecinin timeline görünümü

### Kullanım Örnekleri
```tsx
import OrderStatusBadge from '@/components/ui/OrderStatusBadge';
import ShippingFormModal from '@/components/ui/ShippingFormModal';
import OrderStatusTimeline from '@/components/ui/OrderStatusTimeline';

// Durum badge'i
<OrderStatusBadge status="preparing" />

// Timeline görünümü
<OrderStatusTimeline 
  status="shipped"
  trackingNumber="ABC123456"
  carrierCompany="MNG Kargo"
  estimatedDelivery="2024-10-15"
/>
```

## 🧪 Test Senaryosu

### Manuel Test Adımları
1. **Setup**: Örnek sipariş oluştur (API: `/orders/create-sample-order`)
2. **Başlatma**: Satıcı olarak "İşlemi Başlat" tıkla
3. **Kargo**: "Kargo Bilgileri" formunu doldur
4. **Takip**: Alıcı olarak sipariş detaylarını kontrol et
5. **Teslim**: "Teslim Aldım" butonuna tıkla
6. **Verification**: E-posta bildirimlerini kontrol et

### Beklenen Sonuçlar
- ✅ Durum değişiklikleri kayıt altına alınır
- ✅ E-posta bildirimleri gönderilir
- ✅ Timeline doğru güncellenir
- ✅ İzin kontrolleri çalışır
- ✅ Hata durumları graceful handle edilir

## 🔍 Troubleshooting

### Sık Karşılaşılan Sorunlar

1. **E-posta Gönderilmiyor**
   - SMTP ayarlarını kontrol edin
   - `.env` dosyasındaki bilgileri doğrulayın
   - Server loglarını inceleyin

2. **Durum Güncellenmiyor**
   - İzin kontrollerini inceleyin
   - Backend API çağrılarında hata var mı kontrol edin
   - Network sekmesinde API response'ları inceleyin

3. **Timeline Görünmüyor**
   - Progress bileşeninin import edildiğinden emin olun
   - Browser console'da hata var mı kontrol edin

### Debug Komutları
```bash
# Backend logları
cd server && pnpm dev

# Frontend logları  
cd shadcn-ui && pnpm dev

# Database kontrol
cd server && node check-orders-table.js
```

## 📚 Daha Fazla Bilgi

- Backend API dokümantasyonu: `server/README.md`
- Frontend bileşen guide: `shadcn-ui/README.md`  
- Database şeması: `create_orders_tables.sql`
- E-posta şablonları: `server/src/services/emailService.ts`

## 🤝 Katkıda Bulunma

1. Feature branch oluşturun
2. Değişikliklerinizi commit edin
3. Test edin
4. Pull request oluşturun

---

**Not**: Bu sistem production-ready olarak tasarlanmıştır ve gerçek e-ticaret sistemlerinde kullanılabilir.