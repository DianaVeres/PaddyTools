CREATE TABLE `incident_cache` (
	`scope` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL
);
