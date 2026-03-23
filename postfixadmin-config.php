<?php
$CONF['configured'] = true;

// Database
$CONF['database_type'] = 'mysqli';
$CONF['database_host'] = 'localhost';
$CONF['database_user'] = 'postfixadmin';
$CONF['database_password'] = 'PostfixAdmin2025!';
$CONF['database_name'] = 'varmi_db';

// Site Admin
$CONF['setup_password'] = 'changeme';  // Will be updated via setup.php

// Default Language
$CONF['default_language'] = 'en';

// Domain settings
$CONF['domain_path'] = 'YES';
$CONF['domain_in_mailbox'] = 'YES';

// Dovecot integration
$CONF['dovecotpw'] = "/usr/bin/doveadm pw -r 5";

// Mailbox settings
$CONF['quota'] = 'YES';
$CONF['quota_multiplier'] = '1024000';

// Password settings
$CONF['encrypt'] = 'dovecot:SHA512-CRYPT';

// Email settings
$CONF['admin_email'] = 'noreply@varmii.com';
$CONF['smtp_server'] = 'localhost';
$CONF['smtp_port'] = '25';

// Virtual Users Table (match our existing table)
$CONF['emailcheck_resolve_domain'] = 'NO';

// Aliases
$CONF['aliases'] = '0';
$CONF['mailboxes'] = '0';
$CONF['maxquota'] = '0';

// Footer
$CONF['footer_text'] = 'Return to varmii.com';
$CONF['footer_link'] = 'https://varmii.com';
