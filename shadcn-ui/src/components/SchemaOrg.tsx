/**
 * Schema.org JSON-LD Component
 * Renders structured data for SEO
 */

import { useEffect } from 'react';

interface SchemaOrgProps {
  schema: object | object[];
}

export function SchemaOrg({ schema }: SchemaOrgProps) {
  useEffect(() => {
    // Remove old schema scripts
    const oldScripts = document.querySelectorAll('script[data-schema-org="true"]');
    oldScripts.forEach(script => script.remove());

    // Add new schema scripts
    const schemas = Array.isArray(schema) ? schema : [schema];
    schemas.forEach(schemaObj => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-schema-org', 'true');
      script.textContent = JSON.stringify(schemaObj);
      document.head.appendChild(script);
    });

    // Cleanup on unmount
    return () => {
      const scripts = document.querySelectorAll('script[data-schema-org="true"]');
      scripts.forEach(script => script.remove());
    };
  }, [schema]);

  return null; // This component doesn't render anything
}

/**
 * Generate Organization schema (for all pages)
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Varmii',
    alternateName: 'Varmii.com',
    url: 'https://varmii.com',
    logo: 'https://varmii.com/logo.png',
    description: 'İhtiyacınızı ilan edin, satıcılar size teklif versin. Türkiye\'nin en yenilikçi pazaryeri platformu.',
    sameAs: [
      'https://twitter.com/varmii',
      'https://facebook.com/varmii',
      'https://instagram.com/varmii'
    ]
  };
}

/**
 * Generate WebSite schema with search action (for homepage)
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Varmii',
    url: 'https://varmii.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://varmii.com/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  };
}
