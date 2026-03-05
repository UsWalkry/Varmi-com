export const orderCancelledTemplate = (
  recipientName: string,
  orderId: string,
  cancelReason: string,
  isBuyer: boolean,
  userType: 'buyer' | 'seller'
) => {
  const title = isBuyer 
    ? 'Siparişiniz İptal Edildi' 
    : 'Sipariş İptal Edildi';
  
  const greeting = `Merhaba ${recipientName},`;
  
  const mainMessage = isBuyer
    ? `<strong>${orderId}</strong> numaralı siparişiniz iptal edilmiştir.`
    : `<strong>${orderId}</strong> numaralı sipariş alıcı tarafından iptal edilmiştir.`;
  
  const reasonSection = cancelReason 
    ? `
      <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">
          <strong>İptal Sebebi:</strong><br>
          ${cancelReason}
        </p>
      </div>
    `
    : '';
  
  const nextSteps = isBuyer
    ? `
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 12px;">
        Ödeme yaptıysanız, iade işleminiz başlatılacaktır. İade süreci hakkında ayrı bir bilgilendirme yapılacaktır.
      </p>
    `
    : `
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 12px;">
        Bu sipariş için herhangi bir işlem yapmanıza gerek yoktur. Bilginize sunulmuştur.
      </p>
    `;

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                    ${title}
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #111827; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    ${greeting}
                  </p>
                  
                  <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                    ${mainMessage}
                  </p>
                  
                  ${reasonSection}
                  
                  ${nextSteps}
                  
                  <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
                      <strong>Sipariş No:</strong> ${orderId}
                    </p>
                    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
                      <strong>İptal Tarihi:</strong> ${new Date().toLocaleString('tr-TR', {
                        dateStyle: 'long',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders" 
                       style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                      Siparişlerime Git
                    </a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0 0 10px 0;">
                    Bu e-posta otomatik olarak gönderilmiştir.
                  </p>
                  <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
                    © ${new Date().getFullYear()} Varmi.com - Tüm hakları saklıdır.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
