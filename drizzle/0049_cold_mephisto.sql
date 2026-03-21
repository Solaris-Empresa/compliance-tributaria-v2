CREATE TABLE `cpie_analysis_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`analyzed_by_id` int NOT NULL,
	`overall_score` int NOT NULL DEFAULT 0,
	`confidence_score` int NOT NULL DEFAULT 0,
	`readiness_level` enum('insufficient','basic','good','excellent') NOT NULL DEFAULT 'basic',
	`dimensions_json` json,
	`suggestions_json` json,
	`dynamic_questions_json` json,
	`insights_json` json,
	`readiness_message` text,
	`analysis_version` varchar(32) DEFAULT 'cpie-v1.0',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cpie_analysis_history_id` PRIMARY KEY(`id`)
);
