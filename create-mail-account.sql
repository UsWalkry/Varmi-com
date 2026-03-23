INSERT INTO virtual_users (email, password) 
VALUES ('noreply@varmii.com', '{SHA512-CRYPT}$6$sQk9TuYn8J9KiEKd$Bs5dLQaNSDO78clEhg6Rj9UVX3Ajd1Jk/c0Mt9R3SDLtT7/484H/ftIvNj7K1p83DFNZEu6FvUQivpGJ6dEYQ.') 
ON DUPLICATE KEY UPDATE password=VALUES(password);

SELECT * FROM virtual_users;
