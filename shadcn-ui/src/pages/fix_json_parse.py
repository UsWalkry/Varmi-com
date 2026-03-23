#!/usr/bin/env python3
"""
ListingDetail.tsx dosyasındaki JSON.parse satırlarını comment out et
"""

# Backup dosyasını oku
with open('ListingDetail.tsx.backup', 'r', encoding='utf-8') as f:
    content = f.read()

# JSON.parse bölümünü tamamen comment out et
content = content.replace(
    '                const parsedImages = JSON.parse(originalOffer.images);',
    '                // const parsedImages = JSON.parse(originalOffer.images); // DISABLED - WebP images too large'
)

content = content.replace(
    '                offer.images = parsedImages;',
    '                // offer.images = parsedImages; // DISABLED - using empty array instead'  
)

# Yeni dosyaya yaz
with open('ListingDetail.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ JSON.parse satırları comment out edildi")