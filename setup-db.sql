CREATE DATABASE IF NOT EXISTS varmi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'varmi_user'@'localhost' IDENTIFIED BY 'Varmi2026!';
GRANT ALL PRIVILEGES ON varmi_db.* TO 'varmi_user'@'localhost';
FLUSH PRIVILEGES;
