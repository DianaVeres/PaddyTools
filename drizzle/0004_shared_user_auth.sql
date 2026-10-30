ALTER TABLE `order_notes` ADD `author_email` text;
--> statement-breakpoint
ALTER TABLE `order_notes` ADD `author_name` text;
--> statement-breakpoint
CREATE TABLE `auth_users` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text,
	`active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_email` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_user` ON `auth_sessions` (`user_email`);
--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_expiry` ON `auth_sessions` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `auth_activation_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_email` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_auth_activation_user` ON `auth_activation_tokens` (`user_email`);
--> statement-breakpoint
CREATE INDEX `idx_auth_activation_expiry` ON `auth_activation_tokens` (`expires_at`);
--> statement-breakpoint
INSERT OR IGNORE INTO `auth_users` (`email`, `display_name`, `active`, `created_at`, `updated_at`) VALUES
	('administracion@paddy.es', 'Administración', false, unixepoch() * 1000, unixepoch() * 1000),
	('rociosaez@paddy.es', 'Rocío Sáez', false, unixepoch() * 1000, unixepoch() * 1000),
	('luzma.paddy@gmail.com', 'Luzma', false, unixepoch() * 1000, unixepoch() * 1000),
	('tienda@paddy.es', 'Tienda', false, unixepoch() * 1000, unixepoch() * 1000);
