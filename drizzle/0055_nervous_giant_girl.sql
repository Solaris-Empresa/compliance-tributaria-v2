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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `diagnostic_shadow_divergences` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`project_id` bigint NOT NULL,
	`flow_version` varchar(20) NOT NULL,
	`field_name` varchar(50) NOT NULL,
	`legacy_source_column` varchar(100),
	`new_source_column` varchar(100),
	`legacy_value_json` json,
	`new_value_json` json,
	`reason` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diagnostic_shadow_divergences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ragDocuments` MODIFY COLUMN `artigo` varchar(300) NOT NULL;--> statement-breakpoint
ALTER TABLE `consistency_checks` ADD `medium_acknowledged` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `consistency_checks` ADD `medium_acknowledged_at` bigint;--> statement-breakpoint
ALTER TABLE `consistency_checks` ADD `medium_acknowledged_by` varchar(255);--> statement-breakpoint
ALTER TABLE `projects` ADD `briefingContentV1` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `briefingContentV3` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `riskMatricesDataV1` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `riskMatricesDataV3` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `actionPlansDataV1` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `actionPlansDataV3` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `profileCompleteness` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `projects` ADD `profileConfidence` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `projects` ADD `profileIntelligenceData` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `profileLastAnalyzedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `profileVersion` varchar(20) DEFAULT '1.0';--> statement-breakpoint
ALTER TABLE `projects` ADD `consistencyStatus` enum('pending','analyzing','ok','warning','blocked') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `projects` ADD `consistencyAcceptedRiskBy` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `consistencyAcceptedRiskAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `consistencyAcceptedRiskReason` varchar(500);--> statement-breakpoint
ALTER TABLE `ragDocuments` ADD `anchor_id` varchar(255);--> statement-breakpoint
ALTER TABLE `ragDocuments` ADD `autor` text;--> statement-breakpoint
ALTER TABLE `ragDocuments` ADD `revisado_por` text;--> statement-breakpoint
ALTER TABLE `ragDocuments` ADD `data_revisao` varchar(30);--> statement-breakpoint
ALTER TABLE `ragDocuments` ADD CONSTRAINT `ragDocuments_anchor_id_unique` UNIQUE(`anchor_id`);