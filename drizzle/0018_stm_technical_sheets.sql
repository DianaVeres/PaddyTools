CREATE TABLE `stm_technical_sheets` (
  `id` text PRIMARY KEY NOT NULL,
  `season` text DEFAULT '' NOT NULL,
  `code` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `internal_description` text DEFAULT '' NOT NULL,
  `article_type` text DEFAULT '' NOT NULL,
  `sizes` text DEFAULT '' NOT NULL,
  `family_code` text DEFAULT '' NOT NULL,
  `family_description` text DEFAULT '' NOT NULL,
  `composition_code` text DEFAULT '' NOT NULL,
  `composition_description` text DEFAULT '' NOT NULL,
  `garment_type` text DEFAULT '' NOT NULL,
  `collection_code` text DEFAULT '' NOT NULL,
  `collection_description` text DEFAULT '' NOT NULL,
  `barcode_base` text DEFAULT '' NOT NULL,
  `supplier1_code` text DEFAULT '' NOT NULL,
  `supplier1_name` text DEFAULT '' NOT NULL,
  `supplier1_reference` text DEFAULT '' NOT NULL,
  `supplier2_code` text DEFAULT '' NOT NULL,
  `supplier2_name` text DEFAULT '' NOT NULL,
  `supplier2_reference` text DEFAULT '' NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `images_json` text DEFAULT '[]' NOT NULL,
  `wash_symbols` text DEFAULT '' NOT NULL,
  `raw_json` text NOT NULL,
  `source_file` text DEFAULT '' NOT NULL,
  `source_modified_at` integer NOT NULL,
  `imported_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_stm_technical_code` ON `stm_technical_sheets` (`code`);
--> statement-breakpoint
CREATE INDEX `idx_stm_technical_description` ON `stm_technical_sheets` (`description`);
--> statement-breakpoint
CREATE INDEX `idx_stm_technical_family` ON `stm_technical_sheets` (`family_code`);
--> statement-breakpoint
CREATE INDEX `idx_stm_technical_collection` ON `stm_technical_sheets` (`collection_code`);
--> statement-breakpoint
CREATE TABLE `stm_technical_sheet_colors` (
  `id` text PRIMARY KEY NOT NULL,
  `technical_sheet_id` text NOT NULL,
  `position` integer NOT NULL,
  `color_code` text DEFAULT '' NOT NULL,
  `color_description` text DEFAULT '' NOT NULL,
  `impact_type` text DEFAULT '' NOT NULL,
  `application_type` text DEFAULT '' NOT NULL,
  `rate` text DEFAULT '' NOT NULL,
  FOREIGN KEY (`technical_sheet_id`) REFERENCES `stm_technical_sheets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_stm_technical_colors_sheet` ON `stm_technical_sheet_colors` (`technical_sheet_id`);
--> statement-breakpoint
CREATE INDEX `idx_stm_technical_colors_code` ON `stm_technical_sheet_colors` (`color_code`);
