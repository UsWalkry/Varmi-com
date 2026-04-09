new_func = """

export async function sendPasswordResetEmail(email: string, resetUrl: string, name?: string) {
    const startTime = Date.now();
    console.log('Sending password reset email to:', email);

    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@varmii.com',
            to: email,
            subject: 'Varmii - Sifre Sifirlama',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #9333ea; margin: 0; font-size: 28px;">Varmii</h1>
                        </div>
                        <h2 style="color: #333; text-align: center; margin-bottom: 20px; font-size: 22px;">Sifre Sifirlama</h2>
                        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 10px;">
                            Merhaba${name ? ' ' + name : ''},
                        </p>
                        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                            Varmii hesabiniz icin sifre sifirlama talebinde bulundunuz. Asagidaki butona tiklayarak yeni bir sifre olusturabilirsiniz:
                        </p>
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${resetUrl}"
                               style="background: linear-gradient(135deg, #9333ea 0%, #6366f1 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(147,51,234,0.3);">
                                Sifremi Sifirla
                            </a>
                        </div>
                        <p style="color: #999; font-size: 13px; text-align: center; margin-top: 25px;">
                            Bu link <strong>1 saat</strong> gecerlidir.
                        </p>
                        <p style="color: #999; font-size: 13px; text-align: center;">
                            Eger bu talebi siz yapmadiyseniz bu e-postayi gormezden gelebilirsiniz.
                        </p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                        <p style="color: #ccc; font-size: 11px; text-align: center;">&copy; 2024 Varmii.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        const duration = Date.now() - startTime;
        console.log('Password reset email sent in', duration, 'ms, id:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('Password reset email failed after', duration, 'ms:', error);
        throw error;
    }
}
"""

with open(r'C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\server\src\services\emailService.ts', 'a', encoding='utf-8') as f:
    f.write(new_func)
print('Done - emailService.ts updated')
