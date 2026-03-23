-- Create dovecot MySQL user with password
CREATE USER IF NOT EXISTS 'dovecot'@'localhost' IDENTIFIED BY 'DovecotPass2025!';
GRANT SELECT ON varmi_db.virtual_users TO 'dovecot'@'localhost';
FLUSH PRIVILEGES;

-- Test
SELECT User, Host FROM mysql.user WHERE User='dovecot';
