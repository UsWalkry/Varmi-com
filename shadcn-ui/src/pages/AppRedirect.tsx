import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Android paket adı (AndroidManifest.xml'deki applicationId ile eşleşmeli)
const ANDROID_PACKAGE = 'com.example.varmi_flutter';

export default function AppRedirect() {
  const [params] = useSearchParams();
  const to = params.get('to');   // 'listing' | 'order' | 'dashboard'
  const id = params.get('id');

  const getWebUrl = () => {
    if (!to) return '/';
    if (to === 'order' && id) return `/order/${id}`;
    if (to === 'listing' && id) return `/listing/${id}`;
    if (to === 'dashboard') return '/dashboard';
    return '/';
  };

  // Custom scheme URL (iOS ve fallback için)
  const getAppSchemeUrl = () => {
    if (!to) return null;
    if (to === 'order' && id) return `varmi://order/${id}`;
    if (to === 'listing' && id) return `varmi://listing/${id}`;
    if (to === 'dashboard') return 'varmi://dashboard';
    return null;
  };

  // App URL path (intent:// içindeki yol)
  const getAppPath = () => {
    if (!to) return null;
    if (to === 'order' && id) return `order/${id}`;
    if (to === 'listing' && id) return `listing/${id}`;
    if (to === 'dashboard') return 'dashboard';
    return null;
  };

  // Android Chrome için intent:// URL formatı
  // window.location.href = 'varmi://...' Chrome'da sessizce engellenir,
  // intent:// formatı ise Chrome tarafından natively işlenir
  const getIntentUrl = (webUrl: string) => {
    const appPath = getAppPath();
    if (!appPath) return null;
    const fallback = encodeURIComponent(`https://varmii.com${webUrl}`);
    return `intent://${appPath}#Intent;scheme=varmi;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
  };

  const isAndroid = /android/i.test(navigator.userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const webUrl = getWebUrl();
  const intentUrl = getIntentUrl(webUrl);
  const appSchemeUrl = getAppSchemeUrl();

  useEffect(() => {
    if (isAndroid && intentUrl) {
      // Android: intent:// URL — Chrome uygulamayı açar, yoksa browser_fallback_url'ye gider
      window.location.href = intentUrl;
    } else if (isIOS && appSchemeUrl) {
      // iOS: Custom scheme, uygulama yüklü değilse timeout sonrası web'e düş
      const timeout = setTimeout(() => {
        window.location.replace(webUrl);
      }, 2000);
      window.location.href = appSchemeUrl;
      return () => clearTimeout(timeout);
    } else {
      // Masaüstü veya bilinmeyen — doğrudan web'e git
      window.location.replace(webUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#fff7ed',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '40px 32px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          maxWidth: '380px',
          width: '90%',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #EA580C, #F97316)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '28px',
          }}
        >
          🛒
        </div>
        <h1 style={{ color: '#1a1a1a', fontSize: '22px', margin: '0 0 8px', fontWeight: 700 }}>
          Var mıı?
        </h1>
        <p style={{ color: '#666', fontSize: '14px', margin: '0 0 28px', lineHeight: 1.5 }}>
          Uygulama yüklüyse otomatik açılıyor…
        </p>

        {/* Loading spinner */}
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid #fed7aa',
            borderTop: '3px solid #F97316',
            borderRadius: '50%',
            margin: '0 auto 28px',
            animation: 'spin 0.9s linear infinite',
          }}
        />

        <p style={{ color: '#999', fontSize: '13px', margin: '0 0 12px' }}>
          Uygulama açılmadıysa:
        </p>

        {/* Android için direkt intent:// linki */}
        {isAndroid && intentUrl && (
          <a
            href={intentUrl}
            style={{
              display: 'block',
              background: 'linear-gradient(135deg, #EA580C, #F97316)',
              color: 'white',
              padding: '12px 32px',
              borderRadius: '24px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '15px',
              boxShadow: '0 4px 12px rgba(249,115,22,0.35)',
              marginBottom: '12px',
            }}
          >
            Uygulamada Aç
          </a>
        )}

        <a
          href={webUrl}
          style={{
            display: 'inline-block',
            color: '#F97316',
            padding: '10px 24px',
            borderRadius: '24px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px',
            border: '1.5px solid #fed7aa',
          }}
        >
          Web Sitesinde Görüntüle
        </a>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
