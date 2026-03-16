ALTER TABLE `projects` ADD `description` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `confirmedCnaes` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `currentStep` int DEFAULT 1 NOT NULL;