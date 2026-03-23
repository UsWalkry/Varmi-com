-- Create Roundcube database user
CREATE USER IF NOT EXISTS 'roundcube'@'localhost' IDENTIFIED BY 'Roundcube2025!';
GRANT ALL PRIVILEGES ON varmi_db.* TO 'roundcube'@'localhost';
FLUSH PRIVILEGES;

-- Test
SELECT User, Host FROM mysql.user WHERE User='roundcube';
