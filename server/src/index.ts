import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const corsOptions = {
  origin: true as const,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Config via env to avoid hardcoding secrets
// Desteklenen ortam değişkenleri (hem SMTP_* hem de MAIL_* isimleri desteklenir)
const MAIL_SECURE_RAW = process.env.MAIL_SECURE; // 'ssl' | 'tls'
const SMTP_HOST = process.env.SMTP_HOST || process.env.MAIL_HOST || 'smtp.yourprovider.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === 'true'
  : MAIL_SECURE_RAW
    ? MAIL_SECURE_RAW.toLowerCase() === 'ssl'
    : SMTP_PORT === 465; // 465 için true (SMTPS/implicit TLS), 587 için genelde false (STARTTLS)
const SMTP_USER = process.env.SMTP_USER || process.env.MAIL_USER || 'noreply@varmi.com';
const SMTP_PASS = process.env.SMTP_PASS || process.env.MAIL_PASS || '';
const FROM_NAME = process.env.MAIL_FROM_NAME || process.env.MAIL_FROM || 'Varmı';
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL || process.env.MAIL_FROM || SMTP_USER;
const MAIL_API_KEY = process.env.MAIL_API_KEY || '';
const DEBUG_MAIL = process.env.DEBUG_MAIL === 'true';

function createTransport() {
  const configured = !!(SMTP_HOST && SMTP_HOST !== 'smtp.yourprovider.com' && SMTP_PASS);
  if (!configured) {
    // Dev fallback: gerçek SMTP ayarı yoksa gönderimi simüle et
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    logger: DEBUG_MAIL,
    debug: DEBUG_MAIL,
  });
}

app.get('/health', async (_req, res) => {
  try {
    const configured = !!(SMTP_HOST && SMTP_HOST !== 'smtp.yourprovider.com' && SMTP_PASS);
    if (!configured) {
      return res.json({ ok: true, configured: false });
    }
    const transporter = createTransport();
    await transporter.verify();
    res.json({ ok: true, configured: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
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
    const configured = !!(SMTP_HOST && SMTP_HOST !== 'smtp.yourprovider.com' && SMTP_PASS);
    const transporter = createTransport();
    const info = await transporter.sendMail({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });
    res.json({
      ok: true,
      id: (info as any).messageId || (info as any)?.envelope?.messageId || 'sent',
      configured,
      simulated: !configured,
    });
  } catch (e) {
    const configured = !!(SMTP_HOST && SMTP_HOST !== 'smtp.yourprovider.com' && SMTP_PASS);
    console.error('[mail:error]', { configured, host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, user: SMTP_USER, err: e });
    res.status(500).json({ ok: false, error: String(e), configured, host: SMTP_HOST });
  }
});

const PORT = Number(process.env.PORT || 8787);
app.listen(PORT, () => {
  console.log(`Mail server listening on http://localhost:${PORT}`);
});
