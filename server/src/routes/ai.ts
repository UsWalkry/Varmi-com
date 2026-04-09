import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Platformdaki tüm kategoriler (frontend ile senkronize — 9 ana başlık, 62 alt kategori)
const CATEGORIES = [
  // Elektronik
  'Bilgisayar / Tablet', 'Bilgisayar Parçaları', 'Ağ - Modem - Akıllı Ev', 'Çevre Birimleri',
  'Yazılım Ürünleri', 'Bilgisayar Aksesuarları', 'Kulaklık', 'Monitör',
  'Yazıcılar & Projeksiyon', 'Telefon & Aksesuar', 'TV & Ses Sistemleri',
  'Beyaz Eşya', 'Klima & Isıtıcı', 'Elektrikli Ev Aletleri', 'Foto & Kamera', 'Oyun & Konsol',
  // Moda
  'Kadın Giyim', 'Erkek Giyim', 'Ayakkabı & Çanta', 'Çocuk Giyim',
  // Ev, Yaşam, Kırtasiye
  'Mutfak & Sofra', 'Mobilya', 'Ev Tekstil', 'Ofis & Kırtasiye',
  // Oto, Bahçe, Yapı
  'Yapı Market', 'El Aletleri', 'Güvenlik', 'Bahçe', 'Elektrik & Tesisat',
  'Oto Aksesuar', 'Motor Ürünleri', 'Yedek Parça',
  // Anne, Bebek, Oyuncak
  'Oyuncak', 'Bebek Arabası', 'Mama', 'Bebek Odası', 'Bez & Islak Mendil', 'Bebek Giyim',
  // Spor & Outdoor
  'Spor Giyim', 'Fitness', 'Kamp', 'Scooter / Paten', 'Bisiklet', 'Su Sporları', 'Avcılık',
  // Kozmetik
  'Parfüm', 'Makyaj', 'Cilt Bakım', 'Saç Bakım', 'Ağız Bakım', 'Epilasyon', 'Deodorant',
  // Süpermarket & Petshop
  'Temizlik Ürünleri', 'Gıda', 'İçecek', 'Petshop', 'Ev Tüketim',
  // Kitap, Müzik, Hobi
  'Kitap', 'Müzik Enstrümanları', 'Film', 'Hobi', 'Dijital Ürünler',
];

/**
 * POST /api/ai/detect-category
 * Yüklenen resimlere bakarak kategoriyi otomatik tespit eder.
 */
router.post('/detect-category', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { imageUrls } = req.body as { imageUrls?: string[] };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.json({ success: false, error: 'AI servisi yapılandırılmamış' });
    if (!imageUrls || imageUrls.length === 0) return res.json({ success: false, error: 'Resim gerekli' });

    const categoryList = CATEGORIES.join(', ');

    const userContent: ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' } })[] = [
      {
        type: 'text',
        text: `Bu resimdeki ürünü aşağıdaki kategorilerden birine atıyorum.\n\nKategoriler: ${categoryList}\n\nSadece en uygun kategori adını olduğu gibi döndür (JSON: {"category": "..."})`,
      },
    ];

    for (const url of imageUrls.slice(0, 2)) {
      const fullUrl = url.startsWith('http') ? url : `https://varmii.com${url}`;
      userContent.push({ type: 'image_url', image_url: { url: fullUrl, detail: 'low' } });
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Sen bir ürün sınıflandırma asistanısın. Yalnızca verilen kategori listesinden en uygununu seç.' },
          { role: 'user', content: userContent },
        ],
        max_tokens: 60,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) return res.json({ success: false, error: 'AI servisi geçici olarak kullanılamıyor' });

    const data = await openaiRes.json() as { choices: { message: { content: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? '';
    let parsed: { category?: string };
    try { parsed = JSON.parse(raw); } catch { return res.json({ success: false, error: 'AI yanıtı işlenemedi' }); }

    // Dönen kategori listede var mı kontrol et
    const detected = CATEGORIES.find(c => c === parsed.category) ?? null;
    console.log('✅ AI category detected:', detected, 'for user', (req as any).userId);
    return res.json({ success: true, category: detected });
  } catch (error) {
    console.error('💥 AI detect-category error:', error);
    return res.json({ success: false, error: 'Beklenmeyen bir hata oluştu' });
  }
});

/**
 * POST /api/ai/suggest
 */
router.post('/suggest', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { category, title, imageUrls, condition, deliveryType } = req.body as {
      category?: string;
      title?: string;
      imageUrls?: string[];
      condition?: string;
      deliveryType?: string;
    };

    const conditionLabel = condition === 'new' ? 'Sıfır ürün' : condition === 'used' ? 'İkinci el ürün' : 'Sıfır veya ikinci el fark etmez';
    const deliveryLabel = deliveryType === 'shipping' ? 'Sadece kargo ile teslim' : deliveryType === 'pickup' ? 'Elden teslim (yüz yüze)' : 'Kargo veya elden teslim fark etmez';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.json({ success: false, error: 'AI servisi yapılandırılmamış (OPENAI_API_KEY eksik)' });
    }

    const systemPrompt =
      'Sen Varmi.com adlı Türk ikinci el ve ürün alım-satım platformu için çalışan uzman bir ilan yazarısın. ' +
      'Platformda alıcılar "ne aradıklarını" ilan olarak yayınlar, satıcılar teklif gönderir. ' +
      'Görevin: alıcının aradığı ürünü en etkili şekilde ifade eden başlık ve açıklama önerileri sunmak.\n\n' +
      'BAŞLIK KURALLARI:\n' +
      '- "Var mı?" ifadesini EKLEME (sistem otomatik ekliyor)\n' +
      '- Ürün adını, markayı, model/versiyonu, belirgin özellikleri içer\n' +
      '- 5-12 kelime arasında, akıcı ve arama dostu olsun\n' +
      '- Her öneri farklı bir açıdan yaklaşsın (marka odaklı, özellik odaklı, genel)\n\n' +
      'AÇIKLAMA KURALLARI:\n' +
      '- 3-5 cümle, somut ve bilgi dolu olsun\n' +
      '- Hangi özelliklerin önemli olduğunu, bütçe/durum tercihini, neden arandığını ima et\n' +
      '- Satıcıları doğru teklif vermeye yönlendirsin\n' +
      '- Samimi ve doğrudan bir dil kullan\n' +
      '- Farklı iki senaryo sun: biri detaylı teknik odaklı, biri kısa ve etkileyici';

    let userMessage = `Kategori: ${category || 'Genel'}`;
    if (title && title.trim()) userMessage += `\nKullanıcının yazdığı kısmi başlık: ${title.trim()}`;
    userMessage += `\nÜrün durumu tercihi: ${conditionLabel}`;
    userMessage += `\nTeslimat tercihi: ${deliveryLabel}`;
    userMessage +=
      '\n\nBu ürün alım ilanı için 3 farklı başlık önerisi ve 2 farklı açıklama metni yaz.' +
      '\nAçıklamalarda ürün durumu ve teslimat tercihini doğal biçimde yansıt.' +
      '\nJSON formatında döndür:\n{"titles":["öneri1","öneri2","öneri3"],"descriptions":["açıklama1","açıklama2"]}';

    // Build content array (text + optional images for vision)
    const userContent: ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' } })[] = [
      { type: 'text', text: userMessage },
    ];

    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls.slice(0, 3)) {
        const fullUrl = url.startsWith('http') ? url : `https://varmii.com${url}`;
        userContent.push({ type: 'image_url', image_url: { url: fullUrl, detail: 'low' } });
      }
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: imageUrls && imageUrls.length > 0 ? 'gpt-4o-mini' : 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 800,
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('❌ OpenAI error:', errText);
      return res.json({ success: false, error: 'AI servisi geçici olarak kullanılamıyor' });
    }

    const data = await openaiRes.json() as { choices: { message: { content: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? '';

    let parsed: { titles?: string[]; descriptions?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.json({ success: false, error: 'AI yanıtı işlenemedi' });
    }

    console.log('✅ AI suggest OK for user', (req as any).userId);
    return res.json({
      success: true,
      titles: parsed.titles ?? [],
      descriptions: parsed.descriptions ?? [],
    });
  } catch (error) {
    console.error('💥 AI suggest error:', error);
    return res.json({ success: false, error: 'Beklenmeyen bir hata oluştu' });
  }
});

export default router;
