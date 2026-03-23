const nodemailer = require('nodemailer');
// Test 1: mail.varmii.com:587
const t = nodemailer.createTransport({ 
  host: 'mail.varmii.com', 
  port: 587, 
  secure: false, 
  auth: { user: 'noreply@varmii.com', pass: 'Brkaydn426859..' },
  tls: { rejectUnauthorized: false }
});
t.verify()
  .then(() => { 
    console.log('SMTP OK - mail.varmii.com:587'); 
    return t.sendMail({ from: 'noreply@varmii.com', to: 'noreply@varmii.com', subject: 'Varmii Test', text: 'Test OK' }); 
  })
  .then(r => console.log('MAIL GITTI:', r.messageId))
  .catch(e => console.log('HATA mail.varmii.com:587:', e.message));
