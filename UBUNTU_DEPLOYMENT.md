# Ubuntu Server Deployment Guide

## Gereksinimler

### Ubuntu Server'da Kurulması Gerekenler
```bash
# 1. Node.js (v18+) ve pnpm kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pnpm pm2

# 2. MySQL Server kurulumu
sudo apt update
sudo apt install -y mysql-server
sudo mysql_secure_installation

# 3. Nginx (reverse proxy için)
sudo apt install -y nginx

# 4. SSL sertifikaları için Certbot (opsiyonel)
sudo apt install -y certbot python3-certbot-nginx
```

## Deployment Adımları

### 1. Proje Klasörlerini Oluştur
```bash
# Ubuntu server'da
mkdir -p ~/varmi-com
cd ~/varmi-com
```

### 2. Backend Deployment

#### A. Backend dosyalarını kopyala (Windows'tan Ubuntu'ya)
```powershell
# Windows PowerShell'de (yerel PC'nizde)
# Ubuntu server IP'sini değiştirin (örn: 192.168.1.100)
$UBUNTU_IP = "192.168.1.100"
$UBUNTU_USER = "your_username"

# Backend build et
cd "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\server"
pnpm install
pnpm build

# SCP ile backend dosyalarını kopyala
scp -r dist/ package.json pnpm-lock.yaml ecosystem.config.js ${UBUNTU_USER}@${UBUNTU_IP}:~/varmi-com/server/
scp .env.example ${UBUNTU_USER}@${UBUNTU_IP}:~/varmi-com/server/
scp -r ssl/ ${UBUNTU_USER}@${UBUNTU_IP}:~/varmi-com/server/
```

#### B. Ubuntu'da backend'i başlat
```bash
# Ubuntu server'da SSH ile bağlan
ssh your_username@192.168.1.100

cd ~/varmi-com/server
pnpm install --prod

# .env dosyasını oluştur
nano .env
```

**.env içeriği** (Ubuntu server için):
```env
# Database
DB_HOST=localhost
DB_USER=varmi_user
DB_PASSWORD=your_secure_password
DB_NAME=varmi_db
DB_PORT=3306

# Server
PORT=8787
NODE_ENV=production
USE_HTTPS=true

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this

# SMTP (email gönderimi için)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@varmii.com

# Frontend URL
FRONTEND_URL=https://varmii.com
```

```bash
# PM2 ile backend'i başlat
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. MySQL Database Setup

```bash
# MySQL'e root olarak giriş
sudo mysql -u root -p

# Database ve kullanıcı oluştur
CREATE DATABASE varmi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'varmi_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON varmi_db.* TO 'varmi_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# SQL migration dosyalarını çalıştır
mysql -u varmi_user -p varmi_db < ~/varmi-com/create_admin_tables.sql
mysql -u varmi_user -p varmi_db < ~/varmi-com/create_orders_tables.sql
mysql -u varmi_user -p varmi_db < ~/varmi-com/create_user_addresses_table.sql
mysql -u varmi_user -p varmi_db < ~/varmi-com/add_listing_approval_system.sql
mysql -u varmi_user -p varmi_db < ~/varmi-com/add_offer_approval_system.sql
mysql -u varmi_user -p varmi_db < ~/varmi-com/update_order_status_system.sql
```

### 4. Frontend Deployment

#### A. Frontend build et ve kopyala
```powershell
# Windows PowerShell'de
cd "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\shadcn-ui"

# .env dosyasını production için düzenle
# VITE_SERVER_URL=https://192.168.1.100:8787 (Ubuntu IP'si)
# VITE_DEBUG_MODE=false

pnpm install
pnpm build

# Build'i Ubuntu'ya kopyala
scp -r dist/ ${UBUNTU_USER}@${UBUNTU_IP}:~/varmi-com/frontend/
```

#### B. Nginx yapılandırması (Ubuntu'da)
```bash
# Nginx config dosyası oluştur
sudo nano /etc/nginx/sites-available/varmi.com
```

**Nginx config içeriği**:
```nginx
# HTTP - HTTPS'e yönlendir
server {
    listen 80;
    server_name varmii.com www.varmii.com 192.168.1.100;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Frontend
server {
    listen 443 ssl http2;
    server_name varmii.com www.varmii.com 192.168.1.100;

    # SSL sertifikaları (Let's Encrypt veya self-signed)
    ssl_certificate /home/your_username/varmi-com/server/ssl/cert.pem;
    ssl_certificate_key /home/your_username/varmi-com/server/ssl/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend static files
    root /home/your_username/varmi-com/frontend/dist;
    index index.html;

    # Frontend routing (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass https://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Upload klasörü (backend'den servis ediliyor)
    location /uploads {
        proxy_pass https://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

```bash
# Config'i aktifleştir
sudo ln -s /etc/nginx/sites-available/varmi.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Firewall Ayarları

```bash
# UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 6. Hosts Dosyası (Yerel Ağda Test için)

**Windows'ta** (`C:\Windows\System32\drivers\etc\hosts`):
```
192.168.1.100  varmii.com
```

**Ubuntu'da** (`/etc/hosts`):
```
127.0.0.1      varmii.com
```

### 7. SSL Sertifikaları

#### Opsyon A: Mevcut sertifikaları kopyala
```powershell
# Windows'tan Ubuntu'ya SSL kopyala
scp -r "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\server\ssl" ${UBUNTU_USER}@${UBUNTU_IP}:~/varmi-com/server/
```

#### Opsyon B: Let's Encrypt ile yeni sertifika
```bash
# Ubuntu'da (public domain gerekli)
sudo certbot --nginx -d varmii.com -d www.varmii.com
```

#### Opsyon C: Self-signed sertifika (yerel ağ için)
```bash
cd ~/varmi-com/server
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/CN=varmii.com"
```

## Deployment Script'i (Otomatik)

### Windows'tan Ubuntu'ya Tek Komutla Deploy

```powershell
# deploy-to-ubuntu.ps1
$UBUNTU_IP = "192.168.1.100"
$UBUNTU_USER = "your_username"
$PROJECT_PATH = "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql"

Write-Host "🚀 Ubuntu Server'a deployment başlıyor..." -ForegroundColor Green

# Backend build
Write-Host "📦 Backend build ediliyor..." -ForegroundColor Yellow
cd "$PROJECT_PATH\server"
pnpm install
pnpm build

# Frontend build
Write-Host "📦 Frontend build ediliyor..." -ForegroundColor Yellow
cd "$PROJECT_PATH\shadcn-ui"
pnpm install
pnpm build

# SQL dosyalarını kopyala
Write-Host "📤 SQL dosyaları kopyalanıyor..." -ForegroundColor Yellow
scp "$PROJECT_PATH\*.sql" ${UBUNTU_USER}@${UBUNTU_IP}:~/varmi-com/

# Backend kopyala
Write-Host "📤 Backend kopyalanıyor..." -ForegroundColor Yellow
scp -r "$PROJECT_PATH\server\dist" ${UBUNTU_USER}@${UBUNTU_IP}:~/varmi-com/server/
scp "$PROJECT_PATH\server\package.json" ${UBUNTU_USER}@${UBUNTU_IP}:~/varmi-com/server/
scp "$PROJECT_PATH\server\pnpm-lock.yaml" ${UBUNTU_USER}@${UBUNTU_IP}:~/varmi-com/server/
scp "$PROJECT_PATH\server\ecosystem.config.js" ${UBUNTU_USER}@${UBUNTU_IP}:~/varmi-com/server/

# Frontend kopyala
Write-Host "📤 Frontend kopyalanıyor..." -ForegroundColor Yellow
scp -r "$PROJECT_PATH\shadcn-ui\dist" ${UBUNTU_USER}@${UBUNTU_IP}:~/varmi-com/frontend/

# Backend restart
Write-Host "🔄 Backend restart ediliyor..." -ForegroundColor Yellow
ssh ${UBUNTU_USER}@${UBUNTU_IP} "cd ~/varmi-com/server && pnpm install --prod && pm2 restart varmi-mail-server"

Write-Host "✅ Deployment tamamlandı!" -ForegroundColor Green
Write-Host "🌐 Site: https://${UBUNTU_IP}" -ForegroundColor Cyan
```

## Kontroller

### Backend Kontrol
```bash
# PM2 status
pm2 status
pm2 logs varmi-mail-server

# Backend health check
curl -k https://localhost:8787/health
```

### Frontend Kontrol
```bash
# Nginx status
sudo systemctl status nginx

# Frontend erişim testi
curl -k https://localhost
```

### Database Kontrol
```bash
# MySQL'e bağlan
mysql -u varmi_user -p varmi_db

# Tabloları listele
SHOW TABLES;

# Admin kullanıcı oluştur
# server dizininde node make-admin.js çalıştır
cd ~/varmi-com/server
node check-db.js
node make-admin.js
```

## Güncelleme (Update)

```bash
# Ubuntu'da
cd ~/varmi-com/server
git pull  # veya Windows'tan yeni build kopyala
pnpm install --prod
pm2 restart varmi-mail-server

# Frontend için
cd ~/varmi-com/frontend
# Yeni build'i kopyala (Windows'tan)
sudo systemctl reload nginx
```

## Sorun Giderme

### Backend başlamıyor
```bash
pm2 logs varmi-mail-server --lines 100
# .env dosyasını kontrol et
# MySQL bağlantısını test et
```

### Frontend açılmıyor
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
# Dosya izinlerini kontrol et
ls -la ~/varmi-com/frontend/dist
```

### Database bağlantı hatası
```bash
mysql -u varmi_user -p
# Kullanıcı izinlerini kontrol et
SHOW GRANTS FOR 'varmi_user'@'localhost';
```

### SSL hatası
```bash
# Sertifika dosyalarını kontrol et
ls -la ~/varmi-com/server/ssl/
openssl x509 -in ~/varmi-com/server/ssl/cert.pem -text -noout
```

## Port Yapılandırması

- **80** (HTTP) → Nginx (HTTPS'e yönlendirir)
- **443** (HTTPS) → Nginx → Frontend + API Proxy
- **8787** (Backend) → Express (sadece localhost'tan erişilebilir)
- **3306** (MySQL) → Database (sadece localhost'tan erişilebilir)

## Güvenlik Notları

1. `.env` dosyasını **asla** git'e commit etmeyin
2. MySQL root şifresini güçlü yapın
3. Ubuntu server'da SSH key authentication kullanın
4. UFW firewall'u aktif edin
5. PM2'yi root yerine normal kullanıcı ile çalıştırın
6. Nginx'te rate limiting ekleyin (DDoS koruması)
7. SSL sertifikalarını düzenli güncelleyin
