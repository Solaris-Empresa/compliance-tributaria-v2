CREATE TABLE `compliance_usage_logs_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`event_type` enum('assessment_started','assessment_completed','score_calculated','gap_identified','risk_generated','action_generated','task_generated','executive_summary_generated','export_pdf','export_csv','dashboard_viewed') NOT NULL,
	`requirement_code` varchar(50),
	`domain` varchar(100),
	`ai_source` enum('llm','fallback'),
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compliance_usage_logs_v3_id` PRIMARY KEY(`id`)
);
