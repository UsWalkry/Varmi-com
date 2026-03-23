<?php
$to = 'bybrkaydn@gmail.com';
$subject = 'PHP Mail Test - Roundcube www-data';
$message = 'Bu mail PHP mail() fonksiyonu ile www-data kullanıcısı tarafından gönderildi.';
$headers = 'From: noreply@varmii.com' . "\r\n" .
    'Reply-To: noreply@varmii.com' . "\r\n" .
    'X-Mailer: PHP/' . phpversion();

if (mail($to, $subject, $message, $headers)) {
    echo "✅ Mail başarıyla gönderildi\n";
} else {
    echo "❌ Mail gönderilemedi\n";
}
?>
