CREATE TABLE `order_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`kind` text DEFAULT 'nota' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_order_notes_number_date` ON `order_notes` (`order_number`,`created_at`);