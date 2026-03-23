import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 25,
  secure: false,
  tls: {
    rejectUnauthorized: false
  }
});

async function testEmail() {
  try {
    console.log('📧 Sending test email via hMailServer...');
    
    const info = await transporter.sendMail({
      from: '"Varmii.com" <noreply@varmii.com>',
      to: 'awasdz95@gmail.com',
      subject: 'Test Email from hMailServer',
      html: '<h1>Success!</h1><p>hMailServer is working correctly! 🎉</p>'
    });

    console.log('✅ Email sent successfully!');
    console.log('📨 Message ID:', info.messageId);
    console.log('📬 Response:', info.response);
    console.log('✉️  Accepted:', info.accepted);
    console.log('❌ Rejected:', info.rejected);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

testEmail();
