import { query } from './database.js';

export async function generateSitemap() {
  const baseUrl = process.env.SITE_URL || 'https://varmii.com';
  const now = new Date().toISOString();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">

  <!-- Ana Sayfa -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${now}</lastmod>
  </url>

  <!-- Statik Sayfalar -->
  <url>
    <loc>${baseUrl}/how-it-works</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/faq</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;

  try {
    // Aktif ilanlar
    const listings = await query(`
      SELECT id, title, city, updated_at 
      FROM listings 
      WHERE status = 'active' 
        AND approval_status = 'approved'
      ORDER BY updated_at DESC 
      LIMIT 1000
    `);

    for (const listing of listings) {
      const lastmod = new Date(listing.updated_at).toISOString();
      xml += `  <url>
    <loc>${baseUrl}/listing/${listing.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <lastmod>${lastmod}</lastmod>
  </url>
`;
    }

  } catch (error) {
    console.error('Sitemap generation error:', error);
  }

  xml += '</urlset>';
  return xml;
}

export async function generateRobotsTxt() {
  const baseUrl = process.env.SITE_URL || 'https://varmii.com';
  
  return `# Varmii.com robots.txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /dashboard
Disallow: /profile/edit

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay for polite bots
Crawl-delay: 1

# Popular search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /
`;
}
