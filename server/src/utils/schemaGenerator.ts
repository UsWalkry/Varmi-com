/**
 * Schema.org Structured Data Generator
 * SEO-friendly JSON-LD markup for better search visibility
 */

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  condition: 'new' | 'good' | 'any';
  images: string[];
  seller: {
    firstName: string;
    lastName: string;
  };
  location?: string;
  createdAt: string;
}

/**
 * Generate Product schema for listing
 */
export function generateProductSchema(product: Product, baseUrl: string = 'https://varmii.com'): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || `${product.title} - Varmii.com'da teklif alın`,
    image: product.images.map(img => `${baseUrl}${img}`),
    brand: {
      '@type': 'Brand',
      name: 'Varmii'
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: product.currency || 'TRY',
      lowPrice: product.price,
      highPrice: product.price,
      offerCount: 1,
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Person',
        name: `${product.seller.firstName} ${product.seller.lastName}`.trim()
      }
    },
    itemCondition: product.condition === 'new' 
      ? 'https://schema.org/NewCondition'
      : product.condition === 'good'
      ? 'https://schema.org/UsedCondition'
      : 'https://schema.org/RefurbishedCondition',
    url: `${baseUrl}/listing/${product.id}`,
    sku: product.id,
    datePublished: product.createdAt
  };
}

/**
 * Generate Organization schema for website
 */
export function generateOrganizationSchema(baseUrl: string = 'https://varmii.com'): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Varmii',
    alternateName: 'Varmii.com',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: 'İhtiyacınızı ilan edin, satıcılar size teklif versin. Türkiye\'nin en yenilikçi pazaryeri platformu.',
    sameAs: [
      'https://twitter.com/varmii',
      'https://facebook.com/varmii',
      'https://instagram.com/varmii'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+90-xxx-xxx-xxxx',
      contactType: 'customer service',
      areaServed: 'TR',
      availableLanguage: 'Turkish'
    }
  };
}

/**
 * Generate WebSite schema with search action
 */
export function generateWebsiteSchema(baseUrl: string = 'https://varmii.com'): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Varmii',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * Generate BreadcrumbList schema for navigation
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

/**
 * Generate ItemList schema for listing pages
 */
export function generateItemListSchema(
  items: Array<{ id: string; title: string; price: number }>,
  baseUrl: string = 'https://varmii.com'
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${baseUrl}/listing/${item.id}`,
      name: item.title
    }))
  };
}

/**
 * Generate Offer schema for individual offers
 */
export function generateOfferSchema(offer: {
  id: string;
  listingId: string;
  productName: string;
  price: number;
  currency: string;
  seller: { firstName: string; lastName: string };
  validUntil: string;
}, baseUrl: string = 'https://varmii.com'): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    itemOffered: {
      '@type': 'Product',
      name: offer.productName,
      url: `${baseUrl}/listing/${offer.listingId}`
    },
    price: offer.price,
    priceCurrency: offer.currency || 'TRY',
    availability: 'https://schema.org/InStock',
    priceValidUntil: offer.validUntil,
    seller: {
      '@type': 'Person',
      name: `${offer.seller.firstName} ${offer.seller.lastName}`.trim()
    },
    url: `${baseUrl}/offer/${offer.id}`
  };
}

/**
 * Helper: Convert schema object to JSON-LD script tag
 */
export function schemaToScriptTag(schema: object): string {
  return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
}
