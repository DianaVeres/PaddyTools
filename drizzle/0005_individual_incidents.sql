CREATE TABLE `incident_records` (
  `id` text PRIMARY KEY NOT NULL,
  `order_number` text NOT NULL,
  `source_type` text DEFAULT 'order' NOT NULL,
  `incident_date` text,
  `updated_at` text NOT NULL,
  `pickup_school` integer DEFAULT false NOT NULL,
  `raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_incident_records_order` ON `incident_records` (`order_number`);
--> statement-breakpoint
CREATE INDEX `idx_incident_records_updated` ON `incident_records` (`updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_incident_records_source` ON `incident_records` (`source_type`);
--> statement-breakpoint
CREATE INDEX `idx_incident_records_pickup` ON `incident_records` (`pickup_school`);
--> statement-breakpoint
INSERT INTO `incident_records` (`id`, `order_number`, `source_type`, `incident_date`, `updated_at`, `pickup_school`, `raw_json`)
SELECT
  'MIG-' || lower(hex(randomblob(16))),
  coalesce(json_extract(entry.value, '$.order_number'), ''),
  coalesce(nullif(json_extract(entry.value, '$.source_type'), ''), 'order'),
  coalesce(json_extract(entry.value, '$.incident_date'), json_extract(entry.value, '$.created_at'), ''),
  coalesce(json_extract(entry.value, '$.updated_at'), json_extract(entry.value, '$.created_at'), datetime('now')),
  coalesce(json_extract(entry.value, '$.pickup_school'), 0),
  entry.value
FROM `incident_cache`, json_each(`incident_cache`.`payload`) AS entry
WHERE `incident_cache`.`scope` = 'all' AND json_valid(entry.value);
