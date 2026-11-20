ALTER TABLE `order_preparation_completions` ADD `customer_email` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `order_preparation_completions` ADD `customer_phone` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `order_preparation_completions` ADD `carrier` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `order_preparation_completions` ADD `tracking_number` text NOT NULL DEFAULT '';
