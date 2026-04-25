CREATE TABLE `m1_runner_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`user_id` int NOT NULL,
	`user_role` varchar(32) NOT NULL,
	`status_arquetipo` varchar(32) NOT NULL,
	`test_status` varchar(16) NOT NULL,
	`fallback_count` int NOT NULL DEFAULT 0,
	`hard_block_count` int NOT NULL DEFAULT 0,
	`lc_conflict_count` int NOT NULL DEFAULT 0,
	`missing_field_count` int NOT NULL DEFAULT 0,
	`blockers_json` json DEFAULT ('[]'),
	`missing_fields_json` json DEFAULT ('[]'),
	`score_confianca` int,
	`risk_divergence` boolean DEFAULT false,
	`risk_divergence_note` text,
	`data_version` varchar(32) NOT NULL,
	`perfil_hash` varchar(64),
	`rules_hash` varchar(64),
	`duration_ms` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `m1_runner_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_m1_runner_logs_project` ON `m1_runner_logs` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_m1_runner_logs_status` ON `m1_runner_logs` (`status_arquetipo`);--> statement-breakpoint
CREATE INDEX `idx_m1_runner_logs_created` ON `m1_runner_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_m1_runner_logs_user` ON `m1_runner_logs` (`user_id`);