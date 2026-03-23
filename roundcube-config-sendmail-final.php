<?php
// Database
$config['db_dsnw'] = 'mysql://roundcube:Roundcube2025!@localhost/roundcubemail';

// IMAP
$config['default_host'] = 'localhost';
$config['default_port'] = 143;
$config['imap_auth_type'] = null;

// SMTP - Commented out to use PHP mail() / sendmail
// $config['smtp_server'] = '';

// Security
$config['des_key'] = 'e8248deb923c70e97e12dec360c3d5a707ced035a37f67bd';
$config['enable_installer'] = false;

// Product name
$config['product_name'] = 'Varmii Webmail';

// Plugins
$config['plugins'] = array('archive', 'zipdownload');

// User settings
$config['language'] = 'tr_TR';
$config['create_default_folders'] = true;

// Misc
$config['support_url'] = 'https://varmii.com';
$config['username_domain'] = 'varmii.com';
