#!/bin/bash
# Sitemap route'larını backend'e ekle

TARGET_FILE="$HOME/varmi-com/server/dist/index.js"
LINE_NUM=145

# Import statement'ı dosyanın başına ekle (diğer import'lardan sonra)
sed -i "25 a import { generateSitemap, generateRobotsTxt } from './sitemap.js';" "$TARGET_FILE"

# Route'ları seller-profile'dan sonra ekle
cat >> "$TARGET_FILE.tmp" << 'ROUTES'

// SEO Routes - Sitemap and Robots
app.get('/sitemap.xml', async (req, res) => {
  try {
    const xml = await generateSitemap();
    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Sitemap generation failed');
  }
});

app.get('/robots.txt', async (req, res) => {
  try {
    const txt = await generateRobotsTxt();
    res.header('Content-Type', 'text/plain');
    res.header('Cache-Control', 'public, max-age=86400');
    res.send(txt);
  } catch (error) {
    console.error('Robots.txt error:', error);
    res.status(500).send('robots.txt generation failed');
  }
});

ROUTES

# Route'ları ekle
head -n 145 "$TARGET_FILE" > "$TARGET_FILE.new"
cat "$TARGET_FILE.tmp" >> "$TARGET_FILE.new"
tail -n +146 "$TARGET_FILE" >> "$TARGET_FILE.new"
mv "$TARGET_FILE.new" "$TARGET_FILE"
rm "$TARGET_FILE.tmp"

echo "✅ Sitemap routes added to index.js"
