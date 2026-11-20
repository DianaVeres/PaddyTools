CREATE TABLE `order_preparation_completions` (
  `order_id` integer PRIMARY KEY NOT NULL,
  `order_number` text NOT NULL,
  `customer_name` text NOT NULL DEFAULT '',
  `units` integer NOT NULL DEFAULT 0,
  `products` integer NOT NULL DEFAULT 0,
  `completed_by_email` text NOT NULL,
  `completed_by_name` text NOT NULL,
  `completion_date` text NOT NULL,
  `completed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_order_preparation_completion_date` ON `order_preparation_completions` (`completion_date`, `completed_at`);

