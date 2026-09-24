CREATE TABLE `packing_list_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`packing_list_id` text NOT NULL,
	`order_number` text NOT NULL,
	`customer_name` text NOT NULL,
	`order_type` text DEFAULT 'ON-LINE' NOT NULL,
	`order_date` text NOT NULL,
	`shipping_date` text NOT NULL,
	`phone` text,
	`box` text NOT NULL,
	`school_mismatch` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`packing_list_id`) REFERENCES `packing_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_packing_orders_list` ON `packing_list_orders` (`packing_list_id`);--> statement-breakpoint
CREATE INDEX `idx_packing_orders_number` ON `packing_list_orders` (`order_number`);--> statement-breakpoint
CREATE TABLE `packing_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`school` text NOT NULL,
	`shipping_date` text NOT NULL,
	`order_year` integer NOT NULL,
	`order_month` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_packing_lists_school_date` ON `packing_lists` (`school`,`shipping_date`);--> statement-breakpoint
CREATE INDEX `idx_packing_lists_created_at` ON `packing_lists` (`created_at`);