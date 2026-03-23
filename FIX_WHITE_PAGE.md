# 🔧 Beyaz Sayfa Sorunu - Çözüm Raporu

**Tarih:** 28 Ocak 2026, 13:40  
**Sorun:** Site beyaz sayfa gösteriyordu  
**Kök Neden:** Nginx permission hatası

---

## 🐛 SORUN ANALİZİ

### Belirtiler
- Ana sayfa HTML yükleniyor ✅
- JavaScript dosyaları yüklenemiyor ❌
- CSS dosyaları yüklenemiyor ❌
- Tarayıcı console: 403 Forbidden errors

### Nginx Error Log
```
[crit] stat() "/home/burak/varmi-com/frontend/assets/index-btfZpH2-.js" 
failed (13: Permission denied)
```

### Kök Neden
Frontend deployment sırasında `assets` klasörü **700 permission** ile oluşturuldu:
```bash
drwx------  # Sadece owner (burak) erişebilir
```

Nginx `www-data` user'ı olarak çalışıyor ve bu klasöre erişemiyor.

---

## ✅ ÇÖZÜM

### Uygulanan Komut
```bash
chmod -R 755 ~/varmi-com/frontend
```

### Yeni Permissions
```bash
drwxr-xr-x  # Owner: rwx, Group: r-x, Others: r-x
```

Bu sayede `www-data` user'ı artık dosyaları okuyabiliyor.

### Nginx Reload
```bash
sudo systemctl reload nginx
```

---

## 🧪 DOĞRULAMA

### Öncesi
```
curl https://localhost/assets/index-btfZpH2-.js
HTTP 200 - 2218 bytes (sadece HTML redirect)
```

### Sonrası
```
curl https://localhost/assets/index-btfZpH2-.js
HTTP 200 - 1095049 bytes (tam JS dosyası) ✅
```

---

## 📝 ÖĞRENİLENLER

### Deployment Best Practice
Frontend dosyalarını production'a kopyalarken:

```bash
# Önce kopyala
scp -r dist/* server:/path/

# Sonra permissions düzelt
ssh server "chmod -R 755 /path/to/frontend"
```

### Nginx Permission Gereksinimleri
- **Dizinler:** `755` (rx gerekli)
- **Dosyalar:** `644` (r gerekli)
- Nginx user (`www-data`) en az **read + execute** (dizinler için) gerektirir

---

## 🔄 GÜNCELLENMİŞ DEPLOYMENT SCRIPT

`deploy-security-update.ps1` scriptine eklenecek:

```powershell
# Copy Frontend
Write-Host "Step 5: Frontend kopyalaniyor..." -ForegroundColor Green
scp -r "$ProjectPath\shadcn-ui\dist\*" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/frontend/

# FIX PERMISSIONS (YENİ)
Write-Host "Step 5b: Frontend permissions duzeltiliyor..." -ForegroundColor Yellow
ssh ${UbuntuUser}@${UbuntuIP} "chmod -R 755 ~/varmi-com/frontend"
Write-Host "   Permissions duzeltildi" -ForegroundColor Green
```

---

## ✅ DURUM

**Site Durumu:** 🟢 ÇALIŞIYOR  
**JavaScript:** ✅ Yükleniyor (1.1 MB)  
**CSS:** ✅ Yükleniyor (107 KB)  
**API:** ✅ Backend online (PM2)  
**HTTPS:** ✅ Aktif (Let's Encrypt)

**Çözüm Süresi:** ~5 dakika  
**Downtime:** Minimal (kullanıcılar HTML görüyordu ama JS yüklenmiyordu)
