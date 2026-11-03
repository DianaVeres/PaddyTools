CREATE TABLE `quality_errors` (
  `id` text PRIMARY KEY NOT NULL,
  `error_date` text NOT NULL,
  `process` text NOT NULL,
  `responsible_email` text NOT NULL,
  `responsible_name` text NOT NULL,
  `reporter_email` text NOT NULL,
  `reporter_name` text NOT NULL,
  `severity` text DEFAULT 'media' NOT NULL,
  `error_type` text NOT NULL,
  `reference` text DEFAULT '' NOT NULL,
  `description` text NOT NULL,
  `affected_units` integer DEFAULT 1 NOT NULL,
  `correction_minutes` integer DEFAULT 0 NOT NULL,
  `recurrence` integer DEFAULT 0 NOT NULL,
  `resolved` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_quality_error_date` ON `quality_errors` (`error_date`);
--> statement-breakpoint
CREATE INDEX `idx_quality_process_date` ON `quality_errors` (`process`,`error_date`);
--> statement-breakpoint
CREATE INDEX `idx_quality_worker_date` ON `quality_errors` (`responsible_email`,`error_date`);
