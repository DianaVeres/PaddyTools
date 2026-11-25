CREATE TABLE `stm_technical_sheet_sections` (
  `id` text PRIMARY KEY NOT NULL,
  `technical_sheet_id` text NOT NULL,
  `section` text NOT NULL,
  `source_table` text NOT NULL,
  `row_index` integer NOT NULL,
  `data_json` text NOT NULL,
  `imported_at` integer NOT NULL,
  FOREIGN KEY (`technical_sheet_id`) REFERENCES `stm_technical_sheets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_stm_sections_sheet` ON `stm_technical_sheet_sections` (`technical_sheet_id`, `section`);
--> statement-breakpoint
CREATE INDEX `idx_stm_sections_source` ON `stm_technical_sheet_sections` (`source_table`);
