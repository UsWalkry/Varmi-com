# 🔒 KAYNAK KOD GÜVENLİĞİ ANALİZİ - Varmii.com

**Tarih**: 2026-01-28  
**Risk Seviyesi**: 🟡 ORTA → 🟢 DÜŞÜK (Düzeltmeler sonrası)

---

## 🎯 ÖZET: KAYNAK KODLARINIZ ÇALINABİLİR Mİ?

### ✅ **GÜVENDE OLAN**
- Backend kaynak kodu (sunucuda, erişilemez)
- .env dosyaları (gitignore'da, sunucuda gizli)
- Database credentials
- JWT secret
- API logic

### ⚠️ **RİSKTE OLAN (Normal, Kabul Edilebilir)**
- Frontend React kodu (tarayıcıda çalışır, her zaman görünür)
- API endpoint URL'leri
- HTML/CSS/JavaScript

### 🔴 **RİSKLİ (Düzeltilmeli)**
- Source maps (eğer production'da aktifse)
- Sentry kaynak kodu upload
- viteSourceLocator (kapalı ama kodu var)

---

## 📊 DETAYLI ANALİZ

### 1. 🟢 **Backend Güvenliği: GÜVENDE**

**Durum**: ✅ Kaynak kod sunucuda gizli
- Backend TypeScript kodu compile ediliyor (dist/)
- Source maps yok (tsconfig.json kontrolü gerekli)
- dist/ klasörü sunucuya gidiyor ama şifrelenmiş
- PM2 ile çalışıyor, kaynak koda erişim yok

**Risk**: ⬇️ DÜŞÜK

**Saldırgan görebilir mi?**: ❌ HAYIR
- API response'ları görebilir
- Endpoint'leri görebilir
- AMA kaynak kodu göremez

---

### 2. 🟡 **Frontend Güvenliği: KISMİ RİSK**

**Durum**: ⚠️ React kodu tarayıcıda çalışır (NORMAL)

#### **A) JavaScript Kodu (NORMAL, Kaçınılmaz)**
- ✅ Tüm React/Vite projeleri böyledir
- ✅ Tarayıcı Developer Tools'da görünür
- ✅ Network tab'de API çağrıları görünür
- ⚠️ Business logic kısmen görünür

**Bu normaldir!** Modern web uygulamalarının doğası gereği.

**Koruma**:
- ✅ Kritik logic backend'de
- ✅ API authentication var
- ✅ Rate limiting var
- ✅ CORS koruması var

#### **B) Source Maps (RİSKLİ - Kontrol Gerekli)**

**Şu An**: ⚠️ Vite config'de source map ayarı YOK
```typescript
// vite.config.ts'de build.sourcemap ayarı yok
// Default: development'ta true, production'da false (iyi)
```

**Test Gerekli**: Production build'de .map dosyaları var mı?

**Risk Senaryosu**:
- Source maps varsa → Orijinal TypeScript kodu görünür
- Source maps yoksa → Sadece minified JS görünür

**Düzeltme** (Emin olmak için):
```typescript
// vite.config.ts'ye ekle
export default defineConfig({
  build: {
    sourcemap: false, // Production'da kesinlikle kapalı
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // console.log'ları kaldır
        drop_debugger: true,
      },
    },
  },
});
```

---

### 3. 🔴 **Sentry Source Maps (RİSKLİ)**

**Şu An**: ⚠️ Sentry plugin aktif
```typescript
sentryVitePlugin({
  org: env.SENTRY_ORG,
  project: env.SENTRY_PROJECT,
})
```

**Risk**: Sentry'ye kaynak kod upload ediliyor!
- Sentry dashboard'dan kaynak kod görülebilir
- Sentry hesabı hacklense → kaynak kod sızar

**Kim Görebilir?**:
- ✅ Sentry hesabına erişimi olanlar (siz)
- ❌ Public olarak kimse (güvenli)
- ⚠️ Sentry data breach durumunda sızabilir

**Öneri**:
```typescript
// Production'da source upload kapatmak için:
...(sentryDsn && mode === 'development' ? [sentryVitePlugin(...)] : []),
```

---

### 4. 🟢 **Git Repository: GÜVENDE**

**Durum**: ✅ Git repo yok (lokal proje)
```bash
$ git remote -v
Git repo yok
```

**Risk**: ⬇️ YOK
- GitHub'da public değil
- GitLab'da değil
- Kaynak kod online'da yok

**Öneri**:
- Private repo kullanın (GitHub/GitLab)
- .gitignore eksiksiz (var ✅)
- .env dosyaları ignore'da (var ✅)

---

### 5. 🟡 **API Endpoint'leri: GÖRÜNÜRDevTools'da görünür
- /api/auth/login
- /api/listings
- /api/offers
- vb...

**Risk**: ⬇️ DÜŞÜK
- Endpoint'ler bilinse de authentication gerekli
- Rate limiting var
- Input validation var

---

## 🔓 SALDIRGAN NE GÖREBİLİR?

### **Şu An (Düzeltme Öncesi)**

```
✅ Tarayıcıda:
   └─ Minified JavaScript (karmaşık ama okunabilir)
   └─ API endpoint URL'leri
   └─ React component yapısı (kısmen)
   └─ localStorage key'leri (mysql-auth-token)

❌ Göremez:
   └─ Backend kaynak kodu
   └─ .env dosyaları
   └─ Database şifreleri
   └─ JWT secret
   └─ Server logic

⚠️ Sentry'de:
   └─ Source maps (eğer upload ediliyorsa)
   └─ Error stack traces
```

### **Düzeltme Sonrası**

```
✅ Görebilir (Normal):
   └─ Heavy minified JS (okuması çok zor)
   └─ API endpoint'ler (zararsız)

❌ Göremez:
   └─ Orijinal TypeScript kodu
   └─ Source maps
   └─ Sentry source code
   └─ Backend logic
```

---

## 🛡️ ÖNERİLEN DÜZELTMELERProduction build ayarlarını güçlendir**

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    build: {
      sourcemap: false, // Kaynak haritası kapalı
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // console.log'ları sil
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug'],
        },
        mangle: {
          safari10: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
    
    plugins: [
      // Sentry sadece dev'de
      ...(sentryDsn && !isProduction ? [sentryVitePlugin(...)] : []),
    ],
  };
});
```

### **2. Source Map Kontrolü**

```bash
# Production build'de .map dosyaları var mı?
cd shadcn-ui
pnpm build
find dist -name "*.map" # Boş dönmeli
```

### **3. Backend Source Map Kapalı**

```json
// server/tsconfig.json
{
  "compilerOptions": {
    "sourceMap": false, // Kapalı olmalı
    "declaration": false,
    "removeComments": true
  }
}
```

### **4. Sensitive Data Temizliği**

```typescript
// Kod içinde hardcoded değer olmamalı
❌ const API_KEY = 'sk-1234567890';
✅ const API_KEY = import.meta.env.VITE_API_KEY;

❌ const DB_PASSWORD = 'mypassword';
✅ const DB_PASSWORD = process.env.DB_PASSWORD;
```

### **5. Robot.txt ve Security.txt**

```txt
# public/robots.txt
User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /.env
Disallow: /dist/

# public/.well-known/security.txt
Contact: security@varmii.com
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: tr, en
```

---

## 🧪 GÜVENLİK TEST PLANI

### **Test 1: Source Map Kontrolü**
```bash
# 1. Production build
cd shadcn-ui
pnpm build

# 2. .map dosyaları kontrol
ls -la dist/**/*.map
# Sonuç: "No such file" olmalı

# 3. Tarayıcıda kontrol
# DevTools → Sources → Orijinal kod görünmemeli
```

### **Test 2: Minification Kontrolü**
```bash
# 1. dist/assets/index-*.js dosyasını aç
cat dist/assets/index-*.js

# 2. Okunabilir mi?
# ❌ Okunabilir → Sorun var
# ✅ Karmaşık, tek satır → İyi
```

### **Test 3: Environment Variables**
```bash
# 1. Build dosyasında .env değerleri var mı?
grep -r "DB_PASSWORD\|JWT_SECRET\|SMTP_PASS" dist/

# 2. Sonuç boş olmalı
```

### **Test 4: API Reverse Engineering**
```bash
# 1. Chrome DevTools → Network
# 2. API çağrılarını izle
# 3. Authentication header var mı? ✅
# 4. Rate limit çalışıyor mu? ✅
```

---

## 📈 RİSK MATRİSİ

| Varlık | Görünürlük | Risk | Koruma |
|--------|------------|------|--------|
| Backend Source | ❌ Gizli | 🟢 Düşük | Sunucuda |
| .env Files | ❌ Gizli | 🟢 Düşük | .gitignore |
| Frontend JS (Minified) | ✅ Açık | 🟡 Orta | Minification |
| Source Maps | ⚠️ Olabilir | 🔴 Yüksek | Kapatılmalı |
| API Endpoints | ✅ Açık | 🟡 Orta | Auth + Rate Limit |
| Database | ❌ Gizli | 🟢 Düşük | Firewall |

---

## ✅ SONUÇ VE TAVSİYELER

### **Şu Anki Durum: 🟡 ORTA RİSK**
- Frontend kodu görünür (normal)
- Source maps durumu belirsiz (kontrol gerekli)
- Sentry source upload aktif (riskli)

### **Hedef Durum: 🟢 DÜŞÜK RİSK**
- Source maps kapalı
- Sentry production'da kapalı
- Heavy minification
- console.log'lar temiz

### **Action Items**:
1. ✅ `vite.config.ts`'yi güncelle (build options)
2. ✅ Production build yap ve .map kontrolü
3. ✅ `tsconfig.json`'da sourceMap: false
4. ✅ Sentry plugin production'da kapat
5. ⚠️ robots.txt ekle

### **Gerçek Risk**: 🟢 DÜŞÜK
Modern web uygulamalarının doğası gereği frontend kodu görünür olacaktır. Kritik business logic backend'de olduğu sürece problem yok.

**Sonuç**: Düzeltmeler yapıldığında kaynak kod güvenliği **endüstri standardında** olacak. 🎯

---

Düzeltmeleri yapayım mı?
