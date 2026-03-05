import { Router } from 'express';
import { query } from '../database.js';

const router = Router();

/**
 * Generate XML sitemap dynamically
 * Includes: homepage, active listings, static pages
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    console.log('🗺️ Generating sitemap.xml...');

    const baseUrl = process.env.FRONTEND_URL || 'https://varmii.com';
    const today = new Date().toISOString().split('T')[0];

    // Get active + approved listings
    const listingsQuery = `
      SELECT id, updated_at, created_at 
      FROM listings 
      WHERE status = 'active' 
        AND approval_status = 'approved'
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY updated_at DESC 
      LIMIT 5000
    `;

    const result: any = await query(listingsQuery);
    const listings = Array.isArray(result) ? result : (Array.isArray(result[0]) ? result[0] : []);

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Homepage
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    // Static pages
    const staticPages = [
      { path: '/about', priority: '0.8', changefreq: 'monthly' },
      { path: '/contact', priority: '0.7', changefreq: 'monthly' },
      { path: '/listings', priority: '0.9', changefreq: 'hourly' }
    ];

    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // Listings (dynamic)
    listings.forEach((listing: any) => {
      const lastmod = (listing.updated_at || listing.created_at)
        .toISOString()
        .split('T')[0];

      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/listing/${listing.id}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    console.log(`✅ Sitemap generated: ${listings.length} listings`);

    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
    res.send(xml);
  } catch (error) {
    console.error('❌ Sitemap generation error:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Sitemap generation failed</error>');
  }
});

export default router;
