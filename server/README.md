# Varmı Mail Server

Küçük bir Express + Nodemailer servisi. Frontend `/shadcn-ui` projesi, bu sunucu üzerinden e-posta gönderir.

## Ortam değişkenleri

- SMTP_HOST: SMTP sunucu adresi (örn: smtp.yourprovider.com)
- SMTP_PORT: 465 (TLS/SMTPS için)
- SMTP_SECURE: true (465 için true olmalı)
- SMTP_USER: noreply@varmi.com
- SMTP_PASS: SMTP şifresi
- MAIL_FROM_NAME: Görünen ad (Varmı)
- MAIL_FROM_EMAIL: Gönderen e-posta (noreply@varmi.com)
- PORT: Sunucu portu (default 8787)

`.env.example` dosyasını `.env` olarak kopyalayıp değerleri düzenleyin.

## Geliştirme

1. Bağımlılıklar

```
pnpm i
```

2. Çalıştır

```
pnpm dev
```

3. Sağlık kontrolü

```
curl http://localhost:8787/health
```

Not: `.env` içinde gerçek SMTP ayarları yoksa sunucu geliştirme modunda gönderimleri simüle eder (jsonTransport). Bu durumda `/api/send` 200 döner ancak gerçek mail gönderilmez; loglar terminalde görünür.

## Frontend entegrasyonu

`/shadcn-ui` kökünde `.env.local` içine şunu ekleyin:

```
VITE_MAIL_API_BASE=http://localhost:8787
```

Ardından uygulama bu endpoint’i kullanacaktır.
