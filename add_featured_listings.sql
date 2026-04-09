ALTER TABLE listings
  ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER favorite_count;

ALTER TABLE listings
  ADD INDEX idx_is_featured (is_featured);
