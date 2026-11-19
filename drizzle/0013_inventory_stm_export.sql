ALTER TABLE `inventory_sessions` ADD `stm_exported_at` integer;
ALTER TABLE `inventory_sessions` ADD `stm_exported_by_email` text NOT NULL DEFAULT '';
ALTER TABLE `inventory_sessions` ADD `stm_exported_by_name` text NOT NULL DEFAULT '';
