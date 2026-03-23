<?php
require_once(__DIR__ . '/../config.inc.php');
require_once(__DIR__ . '/../config.local.php');

echo "smtp_server: " . $CONF['smtp_server'] . "\n";
echo "smtp_port: " . $CONF['smtp_port'] . "\n";
echo "smtp_port type: " . gettype($CONF['smtp_port']) . "\n";
echo "smtp_port === 25: " . ($CONF['smtp_port'] === 25 ? 'true' : 'false') . "\n";
echo "smtp_port == '25': " . ($CONF['smtp_port'] == '25' ? 'true' : 'false') . "\n";
?>
