INSERT OR IGNORE INTO auth_users (email, display_name, active, created_at, updated_at)
VALUES
  ('martatortajada@paddy.es', 'Marta Tortajada', 0, unixepoch() * 1000, unixepoch() * 1000),
  ('lucilebalanzat@paddy.es', 'Lucile Balanzat', 0, unixepoch() * 1000, unixepoch() * 1000),
  ('ricardo@paddy.es', 'Ricardo', 0, unixepoch() * 1000, unixepoch() * 1000);
