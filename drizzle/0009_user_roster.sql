DELETE FROM `auth_sessions`
WHERE lower(`user_email`) = 'luzma.paddy@gmail.com';
--> statement-breakpoint
DELETE FROM `auth_activation_tokens`
WHERE lower(`user_email`) = 'luzma.paddy@gmail.com';
--> statement-breakpoint
DELETE FROM `auth_users`
WHERE lower(`email`) = 'luzma.paddy@gmail.com';
--> statement-breakpoint
INSERT OR IGNORE INTO `auth_users`
  (`email`, `display_name`, `active`, `created_at`, `updated_at`)
VALUES
  ('eliafuentes@paddy.es', 'Elia', false, unixepoch() * 1000, unixepoch() * 1000),
  ('lorenaverdu@paddy.es', 'Lorena', false, unixepoch() * 1000, unixepoch() * 1000);
