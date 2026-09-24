CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity_type` text DEFAULT 'packing_list' NOT NULL,
	`entity_id` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activity_created_at` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_entity` ON `activity_logs` (`entity_type`,`entity_id`);