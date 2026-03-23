<?php
$fp = @fsockopen("127.0.0.1", 25, $errno, $errstr, 5);
if ($fp) {
    echo "✅ PHP can connect to SMTP port 25\n";
    fclose($fp);
} else {
    echo "❌ PHP cannot connect: $errstr ($errno)\n";
}
