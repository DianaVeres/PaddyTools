CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`reference` text NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text,
	`subject` text NOT NULL,
	`details` text,
	`status` text DEFAULT 'abierto' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_records_reference` ON `records` (`reference`);--> statement-breakpoint
CREATE INDEX `idx_records_type_status` ON `records` (`type`,`status`);--> statement-breakpoint
PRAGMA optimize;
