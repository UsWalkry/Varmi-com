<?php

/*
 * ROUNDCUBE 1.6.10 - VARMI.COM OPTIMAL CONFIG
 * Generated for clean installation
 */

$config = [];

/* ----------------------------------
 * GENERAL CONFIGURATION
 * ---------------------------------- */
$config['product_name'] = 'Varmi.com Mail';
$config['support_url'] = 'https://varmii.com/iletisim';

/* ----------------------------------
 * DATABASE SETUP
 * ---------------------------------- */
$config['db_dsnw'] = 'mysql://roundcube:Roundcube2025!@localhost/roundcubemail';
$config['db_prefix'] = '';

/* ----------------------------------
 * LOGGING & DEBUGGING
 * ---------------------------------- */
$config['log_driver'] = 'file';
$config['log_dir'] = '/var/www/roundcube/logs/';
$config['syslog_id'] = 'roundcube';
$config['syslog_facility'] = LOG_USER;
$config['log_logins'] = true;
$config['log_session'] = true;
$config['smtp_log'] = true;

// Debug mode - produciton'da false yap
$config['debug_level'] = 1;
$config['sql_debug'] = false;
$config['imap_debug'] = false;
$config['smtp_debug'] = true;

/* ----------------------------------
 * IMAP SETTINGS
 * ---------------------------------- */
$config['imap_host'] = 'localhost:143';
$config['username_domain'] = 'varmii.com';
$config['auto_create_user'] = true;

// Default folders
$config['drafts_mbox'] = 'Drafts';
$config['junk_mbox'] = 'Junk';
$config['sent_mbox'] = 'Sent';
$config['trash_mbox'] = 'Trash';

/* ----------------------------------
 * SMTP SETTINGS - KRİTİK!
 * ---------------------------------- */
// Sendmail binary kullan (socket kullanma)
$config['smtp_server'] = '';
$config['smtp_port'] = 25;
$config['smtp_user'] = '';
$config['smtp_pass'] = '';
$config['smtp_auth_type'] = '';

/* ----------------------------------
 * SECURITY
 * ---------------------------------- */
$config['des_key'] = 'Dab1LkZ9E3uT7txfjedo7QtC';
$config['cipher_method'] = 'AES-256-CBC';
$config['useragent'] = 'Roundcube Webmail'; // User-Agent string

// Session security
$config['ip_check'] = true;
$config['referer_check'] = true;
$config['x_frame_options'] = 'sameorigin';

/* ----------------------------------
 * SYSTEM
 * ---------------------------------- */
$config['temp_dir'] = '/var/www/roundcube/temp/';
$config['enable_installer'] = false; // Kurulumdan sonra kapat
$config['session_lifetime'] = 30; // minutes
$config['session_storage'] = 'db';

/* ----------------------------------
 * USER INTERFACE
 * ---------------------------------- */
$config['language'] = 'tr_TR';
$config['skin'] = 'elastic';
$config['mail_pagesize'] = 50;
$config['addressbook_pagesize'] = 50;
$config['prefer_html'] = true;
$config['htmleditor'] = 1; // 0=never, 1=always, 2=on reply to HTML, 3=on forward, 4=on reply/forward
$config['draft_autosave'] = 300; // seconds
$config['mdn_requests'] = 0; // 0=ask, 1=send, 2=ignore

// Spell checker
$config['enable_spellcheck'] = true;
$config['spellcheck_engine'] = 'googie';

/* ----------------------------------
 * PLUGINS - MINIMAL SET
 * ---------------------------------- */
$config['plugins'] = [
    'archive',
    'attachment_reminder',
    'emoticons',
    'filesystem_attachments',
    'hide_blockquote',
    'identicon',
    'jqueryui',
    'managesieve',
    'markasjunk',
    'newmail_notifier',
    'password',
    'vcard_attachments',
    'zipdownload',
];

/* ----------------------------------
 * MIME & ENCODING
 * ---------------------------------- */
$config['mime_param_folding'] = 0; // 0=RFC 2047/2231
$config['identities_level'] = 0; // 0=many identities with all params editable

/* ----------------------------------
 * PERFORMANCE
 * ---------------------------------- */
$config['enable_caching'] = true;
$config['messages_cache'] = 'db';
$config['imap_cache'] = 'db';

/* ----------------------------------
 * COMPOSE
 * ---------------------------------- */
$config['compose_responses_static'] = [];
$config['sig_below'] = false;
$config['sig_separator'] = "-- \n";
$config['show_images'] = 0; // 0=ask, 1=always, 2=never

?>
