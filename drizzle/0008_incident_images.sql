CREATE TABLE `incident_images` (
  `id` text PRIMARY KEY NOT NULL,
  `incident_id` text NOT NULL,
  `name` text NOT NULL,
  `mime_type` text NOT NULL,
  `size` integer NOT NULL,
  `uploaded_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_incident_images_incident` ON `incident_images` (`incident_id`);
--> statement-breakpoint
CREATE TABLE `incident_image_chunks` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `image_id` text NOT NULL,
  `chunk_index` integer NOT NULL,
  `data` blob NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_incident_image_chunks_image` ON `incident_image_chunks` (`image_id`, `chunk_index`);
