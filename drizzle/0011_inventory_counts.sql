CREATE TABLE `inventory_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `warehouse` text NOT NULL,
  `season` text DEFAULT '' NOT NULL,
  `count_date` text NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `created_by_email` text NOT NULL,
  `created_by_name` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `closed_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_sessions_date` ON `inventory_sessions` (`count_date`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_inventory_sessions_status` ON `inventory_sessions` (`status`,`updated_at`);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL,
  `barcode` text NOT NULL,
  `quantity` integer DEFAULT 1 NOT NULL,
  `first_scanned_at` integer NOT NULL,
  `last_scanned_at` integer NOT NULL,
  FOREIGN KEY (`session_id`) REFERENCES `inventory_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_items_session` ON `inventory_items` (`session_id`);
--> statement-breakpoint
CREATE INDEX `idx_inventory_items_barcode` ON `inventory_items` (`session_id`,`barcode`);
