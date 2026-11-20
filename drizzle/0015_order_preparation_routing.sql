ALTER TABLE `order_preparation_completions` ADD `shipping_method` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `order_preparation_completions` ADD `has_reservation` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `order_preparation_completions` ADD `treatment` text NOT NULL DEFAULT 'manual-review';
--> statement-breakpoint
ALTER TABLE `order_preparation_completions` ADD `woo_status` text NOT NULL DEFAULT '';
