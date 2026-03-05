export const returnRequestTemplate = (
  sellerName: string,
  buyerName: string,
  orderId: string,
  returnReason: string,
  listingTitle: string,
  hasImages: boolean
) => {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>İade Talebi Geldi</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                    İade Talebi Geldi
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #111827; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Merhaba ${sellerName},
                  </p>
                  
                  <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                    <strong>${buyerName}</strong> tarafından <strong>${orderId}</strong> numaralı sipariş için iade talebi oluşturuldu.
                  </p>
                  
                  <!-- Product Info -->
                  <div style="background-color: #fffbeb; border: 1px solid #fde047; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                    <p style="margin: 0 0 8px 0; color: #78350f; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Ürün
                    </p>
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                      ${listingTitle}
                    </p>
                  </div>
                  
                  <!-- Return Reason -->
                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0 0 8px 0; color: #7f1d1d; font-size: 13px; font-weight: 600;">
                      İade Sebebi:
                    </p>
                    <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
                      ${returnReason}
                    </p>
                  </div>
                  
                  ${hasImages ? `
                    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
                      <p style="margin: 0; color: #1e40af; font-size: 13px;">
                        📸 Alıcı iade talebine fotoğraf eklemiştir. Detayları görmek için siparişler sayfasını ziyaret edin.
                      </p>
                    </div>
                  ` : ''}
                  
                  <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 12px;">
                    Lütfen iade talebini inceleyin ve gerekli işlemleri yapın. İade talebini kabul ederseniz, alıcı ürünü size iade edecektir.
                  </p>
                  
                  <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
                      <strong>Sipariş No:</strong> ${orderId}
                    </p>
                    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
                      <strong>Alıcı:</strong> ${buyerName}
                    </p>
                    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
                      <strong>Talep Tarihi:</strong> ${new Date().toLocaleString('tr-TR', {
                        dateStyle: 'long',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders" 
                       style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                      İade Talebini İncele
                    </a>
                  </div>
                  
                  <!-- Help Text -->
                  <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px; margin-top: 30px;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                      💡 <strong>Hatırlatma:</strong> İade taleplerini en kısa sürede cevaplamanız, müşteri memnuniyeti için önemlidir. İade politikanız çerçevesinde değerlendirme yapabilirsiniz.
                    </p>
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
