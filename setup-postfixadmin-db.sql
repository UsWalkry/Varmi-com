-- Create PostfixAdmin database user
CREATE USER IF NOT EXISTS 'postfixadmin'@'localhost' IDENTIFIED BY 'PostfixAdmin2025!';
GRANT ALL PRIVILEGES ON varmi_db.* TO 'postfixadmin'@'localhost';
FLUSH PRIVILEGES;

-- Test
SELECT User, Host FROM mysql.user WHERE User='postfixadmin';
