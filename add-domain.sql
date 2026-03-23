INSERT INTO domain (domain, description, transport, created, modified) 
VALUES ('varmii.com', 'Varmi.com Mail Domain', 'virtual', NOW(), NOW()) 
ON DUPLICATE KEY UPDATE domain=domain;
