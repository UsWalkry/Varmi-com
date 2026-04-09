import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { viteSourceLocator } from "@metagptx/vite-plugin-source-locator";
// Sentry Vite plugin (optional)
import { sentryVitePlugin } from "@sentry/vite-plugin";

// Custom plugin to handle malformed URI errors gracefully
const handleMalformedUri = () => ({
  name: 'handle-malformed-uri',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      try {
        decodeURI(req.url);
        next();
      } catch (e) {
        // Silently ignore malformed URIs (usually from browser extensions or bots)
        res.statusCode = 400;
        res.end('Bad Request');
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const sentryDsn = (env.VITE_SENTRY_DSN || '').trim();
  const isProduction = mode === 'production';

  // SSL sertifikalarını yükle
  const sslKeyPath = path.resolve(__dirname, '../server/ssl/key.pem');
  const sslCertPath = path.resolve(__dirname, '../server/ssl/cert.pem');
  
  let httpsConfig;
  let port = 3000; // Use port 3000 for dev
  let host = '0.0.0.0'; // Bind to all interfaces for external access
  
  try {
    if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
      httpsConfig = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      };
      console.log('✅ SSL certificates loaded successfully');
      console.log('🌐 Access at: https://192.168.1.119:443 or https://varmii.com');
    } else {
      console.log('⚠️  SSL certificates not found, using HTTP on port 80');
      httpsConfig = undefined;
      port = 80;
    }
  } catch (error) {
    console.error('❌ Error loading SSL certificates:', error);
    httpsConfig = undefined;
    port = 80;
  }

  return {
    plugins: [
      handleMalformedUri(), // Must be first to catch malformed URIs early
      // viteSourceLocator kapat (performans için)
      // viteSourceLocator({
      //   prefix: "mgx",
      // }),
      react(),
      // 🔒 SECURITY: Sentry sadece development'ta (source code upload önleme)
      ...(sentryDsn && !isProduction ? [sentryVitePlugin({
        org: env.SENTRY_ORG || undefined,
        project: env.SENTRY_PROJECT || undefined,
      })] : []),
    ],
    // 🔒 SECURITY: Production build güvenlik ayarları
    build: {
      sourcemap: false, // Source maps kapalı (kaynak kod koruması)
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction, // Production'da console.log kaldır
          drop_debugger: true,
          pure_funcs: isProduction ? ['console.log', 'console.debug', 'console.info'] : [],
        },
        mangle: {
          safari10: true,
        },
      },
      rollupOptions: {
        output: {
          // Simplified chunking - let Vite handle it automatically
          manualChunks: undefined,
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host,
      port,
      strictPort: true, // Must use exactly port 443
      https: httpsConfig,
      hmr: {
        overlay: false,
      },
      allowedHosts: ['varmii.com', 'www.varmii.com', 'localhost', '127.0.0.1', '192.168.1.119'],
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              proxyRes.headers['content-type'] = 'application/json; charset=utf-8';
            });
          },
        },
        '/uploads': {
          target: 'http://localhost:8787',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port,
      strictPort: true,
      https: httpsConfig,
    },
  };
});
