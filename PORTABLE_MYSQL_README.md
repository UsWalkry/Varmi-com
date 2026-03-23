# Portable MySQL Kurulum Rehberi

## Adim 1: MySQL'i indirin
1. https://dev.mysql.com/downloads/mysql/ adresine gidin
2. "MySQL Community Server" seçin
3. Windows (x86, 64-bit), ZIP Archive indirin (mysql-8.x.xx-winx64.zip)
4. İndirilen ZIP dosyasını proje klasörüne koyun

## Adim 2: Kurulum scriptini çalıştırın
```powershell
.\setup-portable-mysql.ps1
```

## Kullanım

### MySQL Başlatma:
```powershell
.\start-mysql.ps1
```

### MySQL Durdurma:
```powershell
.\stop-mysql.ps1
```

### Tabloları oluşturma:
```powershell
cd server
node create-missing-tables.js
```

## Taşınabilirlik

Başka makineye geçerken:
1. `mysql-portable` klasörünü kopyalayın
2. Yeni makinede `.\start-mysql.ps1` çalıştırın
3. Tüm verileriniz hazır!

## .env Ayarları
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=varmi_db
```
