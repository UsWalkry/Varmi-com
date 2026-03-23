# HTTPS Kurulum Tamamlandı! 🔒

## Yapılan Değişiklikler

### 1. SSL Sertifikası Oluşturuldu
- ✅ `server/ssl/cert.pem` - SSL sertifikası
- ✅ `server/ssl/key.pem` - Private key
- ⚠️  Self-signed sertifika (1 yıl geçerli)

### 2. Backend HTTPS Desteği Eklendi
- `server/src/index.ts` - HTTPS/HTTP server oluşturma
- `.env` dosyasına `USE_HTTPS=true` ekleyin

### 3. Frontend Proxy Güncellendi
- `shadcn-ui/vite.config.ts` - HTTPS backend için proxy ayarları

## Kullanım

### 1. Backend'i HTTPS ile Başlatın
```bash
cd server
# .env dosyasına ekleyin:
echo "USE_HTTPS=true" >> .env
pnpm build
pnpm dev
```

### 2. Frontend'i Başlatın
```bash
cd shadcn-ui
pnpm dev
```

### 3. Tarayıcıda Güvenlik Uyarısını Atlayın

**Chrome/Edge:**
1. `https://localhost:8787` adresine gidin
2. "Your connection is not private" uyarısını göreceksiniz
3. "Advanced" → "Proceed to localhost (unsafe)" tıklayın
4. Şimdi `https://varmii.com:5173` veya `http://localhost:5173` çalışacak

**Firefox:**
1. "Warning: Potential Security Risk Ahead"
2. "Advanced" → "Accept the Risk and Continue"

### 4. Domain Üzerinden Erişim

Eğer `varmii.com` domain'inizi yerel IP'nize yönlendirdiyseniz:

**Windows hosts dosyası düzenleyin** (`C:\Windows\System32\drivers\etc\hosts`):
```
127.0.0.1 varmii.com
127.0.0.1 www.varmii.com
```

Sonra tarayıcıda:
- `https://varmii.com:5173` (frontend)
- `https://varmii.com:8787` (backend API)

## Sorun Giderme

### Tarayıcı Hala Güvenli Değil Diyor
- Self-signed sertifika kullanıyorsunuz, bu normal
- Üretim ortamında gerçek SSL sertifikası (Let's Encrypt) kullanın

### Backend Başlamıyor
```bash
# SSL sertifikalarını kontrol edin
ls server/ssl/
# cert.pem ve key.pem olmalı

# USE_HTTPS=false yapıp HTTP ile test edin
```

### Frontend Backend'e Bağlanamıyor
```bash
# Vite proxy ayarlarını kontrol edin
# vite.config.ts içinde secure: false olmalı
```

## Üretim İçin

Gerçek domain'de Let's Encrypt sertifikası kullanmak için:

```bash
# Certbot kurulumu (Windows)
# https://certbot.eff.org/

# Sertifika al
certbot certonly --standalone -d varmii.com -d www.varmii.com

# Sertifikaları kopyala
cp /etc/letsencrypt/live/varmii.com/fullchain.pem server/ssl/cert.pem
cp /etc/letsencrypt/live/varmii.com/privkey.pem server/ssl/key.pem
```
