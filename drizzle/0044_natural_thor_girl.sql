CREATE TABLE `compliance_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_uuid` varchar(36) NOT NULL,
	`project_id` int NOT NULL,
	`user_id` int NOT NULL,
	`status` enum('in_progress','completed','cancelled') NOT NULL DEFAULT 'in_progress',
	`total_questions` int NOT NULL DEFAULT 0,
	`answered_questions` int NOT NULL DEFAULT 0,
	`compliance_score` decimal(5,2),
	`risk_level` enum('baixo','medio','alto','critico'),
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`metadata` json,
	CONSTRAINT `compliance_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `compliance_sessions_session_uuid_unique` UNIQUE(`session_uuid`)
);
--> statement-breakpoint
CREATE TABLE `gap_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`mapping_id` varchar(20) NOT NULL,
	`canonical_id` varchar(20) NOT NULL,
	`gap_status` enum('compliant','nao_compliant','parcial','nao_aplicavel') NOT NULL,
	`gap_severity` enum('critica','alta','media','baixa'),
	`gap_type` varchar(100),
	`answer_value` enum('sim','nao','parcial','nao_aplicavel') NOT NULL,
	`answer_note` text,
	`recommendation` text,
	`evidence_ref` varchar(255),
	`analyzed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gap_analysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gap_audit_trail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int,
	`user_id` int NOT NULL,
	`user_name` varchar(255),
	`event_type` varchar(50) NOT NULL,
	`entity_type` varchar(50),
	`entity_id` varchar(50),
	`payload` json,
	`ip_address` varchar(45),
	`occurred_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gap_audit_trail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaire_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`mapping_id` varchar(20) NOT NULL,
	`canonical_id` varchar(20) NOT NULL,
	`answer_value` enum('sim','nao','parcial','nao_aplicavel') NOT NULL,
	`answer_note` text,
	`answered_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questionnaire_responses_id` PRIMARY KEY(`id`)
);
