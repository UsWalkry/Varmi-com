# 📧 noreply@varmii.com ile Mail Gönderme Rehberi

## SEÇENEK 1: Gmail "Send mail as" (ÖNERİLEN - 5 dakika)

### Avantajları
✅ Gmail'in yüksek deliverability'si  
✅ Spam klasörüne düşme riski düşük  
✅ Kolay kurulum  
✅ Custom "From" adresi (noreply@varmii.com)  

### Adımlar

#### 1. Gmail Ayarlarında "Send mail as" Ekle

1. Gmail'e giriş yapın: https://mail.google.com
2. **Ayarlar (⚙️)** → **See all settings**
3. **Accounts and Import** sekmesi
4. **Send mail as:** bölümünde → **Add another email address**
5. Popup'ta:
   - Name: `Varmii`
   - Email: `noreply@varmii.com`
   - **☑ Treat as an alias** (işaretli bırakın)
   - **Next**

#### 2. SMTP Ayarları

6. **Send through varmii.com SMTP servers** seçin
7. Ayarlar:
   ```
   SMTP Server: smtp.gmail.com
   Port: 587
   Username: bybrkaydn@gmail.com
   Password: your-16-digit-app-password
   TLS: Aktif
   ```
8. **Add Account**

#### 3. Doğrulama

9. Gmail `noreply@varmii.com` adresine doğrulama kodu gönderecek
10. Sunucunuza gidip maili okuyun:
    ```bash
    ssh burak@192.168.1.116
    sudo cat /var/mail/noreply
    # Veya
    mail -u noreply
    ```
11. Doğrulama kodunu Gmail'e girin

#### 4. Backend .env Güncelle

```bash
ssh burak@192.168.1.116
nano ~/varmi-com/server/.env
```

Değiştir:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=bybrkaydn@gmail.com
SMTP_PASS=your-16-digit-app-password
SMTP_FROM=noreply@varmii.com
```

#### 5. PM2 Restart

```bash
pm2 restart varmi-mail-server --update-env
pm2 logs varmi-mail-server
```

✅ **Artık mailler `noreply@varmii.com` olarak gönderilecek!**

---

## SEÇENEK 2: Kendi SMTP Sunucusu (GELİŞMİŞ - 30+ dakika)

### Gereksinimler
- Domain DNS yönetimi (GoDaddy, Cloudflare, vb.)
- SPF, DKIM, DMARC kayıtları
- PTR (Reverse DNS) kaydı
- SSL sertifikası

### Adım 1: DNS Kayıtları Ekle

Domain sağlayıcınızda (örn: GoDaddy):

#### SPF Kaydı
```
Type: TXT
Name: @
Value: v=spf1 ip4:46.1.54.105 ~all
TTL: 3600
```

#### DMARC Kaydı
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@varmii.com
TTL: 3600
```

#### MX Kaydı
```
Type: MX
Name: @
Value: varmii.com
Priority: 10
TTL: 3600
```

### Adım 2: PTR Kaydı (Hosting Sağlayıcı)

Hosting sağlayıcınıza (sunucu sahibi) başvurup PTR kaydı eklemesini isteyin:
```
46.1.54.105 → varmii.com
```

**Veya** VPS control panel'den kendiniz ekleyin.

### Adım 3: DKIM Kurulumu

```bash
ssh burak@192.168.1.116
sudo apt install opendkim opendkim-tools

# DKIM key oluştur
sudo mkdir -p /etc/opendkim/keys/varmii.com
cd /etc/opendkim/keys/varmii.com
sudo opendkim-genkey -t -s mail -d varmii.com

# Public key'i göster
sudo cat mail.txt
```

Çıkan TXT kaydını DNS'e ekleyin:
```
Type: TXT
Name: mail._domainkey
Value: (opendkim-genkey çıktısındaki value)
```

### Adım 4: Postfix Yapılandırması

```bash
sudo nano /etc/postfix/main.cf
```

Ekle/Güncelle:
```
myhostname = varmii.com
mydomain = varmii.com
myorigin = $mydomain
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain
relayhost =

# DKIM
milter_default_action = accept
milter_protocol = 6
smtpd_milters = inet:localhost:8891
non_smtpd_milters = inet:localhost:8891
```

### Adım 5: OpenDKIM Yapılandırması

```bash
sudo nano /etc/opendkim.conf
```

Ekle:
```
Domain                  varmii.com
KeyFile                 /etc/opendkim/keys/varmii.com/mail.private
Selector                mail
Socket                  inet:8891@localhost
```

### Adım 6: Servisleri Restart

```bash
sudo systemctl restart opendkim
sudo systemctl restart postfix
sudo postfix check
```

### Adım 7: Backend .env (Postfix Kullan)

```env
SMTP_HOST=localhost
SMTP_PORT=25
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@varmii.com
```

### Adım 8: Test

```bash
echo "Test mail body" | mail -s "Test from noreply" bybrkaydn@gmail.com
```

### DNS Doğrulama (24-48 saat sonra)

```bash
# SPF check
dig +short TXT varmii.com

# DKIM check
dig +short TXT mail._domainkey.varmii.com

# PTR check
dig +short -x 46.1.54.105
```

---

## KARŞILAŞTIRMA

| Özellik | Gmail "Send mail as" | Kendi SMTP |
|---------|---------------------|------------|
| **Kurulum Süresi** | 5 dakika | 30+ dakika |
| **Deliverability** | ⭐⭐⭐⭐⭐ Mükemmel | ⭐⭐⭐ İyi (doğru DNS ile) |
| **Maliyet** | Ücretsiz | Ücretsiz (VPS dahil) |
| **Bakım** | Yok | Orta (DNS, sertifika) |
| **Günlük Limit** | 500 mail | Sınırsız |
| **Spam Riski** | Çok düşük | Orta (yeni IP) |
| **Kontrol** | Sınırlı | Tam |

---

## ÖNERİ

**Şu an için:** Gmail "Send mail as" (Seçenek 1)  
**Gelecekte (yüksek volume):** SendGrid/AWS SES  
**İleri seviye:** Kendi SMTP (Seçenek 2)

---

## Hızlı Başlangıç

### Seçenek 1 için (5 dakika)
1. Gmail → Ayarlar → Accounts → Add another email
2. noreply@varmii.com ekle
3. Doğrulama kodunu sunucudan oku
4. .env güncellle: `SMTP_FROM=noreply@varmii.com`
5. PM2 restart

### Seçenek 2 için (30+ dakika)
1. DNS kayıtları ekle (SPF, DKIM, DMARC, MX)
2. Hosting'den PTR kaydı talep et
3. DKIM kurulumu yap
4. Postfix yapılandır
5. 24-48 saat DNS propagation bekle
6. Test et

---

## Troubleshooting

### Gmail "Send mail as" doğrulama kodu gelmiyor
```bash
# Sunucuda mail kontrol et
sudo cat /var/mail/noreply
# Veya
sudo tail -f /var/log/mail.log
```

### DKIM verification failed
```bash
# DKIM key doğru mu kontrol et
sudo opendkim-testkey -d varmii.com -s mail -vvv
```

### SPF softfail
```bash
# SPF kaydını kontrol et
dig +short TXT varmii.com
# ip4:46.1.54.105 görmeli
```
