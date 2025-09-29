# Varmi.com – Otomatik Dağıtım (cPanel)

Bu depo için GitHub Actions ile otomatik dağıtım kuruldu. Amaç: `main` branch'e gelen değişiklikleri otomatik olarak hem canlı frontend (cPanel public_html) hem de backend (Node server) ortamına aktarmak.

## Ön Koşullar

- cPanel hesabında FTP ve SSH erişimi açık olmalı.
- Sunucuda Node.js (>=18) ve tercihen pnpm ya da npm, ayrıca pm2 (opsiyonel) kurulu olmalı.
- Aşağıdaki GitHub Secrets oluşturulmalı:

### Frontend (FTP)

- `FTP_SERVER` – cPanel FTP host (örn: `ftp.varmii.com` veya `varmii.com`)
- `FTP_USERNAME` – cPanel FTP kullanıcı adı
- `FTP_PASSWORD` – cPanel FTP şifresi
- `FTP_FRONTEND_DIR` – Hedef dizin (örn: `/public_html/` veya `/public_html/app/`)

### Backend (SSH/rsync)

- `SSH_HOST` – Sunucu host adı / IP (örn: `varmii.com`)
- `SSH_PORT` – SSH port (genelde `22`)
- `SSH_USER` – SSH kullanıcı adı
- `SSH_PRIVATE_KEY` – Private key (PEM) içeriği (GitHub Secret olarak yapıştırılacak)
- `BACKEND_REMOTE_DIR` – Uzak sunucuda backend için dizin (örn: `/home/USER/apps/varmi-mail-server`)

> Not: İlk dağıtımda uzak dizini kendiniz oluşturun ve kullanıcı izinlerini kontrol edin.

## İş Akışları

- `.github/workflows/deploy-frontend.yml` – Frontend build + FTP ile `dist/` çıktısının cPanel'e yüklenmesi.
- `.github/workflows/deploy-backend.yml` – Backend build + rsync ile `dist/` ve gerekli dosyaların sunucuya kopyalanıp PM2 ile restart edilmesi.
- `.github/workflows/manual-deploy.yml` – Manuel tetikleme ile frontend/backend/both seçenekli dağıtım.

## İlk Kurulum Adımları

1. Sunucuda backend için hedef dizin oluşturun (`BACKEND_REMOTE_DIR`).
2. `pm2` kullanacaksanız sunucuda `npm i -g pm2` ile kurun ve `ecosystem.config.js` dosyasını uzak dizine gönderdiğimizden emin olun.
3. GitHub Secrets'ları yukarıdaki şekilde ekleyin.
4. `main` branch'e push yapın veya Actions sekmesinden manuel workflow tetikleyin.

## Sorun Giderme

- FTP dağıtımı yavaşsa `danger-clean-slate: false` yapıp kısmi senkron kullanın.
- SSH yetki hatalarında authorized_keys ve dosya izinlerini kontrol edin.
- PM2 yoksa iş akışı otomatik olarak `node dist/index.js` ile arka planda başlatır.
- Backend .env gerektiriyorsa, uzak sunucuda `.env` dosyasını kendiniz oluşturun; repoda gizli tutun.

## Yerel Geliştirme

- Frontend: `pnpm dev` (shadcn-ui dizininde)
- Backend: `pnpm dev` (server dizininde)

Her push’tan sonra Actions sekmesinden dağıtım loglarını görebilirsiniz.
