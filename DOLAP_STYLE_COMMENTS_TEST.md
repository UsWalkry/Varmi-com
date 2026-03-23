## 🧪 Dolap Tarzı Yorum Sistemi Test Senaryoları

### Senaryo 1: Buyer Yorum Atar (PRIVATE)
1. Normal kullanıcı (buyer) bir ilana yorum yazar
2. **Beklenen Sonuç:**
   - Yorum `visibility_state = 'PRIVATE_UNTIL_SELLER_REPLY'` olarak kaydedilir
   - Sadece buyer ve seller yorumu görür
   - Yorum kartında 🔒 "Sadece siz ve karşı taraf görür" rozeti görünür
   - Üçüncü kullanıcılar yorumu GÖRMEZ

### Senaryo 2: İki Taraf PRIVATE Sohbet Eder
1. Buyer yoruma ek mesaj yazar
2. Seller cevap yazmadan önce mesajlaşırlar
3. **Beklenen Sonuç:**
   - Tüm mesajlar PRIVATE kalır
   - Sadece buyer ve seller mesajları görür
   - `visibility_state` değişmez

### Senaryo 3: Seller İlk Kez Cevap Verir (PUBLIC)
1. Seller "Cevapla" butonuna tıklar
2. Mavi uyarı kutusunu görür: "İlk yanıtınızı verdiğinizde..."
3. Cevap yazar ve gönderir
4. **Beklenen Sonuç:**
   - Root comment `visibility_state = 'PUBLIC_AFTER_SELLER_REPLY'` olur
   - Root comment `is_first_seller_reply_exists = TRUE` olur
   - Root comment `is_visible = TRUE` olur
   - Seller'ın ilk cevabı `visibility_state = 'PUBLIC_AFTER_SELLER_REPLY'` olur
   - Root + ilk cevap artık HERKESE görünür
   - Yorum kartında 👁️ "Herkes görür" rozeti görünür
   - Diğer mesajlar hala PRIVATE

### Senaryo 4: Sonraki Mesajlar PRIVATE Kalır
1. Buyer seller'ın public cevabına tekrar cevap verir
2. **Beklenen Sonuç:**
   - Yeni mesaj `visibility_state = 'PRIVATE_UNTIL_SELLER_REPLY'` olur
   - Sadece buyer ve seller görür
   - Root comment PUBLIC kalmaya devam eder

### Senaryo 5: Üçüncü Kullanıcı Sadece PUBLIC Görür
1. Başka bir kullanıcı (guest veya authenticated) ilanı görüntüler
2. **Beklenen Sonuç:**
   - Sadece `visibility_state = 'PUBLIC_AFTER_SELLER_REPLY'` yorumları görür
   - PRIVATE mesajları GÖRMEZ

### Veritabanı Doğrulama:
```sql
-- Yeni yorum oluşturuldu mu?
SELECT id, comment, visibility_state, is_first_seller_reply_exists 
FROM listing_comments 
WHERE listing_id = 'YOUR_LISTING_ID'
ORDER BY created_at DESC;

-- Seller ilk cevap verdi mi?
SELECT lc.comment, lc.visibility_state, lc.is_owner_reply
FROM listing_comments lc
WHERE lc.listing_id = 'YOUR_LISTING_ID' 
  AND lc.is_owner_reply = TRUE
ORDER BY lc.created_at ASC
LIMIT 1;

-- Public vs Private sayısı
SELECT 
  visibility_state,
  COUNT(*) as count
FROM listing_comments
WHERE listing_id = 'YOUR_LISTING_ID'
GROUP BY visibility_state;
```

### API Test:
```javascript
// Test 1: Buyer yorum atar
const response1 = await fetch('/api/listings/LISTING_ID/comments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer BUYER_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ content: 'Test yorumu' })
});

// Test 2: Seller cevap verir
const response2 = await fetch('/api/comments/COMMENT_ID/messages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer SELLER_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ reply: 'Seller cevabı' })
});

// Test 3: Guest kullanıcı yorumları çeker
const response3 = await fetch('/api/listings/LISTING_ID/comments');
// Sadece PUBLIC yorumlar dönmeli
```

### Başarı Kriterleri:
- ✅ Yeni yorumlar PRIVATE başlar
- ✅ Sadece buyer ve seller PRIVATE yorumları görür
- ✅ Seller ilk cevap verince root + ilk cevap PUBLIC olur
- ✅ Sonraki mesajlar PRIVATE kalır
- ✅ Üçüncü kullanıcılar sadece PUBLIC görür
- ✅ Rozetler doğru görünür
- ✅ Seller'a uyarı mesajı gösterilir
