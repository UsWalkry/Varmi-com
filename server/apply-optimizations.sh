#!/bin/bash
cd ~/varmi-com/server/dist

# Backup
cp index.js index.js.original

# 1. Rate limiter import ekle (satır 29'dan sonra)
sed -i '29a\\n// Rate limiting\nimport { generalLimiter, authLimiter, listingsLimiter, offerCreateLimiter, commentLimiter, uploadLimiter, adminLimiter } from '"'"'./rateLimiter.js'"'"';' index.js

# 2. Sitemap import ekle (satır 32'den sonra, rate limiter import'undan sonra)
sed -i '32a\\n// SEO\nimport { generateSitemap, generateRobotsTxt } from '"'"'./sitemap.js'"'"';' index.js

# 3. Route satırlarını bul ve rate limiter ekle
sed -i "s|app.use('/api/auth', authRoutes);|app.use('/api/auth', authLimiter, authRoutes);|" index.js
sed -i "s|app.use('/api/listings', listingsRoutes);|app.use('/api/listings', listingsLimiter, listingsRoutes);|" index.js
sed -i "s|app.use('/api/offers', offersRoutes);|app.use('/api/offers', offerCreateLimiter, offersRoutes);|" index.js
sed -i "s|app.use('/api/comments', commentsRoutes);|app.use('/api/comments', commentLimiter, commentsRoutes);|" index.js
sed -i "s|app.use('/api/admin', adminRoutes);|app.use('/api/admin', adminLimiter, adminRoutes);|" index.js

# 4. Sitemap routes ekle (server başlatmadan önce, satır 340'tan önce)
sed -i '339a\\n// SEO Routes\napp.get('"'"'/sitemap.xml'"'"', async (req, res) => {\n  try {\n    const xml = await generateSitemap();\n    res.header('"'"'Content-Type'"'"', '"'"'application/xml'"'"');\n    res.header('"'"'Cache-Control'"'"', '"'"'public, max-age=3600'"'"');\n    res.send(xml);\n  } catch (error) {\n    console.error('"'"'Sitemap error:'"'"', error);\n    res.status(500).send('"'"'Sitemap generation failed'"'"');\n  }\n});\n\napp.get('"'"'/robots.txt'"'"', async (req, res) => {\n  try {\n    const txt = await generateRobotsTxt();\n    res.header('"'"'Content-Type'"'"', '"'"'text/plain'"'"');\n    res.header('"'"'Cache-Control'"'"', '"'"'public, max-age=86400'"'"');\n    res.send(txt);\n  } catch (error) {\n    console.error('"'"'Robots.txt error:'"'"', error);\n    res.status(500).send('"'"'robots.txt generation failed'"'"');\n  }\n});' index.js

# 5. Trust proxy ayarı ekle (app oluşturulduktan sonra, satır 80 civarı)
sed -i '80a\\n// Trust proxy for Cloudflare\napp.set('"'"'trust proxy'"'"', 1);' index.js

echo "✅ Tüm değişiklikler uygulandı"
wc -l index.js
