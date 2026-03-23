import nodemailer from 'nodemailer';

async function testMercuryMail() {
    console.log('🧪 Testing Mercury Mail SMTP...');
    
    // Mercury Mail transporter
    const transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 25,
        secure: false,
        ignoreTLS: true,
        requireTLS: false,
        debug: true,
        logger: true
    });
    
    try {
        // Test connection
        console.log('🔌 Testing SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified!');
        
        // Send test email
        console.log('📧 Sending test email...');
        const info = await transporter.sendMail({
            from: 'noreply@localhost',
            to: 'dijitallkitap@gmail.com',
            subject: 'Varmii Test Email - Mercury Mail',
            text: 'This is a test email from Mercury Mail on Windows.',
            html: '<h1>Test Email</h1><p>Mercury Mail is working!</p>'
        });
        
        console.log('✅ Email sent successfully!');
        console.log('📊 Message ID:', info.messageId);
        console.log('📊 Response:', info.response);
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        console.error('💥 Error details:', error);
    }
    
    process.exit(0);
}

testMercuryMail();