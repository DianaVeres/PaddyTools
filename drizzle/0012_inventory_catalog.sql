CREATE TABLE `inventory_catalog` (
  `code` text PRIMARY KEY NOT NULL,
  `article` text NOT NULL,
  `description` text NOT NULL,
  `color` text DEFAULT '' NOT NULL,
  `color_description` text DEFAULT '' NOT NULL,
  `size` text DEFAULT '' NOT NULL,
  `source_code` text DEFAULT '' NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_catalog_article` ON `inventory_catalog` (`article`);
