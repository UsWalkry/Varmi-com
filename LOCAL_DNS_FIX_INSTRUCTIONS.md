# Local DNS Fix - Manual Instructions
# Aynı network'teki BÜTÜN PC'lerde yapılmalı

## Windows için (Administrator olarak):

1. Notepad'i YÖNETİCİ olarak aç:
   - Başlat menüsünde "notepad" ara
   - Sağ tık → "Run as administrator"

2. Dosyayı aç:
   File → Open → C:\Windows\System32\drivers\etc\hosts
   (Dosya tipi: "All Files (*.*)" seçin)

3. Dosyanın sonuna ekleyin:
   ```
   192.168.1.106 varmii.com
   192.168.1.106 www.varmii.com
   ```

4. Kaydet ve kapat

5. DNS cache'i temizle:
   ```
   ipconfig /flushdns
   ```

6. Browser'ı kapatıp tekrar aç ve test et: https://varmii.com


## Linux/Mac için:

1. Terminal'de çalıştır:
   ```bash
   sudo nano /etc/hosts
   ```

2. Dosyanın sonuna ekle:
   ```
   192.168.1.106 varmii.com
   192.168.1.106 www.varmii.com
   ```

3. Kaydet (Ctrl+O, Enter, Ctrl+X)

4. DNS cache temizle:
   ```bash
   # Mac:
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Linux:
   sudo systemctl restart systemd-resolved
   # veya
   sudo /etc/init.d/nscd restart
   ```

5. Test et: https://varmii.com


## Router Çözümü (Kalıcı - Tüm cihazlar için):

Eğer router yönetici erişiminiz varsa:

1. Router admin paneline girin (genellikle 192.168.1.1)
2. "NAT Loopback" veya "Hairpin NAT" ayarını aktif edin
3. Alternatif: Local DNS Server ekleyin:
   - DNS Entries → Add
   - Domain: varmii.com
   - IP: 192.168.1.106


## Sorun Neden Oluşuyor?

```
Internet'ten erişim (ÇALIŞIYOR):
External PC → Internet → Cloudflare (104.21.33.70) 
           → Router (Port Forward) → 192.168.1.106 ✅

Local network'ten erişim (ÇALIŞMIYOR):
Local PC → DNS lookup → Cloudflare IP (104.21.33.70)
        → Router'a gider ama router geri yönlendiremez ❌

Local network'ten erişim (HOSTS FİX):
Local PC → /etc/hosts → 192.168.1.106 (direkt)
        → Local server'a bağlanır ✅
```


## Test Komutları:

Windows:
```powershell
# DNS çözümlemesini kontrol et:
nslookup varmii.com

# IP'ye ping at:
ping 192.168.1.106

# HTTPS bağlantısını test et:
curl -k https://192.168.1.106
```

Linux/Mac:
```bash
# DNS çözümlemesini kontrol et:
dig varmii.com

# IP'ye ping at:
ping 192.168.1.106

# HTTPS test:
curl -k https://192.168.1.106
```


## Güvenlik Notu:

Bu değişiklik SADECE local network içinde geçerlidir.
Dışarıdan erişim (Internet) etkilenmez.
Cloudflare CDN koruması dışarıdan hala aktiftir.
