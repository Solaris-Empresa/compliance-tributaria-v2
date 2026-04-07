ALTER TABLE `projects` ADD `solaris_skipped_ids` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `iagen_skipped_ids` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `solaris_skipped_all` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `projects` ADD `iagen_skipped_all` boolean DEFAULT false;