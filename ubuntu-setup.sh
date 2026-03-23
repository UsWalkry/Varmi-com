#!/bin/bash
# Ubuntu Server Setup Script
# Bu script'i Ubuntu'da çalıştırın

echo "=== Varmi.com Ubuntu Setup ==="
echo ""

# 1. Klasörleri düzenle
echo "Step 1: Organizing folders..."
mkdir -p ~/varmi-com/server ~/varmi-com/frontend ~/varmi-com/sql
mv ~/dist ~/varmi-com/server/
mv ~/package.json ~/pnpm-lock.yaml ~/ecosystem.config.js ~/varmi-com/server/
mv ~/.env.example ~/varmi-com/server/
mv ~/ssl ~/varmi-com/server/
mv ~/frontend-dist/* ~/varmi-com/frontend/ 2>/dev/null || true
mv ~/*.sql ~/varmi-com/sql/ 2>/dev/null || true
rmdir ~/frontend-dist 2>/dev/null || true

echo "✓ Folders organized"

# 2. Backend .env oluştur
echo ""
echo "Step 2: Creating .env file..."
cd ~/varmi-com/server
cp .env.example .env

# .env dosyasını düzenle
cat > .env << 'EOF'
# Database
DB_HOST=localhost
DB_USER=varmi_user
DB_PASSWORD=Brkaydn426859..
DB_NAME=varmi_db
DB_PORT=3306

# Server
PORT=8787
NODE_ENV=production
USE_HTTPS=true

# JWT Secret (güvenli bir key oluşturun)
JWT_SECRET=varmi_jwt_secret_2025_production_key_change_this

# SMTP Email Settings (Gmail örneği)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM=noreply@varmii.com

# Frontend URL
FRONTEND_URL=https://192.168.1.116
EOF

echo "✓ .env file created"
echo "⚠  Please edit ~/varmi-com/server/.env and update SMTP settings"

# 3. Backend dependencies kur
echo ""
echo "Step 3: Installing backend dependencies..."
cd ~/varmi-com/server
pnpm install --prod

echo "✓ Dependencies installed"

# 4. SQL migrations çalıştır
echo ""
echo "Step 4: Running SQL migrations..."
cd ~/varmi-com/sql

mysql -u varmi_user -pBrkaydn426859.. varmi_db < create_admin_tables.sql
mysql -u varmi_user -pBrkaydn426859.. varmi_db < create_orders_tables.sql
mysql -u varmi_user -pBrkaydn426859.. varmi_db < create_user_addresses_table.sql
mysql -u varmi_user -pBrkaydn426859.. varmi_db < add_listing_approval_system.sql
mysql -u varmi_user -pBrkaydn426859.. varmi_db < add_offer_approval_system.sql
mysql -u varmi_user -pBrkaydn426859.. varmi_db < update_order_status_system.sql

echo "✓ SQL migrations completed"

# 5. PM2 ile backend'i başlat
echo ""
echo "Step 5: Starting backend with PM2..."
cd ~/varmi-com/server
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✓ Backend started with PM2"

# 6. Nginx config oluştur
echo ""
echo "Step 6: Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/varmi.com > /dev/null << 'EOF'
# HTTP - HTTPS'e yönlendir
server {
    listen 80;
    server_name 192.168.1.116 varmii.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Frontend
server {
    listen 443 ssl http2;
    server_name 192.168.1.116 varmii.com;

    # SSL sertifikaları
    ssl_certificate /home/varmii/varmi-com/server/ssl/cert.pem;
    ssl_certificate_key /home/varmii/varmi-com/server/ssl/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend static files
    root /home/varmii/varmi-com/frontend;
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

    # Upload folder
    location /uploads {
        proxy_pass https://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

# Nginx config'i aktifleştir
sudo ln -sf /etc/nginx/sites-available/varmi.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "✓ Nginx configured and reloaded"

# 7. Firewall ayarları
echo ""
echo "Step 7: Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "✓ Firewall configured"

# 8. Özet
echo ""
echo "========================================"
echo "✅ Setup Complete!"
echo "========================================"
echo ""
echo "Backend status:"
pm2 status
echo ""
echo "Test your site:"
echo "  https://192.168.1.116"
echo ""
echo "Useful commands:"
echo "  pm2 logs varmi-mail-server  # Backend logs"
echo "  pm2 restart varmi-mail-server  # Restart backend"
echo "  sudo systemctl status nginx  # Nginx status"
echo "  mysql -u varmi_user -p varmi_db  # Database access"
echo ""
echo "Next steps:"
echo "1. Edit SMTP settings: nano ~/varmi-com/server/.env"
echo "2. Restart backend: pm2 restart varmi-mail-server"
echo "3. Create admin user: cd ~/varmi-com/server && node check-db.js"
echo ""
