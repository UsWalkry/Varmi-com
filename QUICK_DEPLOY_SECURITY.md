# 🚀 HIZLI DEPLOYMENT REHBERİ - Güvenlik Güncellemesi

## ⚡ 5 Dakikada Deployment

### 1. Paketleri Güncelle (Sunucuda)
```bash
cd ~/varmi-com/server
pnpm install
```

### 2. .env Dosyasını Güncelle
```bash
nano .env
```

**Ekle/Değiştir:**
```env
# 🔒 KRİTİK - Mutlaka değiştirin!
NODE_ENV=production
JWT_SECRET=<güçlü-256-bit-random-key>

# CORS için frontend URL
FRONTEND_URL=https://varmii.com
```

**JWT_SECRET oluştur:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Build & Restart
```bash
pnpm build
pm2 restart varmi-backend
pm2 logs varmi-backend --lines 50
```

### 4. Test Et
```bash
# Health check
curl https://varmii.com/api/health

# Rate limit test (6 kez yanlış login dene)
for i in {1..6}; do
  curl -X POST https://varmii.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

## ✅ Başarı Kriterleri

1. Server başladı: `pm2 status` → **online**
2. Health check: `200 OK` döndü
3. Rate limit: 6. istek `429` döndü
4. Logs temiz: `pm2 logs` → Hata yok

## 🔥 Acil Rollback (Sorun Çıkarsa)

```bash
cd ~/varmi-com/server
git stash  # Değişiklikleri sakla
git checkout HEAD~1  # Önceki commit'e dön
pnpm install
pnpm build
pm2 restart varmi-backend
```

## 📊 Monitoring (İlk 24 Saat)

```bash
# CPU/Memory
pm2 monit

# Error logs
pm2 logs varmi-backend --err --lines 100

# Rate limit istatistikleri
# (Logs'ta "Too Many Requests" ara)
pm2 logs varmi-backend | grep "429"
```

## ⚠️ Bilinen Sorunlar & Çözümleri

### Sorun 1: "Cannot find module 'helmet'"
**Çözüm:**
```bash
cd ~/varmi-com/server
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Sorun 2: "JWT_SECRET is not defined"
**Çözüm:** `.env` dosyasına ekle:
```env
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### Sorun 3: Rate limit çok agresif
**Geçici çözüm:** `src/index.ts` → `max: 100` değerini artır
**Kalıcı çözüm:** IP whitelist ekle (sonra)

### Sorun 4: CORS hatası
**Kontrol et:** `.env` → `FRONTEND_URL=https://varmii.com`
**Log'lara bak:**
```bash
pm2 logs | grep "CORS"
```

## 🎯 Performans Beklentileri

- **Response time**: <200ms (değişmez)
- **Rate limit overhead**: ~2ms (ihmal edilebilir)
- **Memory**: +10MB (helmet, rate-limit)
- **CPU**: %0.1 artış

## 🔐 Güvenlik Checklist (Deployment Sonrası)

- [ ] JWT_SECRET default değil
- [ ] NODE_ENV=production
- [ ] Rate limit çalışıyor (test-security.js)
- [ ] Input validation çalışıyor
- [ ] File upload test edildi
- [ ] Logs production mode'da (az detay)
- [ ] Helmet headers mevcut (curl -I)
- [ ] CORS sadece varmii.com'u kabul ediyor

## 📞 İletişim

Sorun yaşarsanız:
1. `pm2 logs varmi-backend --lines 200` → screenshot
2. `pm2 describe varmi-backend` → output
3. `.env` dosyası (şifresiz!)

---

**NOT**: Bu deployment backward-compatible'dır. Mevcut kullanıcılar etkilenmez.
