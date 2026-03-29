CREATE TABLE `project_status_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`changed_by` varchar(255) NOT NULL,
	`reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_status_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `project_status_log` ADD CONSTRAINT `project_status_log_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_project_status_log_project_id` ON `project_status_log` (`project_id`);