# Ubuntu Server'a Hızlı Deployment

## Ön Hazırlık (Ubuntu Server'da)

Ubuntu server'a SSH ile bağlanın ve şu komutları çalıştırın:

```bash
# 1. Node.js ve gerekli araçları kur
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pnpm pm2

# 2. MySQL kur
sudo apt install -y mysql-server
sudo mysql_secure_installation

# 3. Nginx kur
sudo apt install -y nginx

# 4. MySQL database oluştur
sudo mysql -u root -p
```

MySQL'de şu komutları çalıştırın:
```sql
CREATE DATABASE varmi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'varmi_user'@'localhost' IDENTIFIED BY 'güçlü_şifre_buraya';
GRANT ALL PRIVILEGES ON varmi_db.* TO 'varmi_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Windows PC'den Deployment

### 1. Ubuntu IP Adresini Öğrenin

Ubuntu server'da:
```bash
ip addr show
# veya
hostname -I
```

Örnek çıktı: `192.168.1.100`

### 2. Frontend .env Dosyasını Düzenleyin

```powershell
cd "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\shadcn-ui"
copy .env.ubuntu .env
notepad .env
```

`.env` içinde Ubuntu IP'sini değiştirin:
```
VITE_SERVER_URL=https://192.168.1.100:8787
```

### 3. Deployment Script'ini Çalıştırın

```powershell
cd "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql"

# Ubuntu bilgilerinizi girin
.\deploy-to-ubuntu.ps1 -UbuntuIP "192.168.1.100" -UbuntuUser "your_username"
```

Script otomatik olarak:
- ✅ Backend build edecek
- ✅ Frontend build edecek  
- ✅ Dosyaları Ubuntu'ya kopyalayacak
- ✅ Dependencies kuracak
- ✅ PM2 ile backend'i başlatacak

### 4. Ubuntu'da Son Ayarlar

SSH ile bağlanın:
```bash
ssh your_username@192.168.1.100
```

#### A. Backend .env dosyasını düzenleyin:
```bash
cd ~/varmi-com/server
nano .env
```

Şu değerleri düzenleyin:
```env
DB_PASSWORD=güçlü_şifre_buraya
JWT_SECRET=rastgele_uzun_bir_string_buraya
SMTP_USER=email@gmail.com
SMTP_PASS=gmail_app_password
```

Backend'i restart edin:
```bash
pm2 restart varmi-mail-server
```

#### B. SQL migration'ları çalıştırın:
```bash
cd ~/varmi-com/sql
mysql -u varmi_user -p varmi_db < create_admin_tables.sql
mysql -u varmi_user -p varmi_db < create_orders_tables.sql
mysql -u varmi_user -p varmi_db < create_user_addresses_table.sql
mysql -u varmi_user -p varmi_db < add_listing_approval_system.sql
mysql -u varmi_user -p varmi_db < add_offer_approval_system.sql
mysql -u varmi_user -p varmi_db < update_order_status_system.sql
```

#### C. Nginx yapılandırması:
```bash
sudo nano /etc/nginx/sites-available/varmi.com
```

İçeriği yapıştırın (UBUNTU_DEPLOYMENT.md'den kopyalayın), sonra:
```bash
sudo ln -s /etc/nginx/sites-available/varmi.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### D. Firewall:
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 5. Windows Hosts Dosyasını Düzenleyin

**Yönetici olarak** `C:\Windows\System32\drivers\etc\hosts` dosyasını açın:

```
192.168.1.100  varmii.com
```

### 6. Tarayıcıda Test Edin

Chrome'da açın:
```
https://varmii.com
```

veya

```
https://192.168.1.100
```

## Sorun Giderme

### Backend çalışmıyor mu?
```bash
pm2 logs varmi-mail-server
pm2 status
```

### Nginx hatası mı var?
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Database bağlantı hatası mı?
```bash
mysql -u varmi_user -p varmi_db
# Şifre doğru mu kontrol et
```

### Frontend boş sayfa mı?
```bash
ls -la ~/varmi-com/frontend/
# index.html var mı kontrol et
```

## Admin Kullanıcı Oluşturma

```bash
cd ~/varmi-com/server
node make-admin.js
```

Email ve şifre girin, admin hesabı oluşturulacak.

## Güncelleme (Yeni Build Deploy)

Windows'ta:
```powershell
.\deploy-to-ubuntu.ps1 -UbuntuIP "192.168.1.100" -UbuntuUser "your_username"
```

Script otomatik olarak yeni build'i deploy edip backend'i restart eder.

## Faydalı Komutlar

```bash
# PM2 logs
pm2 logs

# Backend restart
pm2 restart varmi-mail-server

# Nginx reload
sudo systemctl reload nginx

# MySQL console
mysql -u varmi_user -p varmi_db

# Disk kullanımı
df -h

# Port dinlemeleri
sudo netstat -tulpn | grep LISTEN
```

## Yedekleme

### Database Backup
```bash
mysqldump -u varmi_user -p varmi_db > ~/backup_$(date +%Y%m%d).sql
```

### Restore
```bash
mysql -u varmi_user -p varmi_db < ~/backup_20250127.sql
```

## Notlar

- ✅ Backend port **8787**'de çalışır (sadece localhost)
- ✅ Nginx port **443**'te dış erişimi sağlar
- ✅ MySQL port **3306**'da çalışır (sadece localhost)
- ✅ SSL sertifikaları `~/varmi-com/server/ssl/` klasöründe
- ✅ Upload'lar `~/varmi-com/server/uploads/` klasöründe
- ✅ PM2 otomatik restart ile çalışır

## Güvenlik

- ❗ `.env` dosyasını asla paylaşmayın
- ❗ MySQL root şifresini güçlü yapın
- ❗ SSH key authentication kullanın
- ❗ UFW firewall'u aktif tutun
- ❗ Düzenli backup alın

## Destek

Sorun yaşarsanız:
1. `pm2 logs` kontrol edin
2. `sudo tail -f /var/log/nginx/error.log` kontrol edin
3. `.env` dosyasını kontrol edin
4. UBUNTU_DEPLOYMENT.md'yi okuyun
