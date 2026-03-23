<?php
// Database
$config['db_dsnw'] = 'mysql://roundcube:Roundcube2025!@localhost/roundcubemail';

// IMAP/SMTP
$config['default_host'] = 'localhost';
$config['default_port'] = 143;
$config['imap_auth_type'] = null;
$config['smtp_server'] = '127.0.0.1';
$config['smtp_port'] = 25;
$config['smtp_user'] = '';
$config['smtp_pass'] = '';
$config['smtp_auth_type'] = null;
$config['smtp_conn_options'] = array(
    'ssl' => array(
        'verify_peer' => false,
        'verify_peer_name' => false,
    ),
);
$config['smtp_helo_host'] = 'varmii.com';

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

// Debug
$config['smtp_debug'] = true;
$config['log_driver'] = 'file';
