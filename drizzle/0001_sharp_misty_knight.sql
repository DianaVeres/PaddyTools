CREATE TABLE `store_tickets` (
	`ticket_number` text PRIMARY KEY NOT NULL,
	`date` text,
	`customer` text,
	`store` text,
	`operator` text,
	`total` text,
	`payment` text,
	`items_json` text DEFAULT '[]' NOT NULL,
	`raw_json` text NOT NULL,
	`synced_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_store_tickets_date` ON `store_tickets` (`date`);