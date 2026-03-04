import express from 'express';
import https from 'https';
import http from 'http';
import { readFileSync } from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as Sentry from '@sentry/node';
import { testConnection } from './database.js';
import { csrfTokenEndpoint, ensureCSRFToken } from './middleware/csrf.js';
import { initRedis } from './utils/redisCache.js';

// Route imports
import authRoutes from './routes/auth.js';
import listingsRoutes from './routes/listings.js';
import offersRoutes from './routes/offers.js';
import favoritesRoutes from './routes/favorites.js';
import notificationRoutes from './routes/notifications.js';
import ordersRoutes from './routes/orders.js';
import setupRoutes from './routes/setup.js';
import usersRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import addressesRoutes from './routes/addresses.js';
import commentsRoutes from './routes/comments.js';
import commissionRoutes from './routes/commission.js';
import supportRoutes from './routes/support.js';
import sellerProfileRoutes from './routes/sellerProfile.js';
import monitoringRoutes, { metricsMiddleware } from './routes/monitoring.js';
import sitemapRoutes from './routes/sitemap.js';
import cartRoutes from './routes/cart.js';
import ibanRoutes from './routes/ibans.js';
// .env yolunu her zaman server klasörüne sabitle (dist veya src’den çalışsa da)
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const envPath = resolve(__dirname, '../.env');
  dotenv.config({ path: envPath });
  // eslint-disable-next-line no-console
  console.log(`[mail:env] loaded .env from ${envPath}`);
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[mail:env] .env load error:', e);
}

const app = express();

// Trust proxy - nginx reverse proxy kullanıyoruz
app.set('trust proxy', 1);

// Sentry init (backend)
const SENTRY_DSN = (process.env.SENTRY_DSN || '').trim();
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
  });
  // Request handler en başta olmalı
  app.use(Sentry.Handlers.requestHandler());
}

// 🛡️ Helmet.js - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // File uploads için
}));

// 🛡️ Rate Limiting - Redis-based (distributed, multi-server ready)
const { redisClient } = await initRedis();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 500, // IP başına 500 istek (high-traffic için artırıldı)
  message: 'Çok fazla istek gönderdiniz, lütfen 15 dakika sonra tekrar deneyin.',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
});
app.use(limiter);

// 🛡️ Auth endpoints için özel rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 15 dakikada 10 deneme (biraz artırıldı)
  message: 'Çok fazla giriş denemesi, lütfen 15 dakika sonra tekrar deneyin.',
  skipSuccessfulRequests: true,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'rl:auth:',
  }),
});

// 🛡️ Data sanitization - NoSQL injection koruması
app.use(mongoSanitize());

// 🛡️ HPP - HTTP Parameter Pollution koruması
app.use(hpp());

// 🍪 Cookie parser (CSRF için gerekli)
app.use(cookieParser());

// 🛡️ CSRF Token - Auto-generate if missing
app.use(ensureCSRFToken);

// 🔒 CORS - Production-safe ayarlar
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://localhost:3000',
  'http://192.168.1.104:5173',
  'http://192.168.1.119:443',
  'https://192.168.1.119:443',
  'http://192.168.1.116',
  'https://192.168.1.116',
  'https://varmii.com',
  'https://www.varmii.com',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Development: origin undefined ise (Postman, curl) izin ver
    if (!origin || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    // Production: sadece whitelist'teki originlere izin ver
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy tarafından engellenmiştir'));
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Authorization','Content-Type','X-Requested-With','x-api-key'],
  exposedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Auth limiter'ı export et
export { authLimiter };

// JSON body parser with increased limit for WebP images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// UTF-8 charset için response header'ları ayarla
app.use((req, res, next) => {
  // JSON response'ları için charset ayarla
  const originalJson = res.json;
  res.json = function(obj) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Encoding', 'identity');
    res.setHeader('Accept-Charset', 'utf-8');
    return originalJson.call(this, obj);
  };
  next();
});

// Static file serving for uploaded images
app.use('/uploads', express.static('uploads'));

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// MySQL bağlantısını test et
testConnection();

// Redis bağlantısını başlat
initRedis();

// 🔐 CSRF Token endpoint
app.get('/api/csrf-token', csrfTokenEndpoint);

// 📊 Metrics middleware - Track all API requests
app.use('/api', metricsMiddleware);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/addresses', addressesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/commission', commissionRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/seller-profile', sellerProfileRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/ibans', ibanRoutes);
app.use('/api', monitoringRoutes);

// SEO Routes (no /api prefix)
app.use('/', sitemapRoutes);

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'Varmi.com backend server is running!',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/log', '/api/log-message', '/api/send', '/api/auth', '/api/listings']
  });
});

// Config via env to avoid hardcoding secrets
// Desteklenen ortam değişkenleri (hem SMTP_* hem de MAIL_* isimleri desteklenir)
const MAIL_SECURE_RAW = process.env.MAIL_SECURE; // 'ssl' | 'tls'
const SMTP_HOST = process.env.SMTP_HOST || process.env.MAIL_HOST || 'mail.varmii.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === 'true'
  : MAIL_SECURE_RAW
    ? MAIL_SECURE_RAW.toLowerCase() === 'ssl'
    : SMTP_PORT === 465; // 465 için true (SMTPS/implicit TLS), 587 için genelde false (STARTTLS)
const SMTP_USER = process.env.SMTP_USER || process.env.MAIL_USER || 'noreply@varmii.com';
const SMTP_PASS = process.env.SMTP_PASS || process.env.MAIL_PASS || '';
const FROM_NAME = process.env.MAIL_FROM_NAME || process.env.MAIL_FROM || 'Varmı';
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL || process.env.MAIL_FROM || SMTP_USER;
const MAIL_API_KEY = process.env.MAIL_API_KEY || '';
const DEBUG_MAIL = process.env.DEBUG_MAIL === 'true';

function createTransport() {
  const configured = !!(SMTP_HOST && SMTP_PASS);
  if (!configured) {
    // Dev fallback: gerçek SMTP ayarı yoksa gönderimi simüle et
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Aggressive pooling for faster delivery
    pool: true,
    maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 5), // Increased from 3
    maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 200), // Increased from 100
    rateDelta: Number(process.env.SMTP_RATE_DELTA || 500), // Decreased from 1000ms
    rateLimit: Number(process.env.SMTP_RATE_LIMIT || 20), // Increased from 10
    connectionTimeout: Number(process.env.SMTP_CONN_TIMEOUT || 5000), // Decreased from 10000ms
    greetingTimeout: Number(process.env.SMTP_GREET_TIMEOUT || 3000), // Decreased from 10000ms
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 8000), // Decreased from 15000ms
    logger: DEBUG_MAIL,
    debug: DEBUG_MAIL,
  });
}

// Create and reuse a single transporter instance for better performance
const TRANSPORTER = createTransport();

app.get('/health', async (_req, res) => {
  try {
    const configured = !!(SMTP_HOST && SMTP_PASS);
    if (!configured) {
      return res.json({ ok: true, configured: false });
    }
    await TRANSPORTER.verify();
    res.json({ ok: true, configured: true });
  } catch (e) {
    if (SENTRY_DSN) Sentry.captureException(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Error logging endpoints
app.post('/api/log', async (req, res) => {
  try {
    console.log('[DEBUG] Received error log request:', req.headers, req.body);
    const errorData = req.body;
    
    // Log to console with timestamp
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      ...errorData,
    };
    
    console.error('[CLIENT_ERROR]', JSON.stringify(logEntry, null, 2));
    
    // If Sentry is available, also send there
    if (SENTRY_DSN) {
      Sentry.withScope((scope) => {
        if (errorData.userId) {
          scope.setUser({ id: errorData.userId, email: errorData.userEmail });
        }
        scope.setContext('client_error', {
          url: errorData.url,
          route: errorData.route,
          component: errorData.component,
          userAgent: errorData.userAgent,
        });
        
        const error = new Error(errorData.message);
        if (errorData.stack) {
          error.stack = errorData.stack;
        }
        Sentry.captureException(error);
      });
    }
    
    res.json({ ok: true, logged: true });
  } catch (e) {
    console.error('[ERROR_LOGGING_FAILED]', e);
    res.status(500).json({ ok: false, error: 'Failed to log error' });
  }
});

app.post('/api/log-message', async (req, res) => {
  try {
    console.log('[DEBUG] Received message log request:', req.headers, req.body);
    const messageData = req.body;
    
    // Log to console with timestamp
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: (messageData.level || 'INFO').toUpperCase(),
      ...messageData,
    };
    
    const logMethod = messageData.level === 'error' ? console.error : 
                     messageData.level === 'warning' ? console.warn : 
                     console.log;
    
    logMethod('[CLIENT_LOG]', JSON.stringify(logEntry, null, 2));
    
    // If Sentry is available and it's important, also send there
    if (SENTRY_DSN && (messageData.level === 'error' || messageData.level === 'warning')) {
      Sentry.withScope((scope) => {
        if (messageData.userId) {
          scope.setUser({ id: messageData.userId, email: messageData.userEmail });
        }
        scope.setContext('client_message', {
          url: messageData.url,
          route: messageData.route,
          userAgent: messageData.userAgent,
          ...messageData.additionalData,
        });
        
        if (messageData.level === 'error') {
          Sentry.captureException(new Error(messageData.message));
        } else {
          Sentry.captureMessage(messageData.message, 'warning');
        }
      });
    }
    
    res.json({ ok: true, logged: true });
  } catch (e) {
    console.error('[MESSAGE_LOGGING_FAILED]', e);
    res.status(500).json({ ok: false, error: 'Failed to log message' });
  }
});

app.post('/api/send', async (req, res) => {
  if (MAIL_API_KEY) {
    const key = req.header('x-api-key');
    if (key !== MAIL_API_KEY) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const { to, subject, text, html } = req.body || {};
  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({ ok: false, error: 'Missing required fields: to, subject, text|html' });
  }
  try {
    const configured = !!(SMTP_HOST && SMTP_PASS);
    const t0 = Date.now();
    
    // Performance logging for debugging
    console.log(`[mail:sending] to=${to}, subject="${subject}"`);
    
    const info = await TRANSPORTER.sendMail({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
      // Immediate delivery priority
      priority: 'high',
      headers: { 
        'X-Priority': '1 (Highest)', 
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Varmi-FastMail/1.0'
      },
      // Force immediate delivery
      envelope: {
        from: FROM_EMAIL,
        to: [to]
      }
    });
    const durationMs = Date.now() - t0;
    
    // Performance logging
    console.log(`[mail:sent] duration=${durationMs}ms, id=${info.messageId}`);
    res.json({
      ok: true,
      id: (info as any).messageId || (info as any)?.envelope?.messageId || 'sent',
      configured,
      simulated: !configured,
      sendTimeMs: durationMs,
    });
  } catch (e) {
    const configured = !!(SMTP_HOST && SMTP_PASS);
    console.error('[mail:error]', { configured, host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, user: SMTP_USER, err: e });
    if (SENTRY_DSN) Sentry.captureException(e);
    res.status(500).json({ ok: false, error: String(e), configured, host: SMTP_HOST });
  }
});

// CORS-aware error handler (Sentry'den önce)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[MAIL_SERVER_ERROR]', err);
  
  // CORS header'larını hata yanıtında da koru
  res.set('Access-Control-Allow-Credentials', 'false');
  res.set('Vary', 'Origin');
  
  if (SENTRY_DSN) Sentry.captureException(err);
  
  res.status(500).json({ 
    ok: false, 
    error: err.message || 'Internal server error' 
  });
});

// Sentry error handler en sonda olmalı
if (SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const USE_HTTPS = process.env.USE_HTTPS === 'true';

// HTTPS için SSL sertifikası yükle
let server: http.Server | https.Server;

if (USE_HTTPS) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const sslDir = resolve(__dirname, '../ssl');
    
    const options = {
      key: readFileSync(resolve(sslDir, 'key.pem')),
      cert: readFileSync(resolve(sslDir, 'cert.pem'))
    };
    
    server = https.createServer(options, app);
    console.log('🔒 HTTPS mode enabled');
  } catch (error) {
    console.error('❌ SSL certificate not found. Run: node generate-ssl.js');
    console.error('   Falling back to HTTP...');
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const protocol = USE_HTTPS ? 'https' : 'http';
  console.log(`🚀 Varmi.com MySQL API Server running at ${protocol}://${HOST}:${PORT}`);
  console.log(`📧 Email service enabled`);
  console.log(`🗄️  MySQL database integration active`);
  if (USE_HTTPS) {
    console.log(`🔒 SSL/TLS encryption active`);
  }
});
