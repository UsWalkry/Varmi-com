# 🤝 Varmi.com Live Share Ekip Geliştirme Rehberi

## 🚀 Hızlı Başlangıç

### Oturum Sahibi (Burak) - Oturum Başlatma

1. VS Code'da sol alttaki **Live Share** ikonuna tıkla
2. **"Share (Read/Write)"** seç
3. Microsoft veya GitHub hesabıyla giriş yap
4. Oluşan linki kopyala ve arkadaşına gönder

### Katılımcı (Arkadaş) - Oturuma Katılma

1. VS Code'da **Live Share** eklentisini yükle: `Ctrl+Shift+X` → "Live Share" ara
2. Gönderilen linke tıkla VEYA
3. `Ctrl+Shift+P` → "Live Share: Join" yaz → Linki yapıştır

---

## 📁 Proje Yapısı

```
Varmi-com-sql/
├── shadcn-ui/          # Frontend (React + Vite) - Port: 5173
├── server/             # Backend (Express + MySQL) - Port: 8787
├── varmi_flutter/      # Mobile App (Flutter)
└── *.sql               # Database migration dosyaları
```

---

## 🖥️ Sunucuları Başlatma

### Backend Server
```bash
cd server
pnpm install    # İlk seferinde
pnpm dev        # Server başlat (port: 8787)
```

### Frontend Server
```bash
cd shadcn-ui
pnpm install    # İlk seferinde
pnpm dev        # Dev server başlat (port: 5173)
```

---

## 🌐 Paylaşılan Portlar

Live Share otomatik olarak şu portları paylaşır:

| Port | Servis | URL |
|------|--------|-----|
| 5173 | Frontend Dev | `localhost:5173` |
| 8787 | Backend API | `localhost:8787` |
| 3306 | MySQL | `localhost:3306` |

> **Not:** Katılımcı olarak bu portlara kendi `localhost`'unuzdan erişebilirsiniz!

---

## 🔧 Ortak Çalışma İpuçları

### 1. Terminal Paylaşımı
- Oturum sahibi terminali paylaşabilir: Terminal → Sağ tık → "Share Terminal"
- Katılımcı da terminal açabilir (izin verilirse)

### 2. Dosya Düzenleme
- Aynı anda farklı dosyaları düzenleyin (çakışma olmaz)
- Aynı dosyada çalışırken imleclerinizi görebilirsiniz

### 3. Debug Paylaşımı
- Breakpoint'leri birlikte kullanın
- Debug oturumunu birlikte izleyin

### 4. Fokus Takibi
- "Follow Participant" ile arkadaşınızın ne yaptığını izleyin
- Kendi çalışmanıza dönmek için herhangi bir yere tıklayın

---

## 🔒 Güvenlik Notları

1. **Oturum Linki** - Sadece güvendiğiniz kişilerle paylaşın
2. **Read/Write vs Read-Only** - Varsayılan okuma/yazma izni verir
3. **Oturumu Sonlandırma** - Live Share panelinden "Stop Collaboration Session"

---

## ⚙️ Ortam Değişkenleri

Katılımcının bilmesi gereken `.env` yapısı (`server/.env`):

```env
PORT=8787
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=varmi_db
JWT_SECRET=your_secret
```

> **Dikkat:** `.env` dosyası paylaşılmaz, herkes kendi lokalinde oluşturmalı!

---

## 📞 Sorun Giderme

### "Connection failed" hatası
- İnternet bağlantınızı kontrol edin
- VS Code'u yeniden başlatın
- Live Share eklentisini güncelleyin

### Port çakışması
- Portların başka uygulama tarafından kullanılıp kullanılmadığını kontrol edin:
  ```powershell
  netstat -ano | findstr :8787
  netstat -ano | findstr :5173
  ```

### Yavaş bağlantı
- "Direct Connection" tercih edilebilir (aynı ağdaysanız)
- Live Share ayarlarından "Connection Mode" kontrol edin

---

## 📚 Faydalı Komutlar

```powershell
# Proje bağımlılıklarını yükle
cd server; pnpm install; cd ../shadcn-ui; pnpm install

# Her iki serveri başlat (ayrı terminallerde)
# Terminal 1:
cd server; pnpm dev

# Terminal 2:
cd shadcn-ui; pnpm dev

# Database kontrol
cd server; node check-db.js

# Lint kontrol
cd shadcn-ui; pnpm lint
```

---

## 🎯 Geliştirme Kuralları

1. **API Çağrıları**: `mysqlAPI` kullan (`shadcn-ui/src/lib/mysql-api.ts`)
2. **Auth Token**: `mysql-auth-token` localStorage key'i
3. **Yeni Tablo**: Root'a SQL dosyası oluştur, server'da utility script yaz
4. **UI Bileşenleri**: shadcn/ui kullan, yeni bileşen için `pnpm dlx shadcn@latest add <component>`

---

**İyi geliştirmeler! 🚀**
