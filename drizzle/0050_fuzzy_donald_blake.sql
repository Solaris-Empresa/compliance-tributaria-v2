CREATE TABLE `cpie_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`min_score_to_advance` int NOT NULL DEFAULT 30,
	`batch_size_limit` int NOT NULL DEFAULT 50,
	`gate_enabled` tinyint NOT NULL DEFAULT 1,
	`monthly_report_day` int NOT NULL DEFAULT 1,
	`last_monthly_report_at` bigint,
	`last_job_log` text,
	`updated_at` bigint,
	`updated_by_id` int,
	CONSTRAINT `cpie_settings_id` PRIMARY KEY(`id`)
);
