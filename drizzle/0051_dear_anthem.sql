ALTER TABLE `consistency_checks` ADD `medium_acknowledged` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `consistency_checks` ADD `medium_acknowledged_at` bigint;--> statement-breakpoint
ALTER TABLE `consistency_checks` ADD `medium_acknowledged_by` varchar(255);