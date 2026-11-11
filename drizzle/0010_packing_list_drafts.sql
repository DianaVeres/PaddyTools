CREATE TABLE `packing_list_drafts` (
  `id` text PRIMARY KEY NOT NULL,
  `school` text DEFAULT '' NOT NULL,
  `shipping_date` text NOT NULL,
  `order_year` integer NOT NULL,
  `order_month` integer NOT NULL,
  `boxes` text NOT NULL,
  `created_by_email` text NOT NULL,
  `created_by_name` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_packing_drafts_updated_at` ON `packing_list_drafts` (`updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_packing_drafts_school` ON `packing_list_drafts` (`school`);

