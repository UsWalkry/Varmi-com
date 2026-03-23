# 📧 Gmail SMTP Kurulum Rehberi

## SORUN
Postfix üzerinden Gmail'e mail gönderimi başarısız:
- **Hata:** `550-5.7.25 Missing PTR record`
- **Sebep:** Sunucu IP'si (46.1.54.105) için reverse DNS kaydı yok
- **Sonuç:** Gmail tüm mailleri bounce ediyor

---

## HIZLI ÇÖZÜM: Gmail SMTP

### Adım 1: Gmail App Password Oluştur

1. Google hesabınıza gidin: https://myaccount.google.com/
2. **Security** → **2-Step Verification** aktif edin (zorunlu)
3. **App Passwords** → **Select app: Mail** → **Select device: Other**
4. İsim verin: "Varmii Backend"
5. **16 haneli şifre** oluşacak (örn: `abcd efgh ijkl mnop`)

### Adım 2: .env Dosyasını Güncelle

SSH ile sunucuya bağlanın:
```bash
ssh burak@192.168.1.116
cd ~/varmi-com/server
nano .env
```

Aşağıdaki satırları değiştirin:
```env
# Eski (Postfix)
SMTP_HOST=localhost
SMTP_PORT=25
SMTP_SECURE=false
SMTP_USER=noreply
SMTP_PASS=B426859..
SMTP_FROM=noreply@varmii.com

# Yeni (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=bybrkaydn@gmail.com
SMTP_PASS=your-16-digit-app-password-here
SMTP_FROM=bybrkaydn@gmail.com
```

**DİKKAT:** 
- `SMTP_PASS` için **boşluksuz** 16 haneli app password girin
- `SMTP_FROM` Gmail adresiniz olmalı (yoksa Gmail reddeder)
- `SMTP_SECURE=false` olmalı (port 587 TLS kullanır)

### Adım 3: PM2 Restart

```bash
pm2 restart varmi-mail-server --update-env
pm2 logs varmi-mail-server
```

---

## ALTERNATİF ÇÖZÜMLER

### 1. SendGrid (Önerilen - Profesyonel)
- **Ücretsiz:** 100 mail/gün
- **Avantaj:** Yüksek deliverability, analytics, webhook support
- **Setup:** 
  ```env
  SMTP_HOST=smtp.sendgrid.net
  SMTP_PORT=587
  SMTP_USER=apikey
  SMTP_PASS=your-sendgrid-api-key
  ```
- **Kayıt:** https://sendgrid.com/

### 2. AWS SES (Ölçeklenebilir)
- **Fiyat:** $0.10 / 1000 mail
- **Avantaj:** AWS ekosistemi entegrasyonu, unlimited
- **Setup:** AWS Console → SES → SMTP credentials

### 3. Mailgun
- **Ücretsiz:** 5000 mail/ay (ilk 3 ay)
- **Benzer SendGrid'e**

### 4. PTR Kaydı Ekle (Sunucu IP için)
- Domain sağlayıcınızdan (Godaddy, Namecheap, vb.)
- PTR record: `46.1.54.105` → `varmii.com`
- **Dezavantaj:** Zaman alır (24-48 saat propagation)

---

## TEST KOMUTLARI

### Gmail SMTP Test (Manuel)
```bash
# Sunucudan test mail gönder
ssh burak@192.168.1.116
echo "Test mail body" | mail -s "Test from Varmii" bybrkaydn@gmail.com
```

### Backend API ile Test
```bash
# Admin panel → Users → Test email butonu
# Veya curl ile:
curl -X POST https://192.168.1.116/api/admin/test-email \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"bybrkaydn@gmail.com"}'
```

### PM2 Logs İzle
```bash
pm2 logs varmi-mail-server --lines 50
# Email gönderim loglarını gör
```

---

## ÖNERİLEN PRODUCTION SETUP

**Kısa Vade (Şimdi):**
```
Gmail SMTP (Hızlı, 0 maliyet)
```

**Uzun Vade (Ölçeklenebilir):**
```
SendGrid veya AWS SES (Profesyonel, analytics, high deliverability)
```

---

## Gmail Limitleri
- **Günlük:** 500 mail/gün (normal Gmail hesabı)
- **Workspace:** 2000 mail/gün (Google Workspace)
- **Rate:** ~100 mail/saat

---

## Troubleshooting

### "Invalid credentials" hatası
- App password'u doğru girdiğinizden emin olun (boşluksuz)
- 2FA'nın aktif olduğunu kontrol edin

### "Connection refused"
- Port 587 açık mı kontrol edin: `telnet smtp.gmail.com 587`
- Firewall kurallarını kontrol edin

### "Sender address rejected"
- `SMTP_FROM` ile `SMTP_USER` aynı Gmail adresi olmalı

---

## Şu An Yapılacaklar

1. ✅ Gmail App Password oluştur
2. ✅ Sunucuda .env güncelle
3. ✅ PM2 restart
4. ✅ Test email gönder
5. ✅ PM2 logs kontrol et

**Tahmini Süre:** 5 dakika
