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
CREATE TABLE `iagen_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`question_text` text NOT NULL,
	`resposta` text NOT NULL,
	`confidence_score` decimal(3,2),
	`fonte` varchar(20) DEFAULT 'ia_gen',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `iagen_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `rag_usage_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`query` text NOT NULL,
	`anchor_id` varchar(255) NOT NULL,
	`lei` varchar(20),
	`score` decimal(6,4),
	`position` int,
	`retrieved_at` timestamp NOT NULL DEFAULT (now()),
	`source` varchar(20) DEFAULT 'rag',
	`project_id` int,
	`session_id` varchar(50),
	CONSTRAINT `rag_usage_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `solaris_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`question_id` int NOT NULL,
	`codigo` varchar(10) NOT NULL,
	`resposta` text NOT NULL,
	`fonte` varchar(20) DEFAULT 'solaris',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `solaris_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `solaris_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`texto` text NOT NULL,
	`categoria` varchar(100) NOT NULL,
	`cnae_groups` json,
	`obrigatorio` tinyint NOT NULL DEFAULT 1,
	`ativo` tinyint NOT NULL DEFAULT 1,
	`observacao` text,
	`fonte` varchar(20) NOT NULL DEFAULT 'solaris',
	`criado_por_id` int,
	`criado_em` bigint NOT NULL,
	`atualizado_em` bigint,
	`upload_batch_id` varchar(64),
	`codigo` varchar(10),
	`titulo` varchar(255),
	`topicos` text,
	`severidade_base` varchar(20),
	`vigencia_inicio` varchar(10),
	CONSTRAINT `solaris_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `status` enum('rascunho','consistencia_pendente','cnaes_confirmados','assessment_fase1','assessment_fase2','onda1_solaris','onda2_iagen','diagnostico_corporativo','diagnostico_operacional','q_produto','q_servico','diagnostico_cnae','briefing','riscos','plano','dashboard','matriz_riscos','plano_acao','em_avaliacao','aprovado','em_andamento','concluido','arquivado') NOT NULL DEFAULT 'rascunho';--> statement-breakpoint
ALTER TABLE `ragDocuments` MODIFY COLUMN `lei` enum('lc214','ec132','lc227','lc224','lc116','lc87','cg_ibs','rfb_cbs','conv_icms','lc123') NOT NULL;--> statement-breakpoint
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
ALTER TABLE `projects` ADD `product_answers` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `service_answers` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `solaris_skipped_ids` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `iagen_skipped_ids` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `solaris_skipped_all` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `projects` ADD `iagen_skipped_all` boolean DEFAULT false;--> statement-breakpoint
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
ALTER TABLE `project_risks_v3` ADD `risk_category_l2` varchar(100);--> statement-breakpoint
ALTER TABLE `ragDocuments` ADD CONSTRAINT `ragDocuments_anchor_id_unique` UNIQUE(`anchor_id`);--> statement-breakpoint
ALTER TABLE `iagen_answers` ADD CONSTRAINT `iagen_answers_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_status_log` ADD CONSTRAINT `project_status_log_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solaris_answers` ADD CONSTRAINT `solaris_answers_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solaris_answers` ADD CONSTRAINT `solaris_answers_question_id_solaris_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `solaris_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_project_status_log_project_id` ON `project_status_log` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_rag_usage_anchor` ON `rag_usage_log` (`anchor_id`);--> statement-breakpoint
CREATE INDEX `idx_rag_usage_query` ON `rag_usage_log` (`query`);--> statement-breakpoint
CREATE INDEX `idx_rag_usage_time` ON `rag_usage_log` (`retrieved_at`);