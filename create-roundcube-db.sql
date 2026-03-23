-- Create Roundcube database
CREATE DATABASE IF NOT EXISTS roundcubemail CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- Update user permissions
REVOKE ALL PRIVILEGES ON varmi_db.* FROM 'roundcube'@'localhost';
GRANT ALL PRIVILEGES ON roundcubemail.* TO 'roundcube'@'localhost';
FLUSH PRIVILEGES;

-- Show databases
SHOW DATABASES;
