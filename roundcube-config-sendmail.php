<?php
// Database
$config['db_dsnw'] = 'mysql://roundcube:Roundcube2025!@localhost/roundcubemail';

// IMAP
$config['default_host'] = 'localhost';
$config['default_port'] = 143;
$config['imap_auth_type'] = null;

// SMTP - USE SENDMAIL INSTEAD OF SMTP!
$config['smtp_server'] = '';
$config['smtp_port'] = null;
$config['smtp_user'] = '';
$config['smtp_pass'] = '';

// Use Postfix sendmail binary directly
$config['sendmail_path'] = '/usr/sbin/sendmail -t -i';
$config['smtp_log'] = true;

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
$config['log_dir'] = '/var/www/roundcube/logs/';
$config['log_file'] = 'errors.log';
