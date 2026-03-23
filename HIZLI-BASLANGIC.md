# Varmi.com - Hızlı Başlangıç

## Portable MySQL ile Çalışma

### İlk Kurulum (Sadece 1 kez)
Zaten yapıldı! `mysql-portable` klasörü hazır.

### MySQL Başlat
```powershell
.\start-mysql.ps1
```

### MySQL Durdur
```powershell
.\stop-mysql.ps1
```

### Backend Başlat
```powershell
cd server
pnpm dev
```

Backend: https://localhost:8787

### Frontend Başlat  
```powershell
cd shadcn-ui
pnpm dev
```

Frontend: http://localhost:5173

## Yeni Makineye Taşıma

1. **Proje klasörünü kopyala**: Tüm `Varmi-com-sql` klasörünü kopyalayın
2. **MySQL başlat**: `.\start-mysql.ps1` çalıştırın
3. **Backend başlat**: `cd server; pnpm dev`
4. **Frontend başlat**: `cd shadcn-ui; pnpm dev`

Hepsi bu kadar! Tüm verileriniz `mysql-portable/data` klasöründe.

## Veritabanı Bilgileri

- Host: 127.0.0.1
- Port: 3306
- User: root
- Password: (boş)
- Database: varmi_db

## Yedekleme

**Önemli**: `mysql-portable` klasörünü düzenli yedekleyin!

```powershell
# Yedek oluştur
Compress-Archive -Path "mysql-portable" -DestinationPath "backup-$(Get-Date -Format 'yyyyMMdd').zip"
```

## Sorun Giderme

### MySQL çalışmıyor
```powershell
# Process kontrolü
Get-Process mysqld

# Error log'a bak
Get-Content mysql-portable\data\*.err -Tail 30
```

### Port 3306 kullanımda
```powershell
# Port'u kullanan process'i bul
netstat -ano | Select-String ":3306"

# Process'i durdur
Stop-Process -Name mysqld -Force
```

### Tablolar eksik
```powershell
# Tabloları yeniden oluştur
Get-Content create-all-tables.sql | .\mysql-portable\bin\mysql.exe -u root --protocol=TCP --host=127.0.0.1 varmi_db
```

## Faydalı Komutlar

### MySQL Console'a bağlan
```powershell
.\mysql-portable\bin\mysql.exe -u root --protocol=TCP --host=127.0.0.1 varmi_db
```

### Tabloları listele
```powershell
.\mysql-portable\bin\mysql.exe -u root --protocol=TCP --host=127.0.0.1 varmi_db -e "SHOW TABLES;"
```

### Veritabanı dump al
```powershell
.\mysql-portable\bin\mysqldump.exe -u root --protocol=TCP --host=127.0.0.1 varmi_db > backup.sql
```

### Dump'ı geri yükle
```powershell
Get-Content backup.sql | .\mysql-portable\bin\mysql.exe -u root --protocol=TCP --host=127.0.0.1 varmi_db
```
