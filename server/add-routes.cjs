const fs = require('fs');

const indexFile = '/home/burak/varmi-com/server/dist/index.js';
let content = fs.readFileSync(indexFile, 'utf8');

// Import ekle
const importLine = `import { generateSitemap, generateRobotsTxt } from './sitemap.js';`;
const importRegex = /import.*from.*'\.\/database\.js';/;
content = content.replace(importRegex, (match) => `${match}\n${importLine}`);

// Routes ekle
const routeCode = `
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
`;

const routeRegex = /app\.use\('\/api\/seller-profile', sellerProfileRoutes\);/;
content = content.replace(routeRegex, (match) => `${match}${routeCode}`);

fs.writeFileSync(indexFile, content, 'utf8');
console.log('✅ Sitemap routes added successfully!');
