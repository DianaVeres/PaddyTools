CREATE TABLE `kpi_work_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `work_date` text NOT NULL,
  `worker_email` text NOT NULL,
  `worker_name` text NOT NULL,
  `activity` text NOT NULL,
  `started_at` text NOT NULL,
  `ended_at` text NOT NULL,
  `minutes` integer NOT NULL,
  `orders` integer DEFAULT 0 NOT NULL,
  `products` integer DEFAULT 0 NOT NULL,
  `packing_lists` integer DEFAULT 0 NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_kpi_work_date` ON `kpi_work_logs` (`work_date`);
--> statement-breakpoint
CREATE INDEX `idx_kpi_work_worker` ON `kpi_work_logs` (`worker_email`,`work_date`);
--> statement-breakpoint
CREATE INDEX `idx_kpi_work_activity` ON `kpi_work_logs` (`activity`,`work_date`);
