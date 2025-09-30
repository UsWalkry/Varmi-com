import { toast } from '@/lib/sonner';
import { sendMailViaServer } from '@/lib/serverMail';

interface ViteEnv {
  VITE_MAIL_API_BASE?: string;
  DEV?: boolean;
}
const ENV: ViteEnv = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env: ViteEnv }).env) || {};
const IS_DEV = !!ENV.DEV;

function appOrigin(): string {
  try {
    return window.location.origin;
  } catch {
    return 'https://varmi.app';
  }
}

async function sendMail(params: {
  toName: string;
  toEmail: string;
  subject: string;
  message: string;
  actionUrl?: string;
}) {
  const { toName, toEmail, subject, message, actionUrl } = params;
  try {
    await sendMailViaServer({
      to: toEmail,
      subject,
      text: [
        `Merhaba ${toName},`,
        '',
        message,
        '',
        `Aksiyon: ${actionUrl || appOrigin()}`,
        '',
        '— Varmı',
      ].join('\n'),
      html: `<p>Merhaba ${toName},</p><p>${message.replace(/\n/g, '<br/>')}</p><p><a href="${actionUrl || appOrigin()}" target="_blank" rel="noopener">Devam et</a></p><p>— Varmı</p>`,
    });
    if (IS_DEV) toast.success('E-posta gönderildi');
  } catch (e) {
    console.warn('E-posta gönderimi hata verdi:', e);
    if (IS_DEV) toast.error('E-posta gönderilemedi: ' + String(e));
  }
}

export const Mailer = {
  async sendWelcome(user: { name: string; email: string }) {
    const subject = `Varmı’ya hoş geldiniz, ${user.name}!`;
    const message = [
      '',
      'Varmı hesabınız başarıyla oluşturuldu. Artık aradığınız ürün/hizmet için ilan açabilir ve gelen teklifleri kolayca yönetebilirsiniz.',
      '',
      'Başlangıç için ipuçları:',
      '• Net bir başlık ve açıklama yazın',
      '• Bütçe üst sınırını belirleyin',
      '• En az 1 görsel ekleyin',
      '',
      'Keyifli alışverişler!',
    ].join('\n');
    await sendMail({ toName: user.name, toEmail: user.email, subject, message, actionUrl: `${appOrigin()}/dashboard` });
  },

  async sendListingCreated(user: { name: string; email: string }, listing: { id: string; title: string; category: string; city: string; budgetMax: number }) {
    const subject = `İlanın yayında: ${listing.title}`;
    const message = [
      `Merhaba ${user.name},`,
      '',
      'İlanın başarıyla yayınlandı. Kısa süre içinde satıcılardan teklifler gelebilir.',
      '',
      `• Başlık: ${listing.title}`,
      `• Kategori: ${listing.category} | Şehir: ${listing.city}`,
      `• Bütçe Üst Sınırı: ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(listing.budgetMax)}`,
      '',
      'Gelen teklifleri Liste Detayı sayfasından takip edebilirsin.',
    ].join('\n');
    await sendMail({ toName: user.name, toEmail: user.email, subject, message, actionUrl: `${appOrigin()}/listing/${listing.id}` });
  },

  async sendOfferReceived(owner: { name: string; email: string }, listing: { id: string; title: string }, offer: { sellerName: string; price: number; deliveryType?: string }) {
    const subject = `Yeni teklif var: ${listing.title}`;
    const deliveryText = offer.deliveryType === 'shipping' ? 'Kargo' : offer.deliveryType === 'pickup' ? 'Elden Teslim' : '—';
    const message = [
      `Merhaba ${owner.name},`,
      '',
      'İlanına yeni bir teklif geldi:',
      `• Satıcı: ${offer.sellerName}`,
      `• Fiyat: ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(offer.price)}`,
      `• Teslimat: ${deliveryText}`,
      '',
      'Detayları görmek ve aksiyon almak için ilana git.',
    ].join('\n');
    await sendMail({ toName: owner.name, toEmail: owner.email, subject, message, actionUrl: `${appOrigin()}/listing/${listing.id}` });
  },

  async sendOfferPurchased(seller: { name: string; email: string }, listing: { id: string; title: string }, payload: { price: number; quantity?: number; buyerName?: string }) {
    const subject = `Teklifinden satın alma yapıldı: ${listing.title}`;
    const qty = Math.max(1, Number(payload.quantity ?? 1));
    const message = [
      `Merhaba ${seller.name},`,
      '',
      'Teklifinden üçüncü bir kullanıcı tarafından satın alma yapıldı.',
      `• Adet: ${qty}`,
      `• Birim Fiyat: ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(payload.price)}`,
      payload.buyerName ? `• Alıcı: ${payload.buyerName}` : '',
      '',
      'Siparişi hazırlamak için teklif detaylarına göz atabilirsin.',
    ].filter(Boolean).join('\n');
    await sendMail({ toName: seller.name, toEmail: seller.email, subject, message, actionUrl: `${appOrigin()}/listing/${listing.id}` });
  },

  async sendNewMessage(recipient: { name: string; email: string }, sender: { name: string }, listing: { id: string; title: string }, content: string) {
    const subject = `Yeni mesajın var - ${sender.name}`;
    const snippet = content.length > 140 ? content.slice(0, 137) + '…' : content;
    const message = [
      `Merhaba ${recipient.name},`,
      '',
      `${sender.name} sana bir mesaj gönderdi:`,
      '',
      `“${snippet}”`,
      '',
      'Yanıtlamak için ilana/mesajlara gidebilirsin.',
    ].join('\n');
    await sendMail({ toName: recipient.name, toEmail: recipient.email, subject, message, actionUrl: `${appOrigin()}/listing/${listing.id}` });
  },
};
