-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `actionPlanPromptHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`promptText` text NOT NULL,
	`previousVersion` int NOT NULL,
	`newVersion` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdBy` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `actionPlanPrompts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planType` enum('corporate','branch') NOT NULL,
	`branchId` int,
	`taxRegime` enum('simples_nacional','lucro_presumido','lucro_real','mei'),
	`name` varchar(255) NOT NULL,
	`description` text,
	`promptTemplate` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdBy` int NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	`active` tinyint(1) NOT NULL DEFAULT 1,
	`isDefault` tinyint(1) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `actionPlanTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`taxRegime` enum('simples_nacional','lucro_presumido','lucro_real','mei'),
	`businessType` varchar(100),
	`companySize` enum('mei','pequena','media','grande'),
	`templateData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdBy` int NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `actionPlanVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`actionPlanId` int NOT NULL,
	`planData` text NOT NULL,
	`version` int NOT NULL,
	`templateId` int,
	`generatedAt` timestamp NOT NULL,
	`generatedBy` int NOT NULL,
	`generatedByAI` tinyint(1) NOT NULL,
	`status` enum('em_avaliacao','aprovado','reprovado','em_ajuste') NOT NULL,
	`approvedAt` timestamp,
	`approvedBy` int,
	`rejectionReason` text,
	`archivedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `actionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`planData` text NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`templateId` int,
	`generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`generatedBy` int NOT NULL,
	`generatedByAI` tinyint(1) NOT NULL DEFAULT 1,
	`status` enum('em_avaliacao','aprovado','reprovado','em_ajuste') NOT NULL DEFAULT 'em_avaliacao',
	`approvedAt` timestamp,
	`approvedBy` int,
	`rejectionReason` text,
	`prompt` text,
	`detailedPlan` text
);
--> statement-breakpoint
CREATE TABLE `action_plans` (
	`id` varchar(36) NOT NULL,
	`project_id` int NOT NULL,
	`risk_id` varchar(36) NOT NULL,
	`titulo` varchar(500) NOT NULL,
	`descricao` text,
	`responsavel` varchar(100) NOT NULL,
	`prazo` enum('30_dias','60_dias','90_dias','180_dias') NOT NULL,
	`status` enum('rascunho','aprovado','em_andamento','concluido','deleted') NOT NULL DEFAULT 'rascunho',
	`approved_by` int,
	`approved_at` timestamp,
	`deleted_reason` text,
	`created_by` int NOT NULL,
	`updated_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`category` enum('corporate','branch') NOT NULL,
	`branchId` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`responsibleArea` enum('TI','CONT','FISC','JUR','OPS','COM','ADM') NOT NULL,
	`taskType` enum('STRATEGIC','OPERATIONAL','COMPLIANCE') NOT NULL,
	`priority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`status` enum('SUGGESTED','IN_PROGRESS','COMPLETED','OVERDUE') NOT NULL DEFAULT 'SUGGESTED',
	`ownerId` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`deadline` timestamp NOT NULL,
	`completedAt` timestamp,
	`dependsOn` int,
	`phaseId` int,
	`riskId` int,
	`estimatedHours` int,
	`actualHours` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `activityBranches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`active` tinyint(1) NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `assessmentPhase1` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`taxRegime` enum('simples_nacional','lucro_presumido','lucro_real','mei') NOT NULL,
	`companySize` enum('mei','pequena','media','grande') NOT NULL,
	`annualRevenue` decimal(15,2),
	`employeeCount` int,
	`hasAccountingDept` varchar(10),
	`mainActivity` text,
	`completedAt` timestamp,
	`completedBy` int,
	`completedByRole` varchar(50),
	`businessSector` varchar(100),
	`currentERPSystem` varchar(100),
	`mainChallenges` text,
	`complianceGoals` text
);
--> statement-breakpoint
CREATE TABLE `assessmentPhase2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`generatedQuestions` text NOT NULL,
	`answers` text,
	`usedTemplateId` int,
	`generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`completedAt` timestamp,
	`completedBy` int,
	`completedByRole` varchar(50)
);
--> statement-breakpoint
CREATE TABLE `assessmentTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`taxRegime` enum('simples_nacional','lucro_presumido','lucro_real','mei'),
	`businessType` varchar(100),
	`companySize` enum('mei','pequena','media','grande'),
	`questions` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdBy` int NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`projectId` int NOT NULL,
	`entityType` enum('task','action','comment','corporate_assessment','branch_assessment','corporate_question','branch_question','project','permission') NOT NULL,
	`entityId` int NOT NULL,
	`action` enum('create','update','delete','status_change') NOT NULL,
	`changes` json,
	`metadata` json,
	`timestamp` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`entity` enum('risk','action_plan','task') NOT NULL,
	`entity_id` varchar(36) NOT NULL,
	`action` enum('created','updated','deleted','restored','approved') NOT NULL,
	`user_id` int NOT NULL,
	`user_name` varchar(255) NOT NULL,
	`user_role` varchar(100) NOT NULL,
	`before_state` json,
	`after_state` json,
	`reason` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `branchActionPlanVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`projectId` int NOT NULL,
	`branchId` int NOT NULL,
	`planContent` text NOT NULL,
	`generationPrompt` text,
	`version` int NOT NULL,
	`archivedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`archivedBy` int NOT NULL,
	`archivedReason` varchar(255)
);
--> statement-breakpoint
CREATE TABLE `branchActionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`branchId` int NOT NULL,
	`branchAssessmentId` int NOT NULL,
	`planContent` text NOT NULL,
	`generationPrompt` text,
	`generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`generatedBy` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft'
);
--> statement-breakpoint
CREATE TABLE `branchAssessmentTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`questions` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdBy` int NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	`active` tinyint(1) NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `branchAssessmentVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`projectId` int NOT NULL,
	`branchId` int NOT NULL,
	`generatedQuestions` text,
	`answers` text,
	`version` int NOT NULL,
	`archivedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`archivedBy` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `branchAssessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`branchId` int NOT NULL,
	`generatedQuestions` text NOT NULL,
	`answers` text,
	`usedTemplateId` int,
	`generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`completedAt` timestamp,
	`completedBy` int,
	`version` int NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `branchSuggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(128),
	`projectId` int,
	`companyDescription` text NOT NULL,
	`suggestedBranches` json NOT NULL,
	`confirmedBranches` json,
	`llmModel` varchar(100),
	`promptTokens` int,
	`completionTokens` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `briefingVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`briefingId` int NOT NULL,
	`summaryText` text NOT NULL,
	`gapsAnalysis` text NOT NULL,
	`riskLevel` enum('baixo','medio','alto','critico') NOT NULL,
	`priorityAreas` text,
	`version` int NOT NULL,
	`generatedAt` timestamp NOT NULL,
	`generatedBy` int NOT NULL,
	`archivedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `briefings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`summaryText` text NOT NULL,
	`gapsAnalysis` text NOT NULL,
	`riskLevel` enum('baixo','medio','alto','critico') NOT NULL,
	`priorityAreas` text,
	`generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`generatedBy` int NOT NULL,
	`version` int NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `canonical_requirements` (
	`canonical_id` varchar(32) NOT NULL,
	`canonical_description` text NOT NULL,
	`requirement_type` varchar(32) NOT NULL,
	`normative_scope` varchar(32) NOT NULL DEFAULT 'contribuinte',
	`sources` json NOT NULL,
	`risk_base` varchar(16) NOT NULL DEFAULT 'medium',
	`source_count` int NOT NULL DEFAULT 1,
	`is_multi_source` tinyint(1) NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	`canonical_relation_type` varchar(32) DEFAULT 'equivalente'
);
--> statement-breakpoint
CREATE TABLE `clientMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`memberRole` enum('admin','colaborador','visualizador') NOT NULL DEFAULT 'colaborador',
	`active` tinyint(1) NOT NULL DEFAULT 1,
	`invitedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `cnaeEmbeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cnaeCode` varchar(20) NOT NULL,
	`cnaeDescription` text NOT NULL,
	`embeddingJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `complianceSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionUuid` varchar(64) NOT NULL,
	`projectId` int NOT NULL,
	`createdById` int NOT NULL,
	`status` enum('em_andamento','processando','concluido','arquivado') NOT NULL DEFAULT 'em_andamento',
	`totalApplicable` int NOT NULL DEFAULT 0,
	`totalCompliant` int NOT NULL DEFAULT 0,
	`totalNonCompliant` int NOT NULL DEFAULT 0,
	`totalPartial` int NOT NULL DEFAULT 0,
	`complianceScore` int NOT NULL DEFAULT 0,
	`riskLevel` enum('baixo','medio','alto','critico') DEFAULT 'critico',
	`cnaeCode` varchar(20),
	`taxRegime` varchar(50),
	`companySize` varchar(50),
	`executiveSummary` text,
	`startedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
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
	`started_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`completed_at` timestamp,
	`metadata` json
);
--> statement-breakpoint
CREATE TABLE `compliance_usage_logs_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`event_type` enum('assessment_started','assessment_completed','score_calculated','gap_identified','risk_generated','action_generated','task_generated','executive_summary_generated','export_pdf','export_csv','dashboard_viewed') NOT NULL,
	`requirement_code` varchar(50),
	`domain` varchar(100),
	`ai_source` enum('llm','fallback'),
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `consistency_checks` (
	`id` varchar(36) NOT NULL,
	`project_id` int NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`overall_level` enum('none','low','medium','high','critical') NOT NULL DEFAULT 'none',
	`findings` text,
	`accepted_risk` tinyint NOT NULL DEFAULT 0,
	`accepted_risk_at` bigint,
	`accepted_risk_by` varchar(255),
	`accepted_risk_reason` text,
	`deterministic_score` int NOT NULL DEFAULT 0,
	`ai_score` int NOT NULL DEFAULT 0,
	`total_issues` int NOT NULL DEFAULT 0,
	`critical_count2` int NOT NULL DEFAULT 0,
	`high_count` int NOT NULL DEFAULT 0,
	`medium_count` int NOT NULL DEFAULT 0,
	`low_count` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint,
	`medium_acknowledged` tinyint NOT NULL DEFAULT 0,
	`medium_acknowledged_at` bigint,
	`medium_acknowledged_by` varchar(255)
);
--> statement-breakpoint
CREATE TABLE `corporateActionPlanVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`projectId` int NOT NULL,
	`planContent` text NOT NULL,
	`generationPrompt` text,
	`version` int NOT NULL,
	`archivedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`archivedBy` int NOT NULL,
	`archivedReason` varchar(255)
);
--> statement-breakpoint
CREATE TABLE `corporateActionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`corporateAssessmentId` int NOT NULL,
	`planContent` text NOT NULL,
	`generationPrompt` text,
	`generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`generatedBy` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft'
);
--> statement-breakpoint
CREATE TABLE `corporateAssessmentVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`projectId` int NOT NULL,
	`generatedQuestions` text,
	`answers` text,
	`version` int NOT NULL,
	`archivedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`archivedBy` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `corporateAssessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`taxRegime` enum('simples_nacional','lucro_presumido','lucro_real','mei') NOT NULL,
	`companySize` enum('mei','pequena','media','grande') NOT NULL,
	`annualRevenue` varchar(50),
	`employeeCount` int,
	`hasInternationalOperations` tinyint(1) DEFAULT 0,
	`hasAccountingDept` tinyint(1) DEFAULT 0,
	`hasTaxDept` tinyint(1) DEFAULT 0,
	`hasLegalDept` tinyint(1) DEFAULT 0,
	`hasITDept` tinyint(1) DEFAULT 0,
	`erpSystem` varchar(255),
	`hasIntegratedSystems` tinyint(1) DEFAULT 0,
	`generatedQuestions` text,
	`answers` text,
	`generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`completedAt` timestamp,
	`completedBy` int,
	`version` int NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `cosoControls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`component` enum('ambiente_controle','avaliacao_riscos','atividades_controle','informacao_comunicacao','monitoramento') NOT NULL,
	`controlName` varchar(255) NOT NULL,
	`description` text,
	`riskLevel` enum('baixo','medio','alto','critico') NOT NULL,
	`implementationStatus` enum('nao_implementado','em_implementacao','implementado','necessita_melhoria') NOT NULL DEFAULT 'nao_implementado',
	`responsible` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `coverage_reports` (
	`report_id` varchar(128) NOT NULL,
	`source_id` varchar(64) NOT NULL,
	`articles_total` int NOT NULL,
	`articles_processed` int NOT NULL,
	`requirements_total` int NOT NULL,
	`coverage_percent` decimal(5,2) NOT NULL,
	`gaps_json` json,
	`generated_at` datetime NOT NULL,
	`version` varchar(32) NOT NULL DEFAULT '1.0'
);
--> statement-breakpoint
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
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
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
	`updated_by_id` int
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
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `embeddingRebuildLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggeredBy` enum('manual','cron') NOT NULL DEFAULT 'manual',
	`triggeredByUserId` int,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`totalCnaes` int NOT NULL DEFAULT 0,
	`processedCnaes` int NOT NULL DEFAULT 0,
	`errorCount` int NOT NULL DEFAULT 0,
	`lastError` text,
	`durationSeconds` int,
	`startedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`finishedAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `gapAnalysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`canonicalId` varchar(32) NOT NULL,
	`mappingId` varchar(32) NOT NULL,
	`gapStatus` enum('compliant','nao_compliant','parcial','nao_aplicavel') NOT NULL,
	`gapType` varchar(64),
	`gapLevel` varchar(32),
	`gapSeverity` enum('critica','alta','media','baixa'),
	`evidenceRequired` text,
	`evidenceProvided` text,
	`recommendation` text,
	`estimatedEffort` varchar(64),
	`answerValue` varchar(20) NOT NULL,
	`answerNote` text,
	`calculatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `gapAuditTrail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`eventType` enum('session_created','answer_submitted','answer_updated','gap_calculated','session_completed','report_generated','session_archived') NOT NULL,
	`entityType` varchar(32),
	`entityId` varchar(64),
	`previousValue` text,
	`newValue` text,
	`metadata` text,
	`ipAddress` varchar(45),
	`occurredAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
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
	`analyzed_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
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
	`occurred_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
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
	`risk_category_code` varchar(64),
	`category_assignment_mode` enum('llm_assigned','human_validated'),
	`used_profile_fields` json,
	`prompt_version` varchar(20)
);
--> statement-breakpoint
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
	`blockers_json` json,
	`missing_fields_json` json,
	`score_confianca` int,
	`risk_divergence` tinyint(1) DEFAULT 0,
	`risk_divergence_note` text,
	`data_version` varchar(32) NOT NULL,
	`perfil_hash` varchar(80),
	`rules_hash` varchar(80),
	`duration_ms` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`dueDate` timestamp NOT NULL,
	`completedAt` timestamp,
	`status` enum('pendente','concluido','atrasado') NOT NULL DEFAULT 'pendente',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `normative_product_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`regime` varchar(64) NOT NULL,
	`legal_reference` varchar(255) NOT NULL,
	`ncm_code` varchar(20) NOT NULL,
	`match_mode` enum('exact','prefix') NOT NULL DEFAULT 'exact',
	`active` tinyint(1) NOT NULL DEFAULT 1,
	`source_version` varchar(64) NOT NULL DEFAULT 'LC214_2025',
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskCreated` tinyint(1) NOT NULL DEFAULT 1,
	`taskStarted` tinyint(1) NOT NULL DEFAULT 1,
	`taskDueSoon` tinyint(1) NOT NULL DEFAULT 1,
	`taskOverdue` tinyint(1) NOT NULL DEFAULT 1,
	`taskCompleted` tinyint(1) NOT NULL DEFAULT 0,
	`taskCommented` tinyint(1) NOT NULL DEFAULT 1,
	`emailEnabled` tinyint(1) NOT NULL DEFAULT 1,
	`inAppEnabled` tinyint(1) NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`recipientId` int NOT NULL,
	`type` enum('atraso','marco_importante','lembrete','aprovacao_pendente','aprovado','reprovado') NOT NULL,
	`subject` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`read` tinyint(1) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `onboardingProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentStep` int NOT NULL DEFAULT 0,
	`completedSteps` varchar(500) NOT NULL DEFAULT '',
	`skipped` tinyint(1) NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `phases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`startDate` timestamp,
	`endDate` timestamp,
	`status` enum('planejada','ativa','concluida','cancelada') NOT NULL DEFAULT 'planejada',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `planApprovals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planType` enum('corporate','branch') NOT NULL,
	`planId` int NOT NULL,
	`projectId` int NOT NULL,
	`status` enum('pending','approved','rejected','needs_revision') NOT NULL DEFAULT 'pending',
	`requestedBy` int NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewComments` text,
	`version` int NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `planReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`approvalId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`comment` text NOT NULL,
	`reviewType` enum('comment','suggestion','concern','approval') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `projectBranches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`branchId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`branchStatus` enum('pendente','questionario_em_andamento','questionario_concluido','plano_gerado','plano_aprovado','riscos_gerados','concluido') NOT NULL DEFAULT 'pendente',
	`questionnaireDepth` enum('sintetico','abrangente') DEFAULT 'sintetico',
	`order` int DEFAULT 0,
	`updatedAt` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `projectParticipants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('responsavel','membro_equipe','observador') NOT NULL,
	`addedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`addedBy` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projectPermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`permissionLevel` enum('view','edit','approve','admin') NOT NULL,
	`areas` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdBy` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_actions_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`risk_id` int,
	`gap_id` int,
	`requirement_id` int,
	`template_id` varchar(64),
	`requirement_code` varchar(32) NOT NULL,
	`risk_code` varchar(32) NOT NULL,
	`domain` varchar(100) NOT NULL,
	`gap_type` enum('normativo','processo','sistema','cadastro','contrato','financeiro','acessorio') NOT NULL,
	`action_code` varchar(32) NOT NULL,
	`action_name` varchar(255) NOT NULL,
	`action_desc` text NOT NULL,
	`action_description` text,
	`action_type` enum('configuracao_erp','ajuste_cadastro','revisao_contrato','parametrizacao_fiscal','obrigacao_acessoria','documentacao','treinamento','integracao','governanca','conciliacao') NOT NULL,
	`action_priority` enum('imediata','curto_prazo','medio_prazo','planejamento') NOT NULL,
	`estimated_days` int NOT NULL,
	`due_date` timestamp,
	`owner_suggestion` varchar(255) NOT NULL,
	`evidence_required` text,
	`deadline_rule` varchar(255),
	`source_reference` varchar(255),
	`traceability_chain` json,
	`status` enum('nao_iniciado','em_andamento','em_revisao','concluido','cancelado') NOT NULL DEFAULT 'nao_iniciado',
	`progress_percent` int NOT NULL DEFAULT 0,
	`completed_at` timestamp,
	`analysis_version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `project_assessments_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`requirement_code` varchar(32) NOT NULL,
	`criteria_coverage` decimal(5,2) NOT NULL,
	`evidence_coverage` decimal(5,2) NOT NULL,
	`operational_readiness` decimal(5,2) NOT NULL,
	`ai_score` decimal(5,2),
	`notes` text,
	`analysis_version` int NOT NULL DEFAULT 1,
	`answered_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `project_briefings_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`briefing_version` int NOT NULL DEFAULT 1,
	`section_identificacao` json NOT NULL,
	`section_escopo` json NOT NULL,
	`section_resumo_executivo` json NOT NULL,
	`section_perfil_regulatorio` json NOT NULL,
	`section_gaps` json NOT NULL,
	`section_riscos` json NOT NULL,
	`section_plano_acao` json NOT NULL,
	`section_proximos_passos` json NOT NULL,
	`coverage_percent` decimal(5,2) NOT NULL,
	`consistency_score` decimal(5,2) NOT NULL,
	`has_critical_conflicts` tinyint(1) NOT NULL DEFAULT 0,
	`pending_valid_questions` int NOT NULL DEFAULT 0,
	`input_snapshot` json NOT NULL,
	`source_requirements` json NOT NULL,
	`grounding_references` json NOT NULL,
	`traceability_map` json NOT NULL,
	`analysis_version` int NOT NULL DEFAULT 1,
	`generated_by_engine` varchar(50) NOT NULL DEFAULT 'briefingEngine_v1',
	`status` enum('rascunho','aprovado','publicado') NOT NULL DEFAULT 'rascunho',
	`created_at` datetime NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `project_gaps_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`requirement_code` varchar(32) NOT NULL,
	`requirement_name` varchar(255) NOT NULL,
	`domain` varchar(100) NOT NULL,
	`gap_level` enum('estrategico','tatico','operacional','tecnico') NOT NULL,
	`gap_type` enum('normativo','processo','sistema','cadastro','contrato','financeiro','acessorio') NOT NULL,
	`compliance_status` enum('atendido','parcialmente_atendido','nao_atendido','nao_aplicavel') NOT NULL,
	`criticality` enum('baixa','media','alta','critica') NOT NULL,
	`evidence_status` enum('completa','parcial','ausente') NOT NULL,
	`operational_dependency` enum('alta','media','baixa') NOT NULL,
	`score` decimal(5,2) NOT NULL,
	`risk_level` enum('baixo','medio','alto','critico') NOT NULL,
	`priority_score` decimal(5,2) NOT NULL,
	`critical_evidence_flag` tinyint(1) NOT NULL DEFAULT 0,
	`action_priority` enum('imediata','curto_prazo','medio_prazo','planejamento') NOT NULL,
	`estimated_days` int NOT NULL,
	`gap_description` text NOT NULL,
	`deterministic_reason` text NOT NULL,
	`ai_reason` text,
	`unmet_criteria` text NOT NULL,
	`recommended_actions` text NOT NULL,
	`analysis_version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`requirement_id` varchar(64),
	`gap_classification` enum('ausencia','parcial','inadequado'),
	`evaluation_confidence` decimal(3,2),
	`evaluation_confidence_reason` text,
	`question_id` int,
	`answer_value` text,
	`source_reference` varchar(255),
	`source` varchar(20) NOT NULL DEFAULT 'v1',
	`risk_category_code` varchar(64)
);
--> statement-breakpoint
CREATE TABLE `project_risks_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`risk_code` varchar(32) NOT NULL,
	`requirement_code` varchar(32) NOT NULL,
	`requirement_name` varchar(255) NOT NULL,
	`domain` varchar(100) NOT NULL,
	`gap_type` enum('normativo','processo','sistema','cadastro','contrato','financeiro','acessorio') NOT NULL,
	`probability` int NOT NULL,
	`impact` int NOT NULL,
	`risk_score` int NOT NULL,
	`risk_score_normalized` int NOT NULL,
	`risk_level` enum('baixo','medio','alto','critico') NOT NULL,
	`risk_dimension` enum('regulatorio','operacional','financeiro','reputacional') NOT NULL,
	`financial_impact_percent` decimal(5,4) NOT NULL,
	`financial_impact_description` text NOT NULL,
	`mitigation_strategy` text NOT NULL,
	`analysis_version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`gap_id` int,
	`origin` enum('direto','derivado','contextual'),
	`origin_reason` text,
	`evaluation_confidence` decimal(3,2),
	`risk_category_l1` varchar(100),
	`risk_category_l2` varchar(100),
	`risk_category_l3` varchar(100),
	`deterministic_score` int,
	`contextual_score` int,
	`hybrid_score` int,
	`source_reference` varchar(255),
	`fonte_risco` varchar(20) NOT NULL DEFAULT 'v1',
	`origin_justification` text,
	`evaluation_confidence_reason` text,
	`mitigation_hint` text,
	`base_score` int,
	`adjusted_score` int,
	`scoring_factors` json,
	`requirement_id` int,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `project_scores_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`requirement_code` varchar(32) NOT NULL,
	`criteria_coverage` decimal(5,2) NOT NULL,
	`evidence_coverage` decimal(5,2) NOT NULL,
	`operational_readiness` decimal(5,2) NOT NULL,
	`base_score` decimal(5,2) NOT NULL,
	`weighted_score` decimal(5,2) NOT NULL,
	`ai_score` decimal(5,2),
	`final_score` decimal(5,2) NOT NULL,
	`compliance_status` enum('atendido','parcialmente_atendido','nao_atendido','nao_aplicavel') NOT NULL,
	`risk_level` enum('baixo','medio','alto','critico') NOT NULL,
	`effective_criticality` enum('baixa','media','alta','critica') NOT NULL,
	`critical_evidence_flag` tinyint(1) NOT NULL DEFAULT 0,
	`gap_type` enum('normativo','processo','sistema','cadastro','contrato','financeiro','acessorio') NOT NULL,
	`analysis_version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `project_snapshots_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`analysis_version` int NOT NULL,
	`confidence_score_global` decimal(5,2) NOT NULL,
	`confidence_breakdown` text NOT NULL,
	`radar_json` text NOT NULL,
	`risk_summary_json` text NOT NULL,
	`action_summary_json` text NOT NULL,
	`task_summary_json` text NOT NULL,
	`overall_score` decimal(5,2) NOT NULL,
	`total_requirements` int NOT NULL,
	`total_gaps` int NOT NULL,
	`critical_gaps` int NOT NULL,
	`total_risks` int NOT NULL,
	`critical_risks` int NOT NULL,
	`total_actions` int NOT NULL,
	`immediate_actions` int NOT NULL,
	`executive_summary_json` text,
	`generated_by` enum('deterministic','ai') NOT NULL DEFAULT 'deterministic',
	`valid_until` timestamp,
	`is_stale` tinyint(1) NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `project_status_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`changed_by` varchar(255) NOT NULL,
	`reason` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `project_tasks_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`action_code` varchar(32) NOT NULL,
	`requirement_code` varchar(32) NOT NULL,
	`task_code` varchar(32) NOT NULL,
	`task_name` varchar(255) NOT NULL,
	`task_desc` text NOT NULL,
	`task_type` enum('analise','documentacao','configuracao','treinamento','validacao','aprovacao','comunicacao','integracao','teste','go_live') NOT NULL,
	`owner_type` varchar(100) NOT NULL,
	`estimated_days` int NOT NULL,
	`execution_order` int NOT NULL,
	`depends_on` text NOT NULL,
	`status` enum('nao_iniciado','em_andamento','em_revisao','concluido','bloqueado') NOT NULL DEFAULT 'nao_iniciado',
	`progress_percent` int NOT NULL DEFAULT 0,
	`completion_criteria` text NOT NULL,
	`completed_at` timestamp,
	`analysis_version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`clientId` int NOT NULL,
	`status` enum('rascunho','consistencia_pendente','cnaes_confirmados','perfil_entidade_confirmado','assessment_fase1','assessment_fase2','onda1_solaris','onda2_iagen','diagnostico_corporativo','diagnostico_operacional','q_produto','q_servico','diagnostico_cnae','briefing','riscos','plano','dashboard','matriz_riscos','plano_acao','em_avaliacao','aprovado','em_andamento','concluido','arquivado') NOT NULL DEFAULT 'rascunho',
	`planPeriodMonths` int,
	`createdById` int NOT NULL,
	`createdByRole` enum('cliente','equipe_solaris') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	`notificationFrequency` enum('diaria','semanal','apenas_atrasos','marcos_importantes','personalizada') NOT NULL DEFAULT 'semanal',
	`notificationEmail` varchar(320),
	`taxRegime` enum('simples_nacional','lucro_presumido','lucro_real'),
	`businessType` varchar(255),
	`companySize` enum('mei','micro','pequena','media','grande'),
	`mode` enum('temporario','historico') NOT NULL DEFAULT 'historico',
	`sessionToken` varchar(128),
	`description` text,
	`confirmedCnaes` json,
	`currentStep` int NOT NULL DEFAULT 1,
	`briefingContent` text,
	`riskMatricesData` json,
	`actionPlansData` json,
	`briefingStructured` json,
	`scoringData` json,
	`faturamentoAnual` int,
	`decisaoData` json,
	`questionnaireAnswers` json,
	`companyProfile` json,
	`operationProfile` json,
	`taxComplexity` json,
	`financialProfile` json,
	`governanceProfile` json,
	`diagnosticStatus` json,
	`corporateAnswers` json,
	`operationalAnswers` json,
	`cnaeAnswers` json,
	`currentStepName` varchar(64) DEFAULT 'perfil_empresa',
	`stepUpdatedAt` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`stepHistory` json,
	`profileVersion` varchar(20) DEFAULT '1.0',
	`consistencyStatus` enum('pending','analyzing','ok','warning','blocked') DEFAULT 'pending',
	`consistencyAcceptedRiskBy` int,
	`consistencyAcceptedRiskAt` timestamp,
	`consistencyAcceptedRiskReason` varchar(500),
	`briefingContentV1` text,
	`briefingContentV3` text,
	`riskMatricesDataV1` json,
	`riskMatricesDataV3` json,
	`actionPlansDataV1` json,
	`actionPlansDataV3` json,
	`product_answers` json,
	`service_answers` json,
	`solaris_skipped_ids` text,
	`iagen_skipped_ids` text,
	`solaris_skipped_all` tinyint(1) NOT NULL DEFAULT 0,
	`iagen_skipped_all` tinyint(1) NOT NULL DEFAULT 0,
	`archetype` json,
	`archetypeVersion` varchar(20),
	`archetypePerfilHash` varchar(64),
	`archetypeRulesHash` varchar(64),
	`archetypeConfirmedAt` timestamp,
	`archetypeConfirmedBy` int
);
--> statement-breakpoint
CREATE TABLE `questionnaireAnswersV3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`cnaeCode` varchar(20) NOT NULL,
	`cnaeDescription` varchar(255),
	`level` enum('nivel1','nivel2') NOT NULL DEFAULT 'nivel1',
	`questionIndex` int NOT NULL,
	`questionText` text NOT NULL,
	`questionType` varchar(50),
	`answerValue` text NOT NULL,
	`answeredAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`roundIndex` int NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `questionnaireProgressV3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`currentCnaeIndex` int NOT NULL DEFAULT 0,
	`currentLevel` enum('nivel1','nivel2') NOT NULL DEFAULT 'nivel1',
	`completedCnaes` json,
	`level2Decisions` json,
	`status` enum('em_andamento','concluido') NOT NULL DEFAULT 'em_andamento',
	`startedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `questionnaireQuestionsCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`cnaeCode` varchar(20) NOT NULL,
	`level` enum('nivel1','nivel2') NOT NULL DEFAULT 'nivel1',
	`roundIndex` int NOT NULL DEFAULT 0,
	`questionsJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`contextNote` text
);
--> statement-breakpoint
CREATE TABLE `questionnaireResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`mappingId` varchar(32) NOT NULL,
	`canonicalId` varchar(32) NOT NULL,
	`answerValue` enum('sim','nao','parcial','nao_aplicavel') NOT NULL,
	`answerNote` text,
	`evidenceDescription` text,
	`answeredAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`answeredById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `questionnaire_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`mapping_id` varchar(20) NOT NULL,
	`canonical_id` varchar(20) NOT NULL,
	`answer_value` enum('sim','nao','parcial','nao_aplicavel') NOT NULL,
	`answer_note` text,
	`answered_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ragDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lei` enum('lc214','lc227','lc224','lc123','ec132','lc116','lc87','conv_icms','cg_ibs','rfb_cbs','resolucao_cgibs_1','resolucao_cgibs_2','resolucao_cgibs_3','decreto12955','resolucao_cgibs_6','portaria_mf_cgibs_7','resolucao_cgibs_4','resolucao_cgibs_5','nt_2025_002','nt_008_2026','resolucao_cgsn_140','moc_cte_v4','moc_mdfe_v3') NOT NULL,
	`artigo` varchar(300) NOT NULL,
	`titulo` varchar(500) NOT NULL,
	`conteudo` text NOT NULL,
	`topicos` text NOT NULL,
	`cnaeGroups` varchar(500) NOT NULL DEFAULT '',
	`chunkIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`anchor_id` varchar(255),
	`autor` text,
	`revisado_por` text,
	`data_revisao` varchar(30)
);
--> statement-breakpoint
CREATE TABLE `rag_usage_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`query` text NOT NULL,
	`anchor_id` varchar(255) NOT NULL,
	`lei` varchar(20),
	`score` decimal(6,4),
	`position` int,
	`retrieved_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`source` varchar(20) DEFAULT 'rag',
	`project_id` int,
	`session_id` varchar(50)
);
--> statement-breakpoint
CREATE TABLE `regulatory_articles` (
	`article_id` varchar(128) NOT NULL,
	`source_id` varchar(64) NOT NULL,
	`article_number` varchar(128) NOT NULL,
	`hierarchy_level` varchar(32) NOT NULL,
	`parent_id` varchar(128),
	`full_text` mediumtext NOT NULL,
	`article_type` varchar(32) NOT NULL,
	`position_order` int NOT NULL,
	`version` varchar(32) NOT NULL DEFAULT '1.0',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `regulatory_requirements` (
	`requirement_id` varchar(128) NOT NULL,
	`source_id` varchar(64) NOT NULL,
	`article_id` varchar(128) NOT NULL,
	`legal_basis_text` mediumtext NOT NULL,
	`requirement_type` varchar(32) NOT NULL,
	`description` text NOT NULL,
	`trigger_condition` text,
	`risk_if_not_met` text,
	`version` varchar(32) NOT NULL DEFAULT '1.0',
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`normalized_group` varchar(128),
	`duplicate_of` varchar(128),
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`normative_type` varchar(32),
	`normative_scope` varchar(32),
	`is_operational` tinyint(1),
	`operational_description` text,
	`canonical_group_id` varchar(32)
);
--> statement-breakpoint
CREATE TABLE `regulatory_requirements_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`domain` varchar(100) NOT NULL,
	`assessment_order` int NOT NULL,
	`base_criticality` enum('baixa','media','alta','critica') NOT NULL,
	`default_gap_type` enum('normativo','processo','sistema','cadastro','contrato','financeiro','acessorio') NOT NULL,
	`gap_level` enum('estrategico','tatico','operacional','tecnico') NOT NULL,
	`layer` enum('corporativo','operacional','cnae','universal') NOT NULL DEFAULT 'universal',
	`source_reference` varchar(255),
	`cnae_scope` json,
	`porte_scope` json,
	`regime_scope` json,
	`uf_scope` json,
	`evaluation_criteria` text NOT NULL,
	`evidence_required` text NOT NULL,
	`tags` text,
	`legal_reference` varchar(255),
	`legal_article` varchar(100),
	`active` tinyint(1) NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`risk_category_code` varchar(64)
);
--> statement-breakpoint
CREATE TABLE `regulatory_sources` (
	`source_id` varchar(64) NOT NULL,
	`name` varchar(512) NOT NULL,
	`type` varchar(64) NOT NULL,
	`version` varchar(32) NOT NULL DEFAULT '1.0',
	`effective_date` date NOT NULL,
	`url` text,
	`sha256` varchar(64),
	`total_pages` int,
	`ingested_at` datetime NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `req_v3_to_canonical` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`requirement_code` varchar(50) NOT NULL,
	`requirement_id` bigint NOT NULL,
	`canonical_id` varchar(20) NOT NULL,
	`mapping_type` varchar(50) NOT NULL DEFAULT 'domain_semantic',
	`confidence` decimal(3,2) NOT NULL DEFAULT '0.85',
	`mapping_rationale` text,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `requirement_question_mapping` (
	`mapping_id` varchar(32) NOT NULL,
	`canonical_id` varchar(32) NOT NULL,
	`question_template` text NOT NULL,
	`question_text_clean` text,
	`question_type` varchar(32) NOT NULL DEFAULT 'boolean',
	`questionnaire_section` varchar(16) NOT NULL,
	`validation_rule` varchar(128),
	`required` tinyint(1) NOT NULL DEFAULT 1,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`question_quality_status` varchar(16) NOT NULL DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE `riskMatrix` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`riskDescription` text,
	`probability` enum('muito_baixa','baixa','media','alta','muito_alta'),
	`impact` enum('muito_baixo','baixo','medio','alto','muito_alto'),
	`treatmentStrategy` text,
	`suggestedControls` text,
	`expectedEvidence` text,
	`version` int NOT NULL DEFAULT 1,
	`generatedByAI` tinyint(1) NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdBy` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `riskMatrixPromptHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`promptText` text NOT NULL,
	`previousVersion` int NOT NULL,
	`newVersion` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdBy` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `riskMatrixVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`snapshotData` text NOT NULL,
	`riskCount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdBy` int NOT NULL,
	`createdByName` varchar(255),
	`triggerType` enum('auto_generation','manual_regeneration','prompt_edit') NOT NULL
);
--> statement-breakpoint
CREATE TABLE `risk_analysis` (
	`risk_id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`canonical_id` varchar(50) NOT NULL,
	`mapping_id` varchar(50) NOT NULL,
	`gap_status` enum('compliant','nao_compliant','parcial','nao_aplicavel') NOT NULL,
	`risk_level` enum('baixo','medio','alto','critico') NOT NULL,
	`risk_score` int NOT NULL DEFAULT 0,
	`impact_type` enum('financeiro','operacional','legal','reputacional') NOT NULL,
	`severity_base` enum('critica','alta','media','baixa') NOT NULL,
	`normative_type` enum('obrigacao','vedacao','direito','opcao') NOT NULL,
	`gap_multiplier` varchar(10) NOT NULL DEFAULT '0',
	`base_score` int NOT NULL DEFAULT 0,
	`domain` varchar(100),
	`requirement_name` varchar(255),
	`mitigation_priority` enum('imediata','curto_prazo','medio_prazo','monitoramento') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `risk_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(64) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`severidade` enum('alta','media','oportunidade') NOT NULL,
	`urgencia` enum('imediata','curto_prazo','medio_prazo') NOT NULL,
	`tipo` enum('risk','opportunity') NOT NULL,
	`artigo_base` varchar(255) NOT NULL,
	`lei_codigo` varchar(64) NOT NULL,
	`vigencia_inicio` date NOT NULL,
	`vigencia_fim` date,
	`status` enum('ativo','sugerido','pendente_revisao','inativo','legado') NOT NULL DEFAULT 'ativo',
	`origem` enum('lei_federal','regulamentacao','rag_sensor','manual') NOT NULL,
	`escopo` enum('nacional','estadual','setorial') NOT NULL DEFAULT 'nacional',
	`sugerido_por` varchar(100),
	`aprovado_por` varchar(100),
	`aprovado_at` timestamp,
	`chunk_origem_id` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`allowed_domains` json,
	`allowed_gap_types` json,
	`rule_code` varchar(64),
	`descricao` text
);
--> statement-breakpoint
CREATE TABLE `risk_session_summary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`total_risk_score` int NOT NULL DEFAULT 0,
	`avg_risk_score` int NOT NULL DEFAULT 0,
	`max_risk_score` int NOT NULL DEFAULT 0,
	`critical_count` int NOT NULL DEFAULT 0,
	`alto_count` int NOT NULL DEFAULT 0,
	`medio_count` int NOT NULL DEFAULT 0,
	`baixo_count` int NOT NULL DEFAULT 0,
	`financial_risk` int NOT NULL DEFAULT 0,
	`operational_risk` int NOT NULL DEFAULT 0,
	`legal_risk` int NOT NULL DEFAULT 0,
	`overall_risk_level` enum('baixo','medio','alto','critico') NOT NULL,
	`calculated_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `risks_v4` (
	`id` varchar(36) NOT NULL,
	`project_id` int NOT NULL,
	`rule_id` varchar(64) NOT NULL,
	`type` enum('risk','opportunity') NOT NULL,
	`categoria` varchar(100) NOT NULL,
	`titulo` varchar(500) NOT NULL,
	`descricao` text,
	`artigo` varchar(255) NOT NULL,
	`severidade` enum('alta','media','oportunidade') NOT NULL,
	`urgencia` enum('imediata','curto_prazo','medio_prazo') NOT NULL,
	`evidence` json NOT NULL,
	`breadcrumb` json NOT NULL,
	`source_priority` enum('cnae','ncm','nbs','solaris','iagen','regulatorio','inferred') NOT NULL,
	`confidence` decimal(5,4) NOT NULL DEFAULT '1.0',
	`gap_detected` tinyint(1) NOT NULL DEFAULT 0,
	`status` enum('active','deleted') NOT NULL DEFAULT 'active',
	`approved_by` int,
	`approved_at` timestamp,
	`deleted_reason` text,
	`created_by` int NOT NULL,
	`updated_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`risk_key` varchar(255),
	`operational_context` json,
	`evidence_count` int NOT NULL DEFAULT 0,
	`rag_validated` tinyint(1) NOT NULL DEFAULT 0,
	`rag_confidence` decimal(3,2) NOT NULL DEFAULT '0',
	`rag_artigo_exato` varchar(255),
	`rag_paragrafo` varchar(100),
	`rag_inciso` varchar(100),
	`rag_trecho_legal` text,
	`rag_query` varchar(500),
	`rag_validation_note` text
);
--> statement-breakpoint
CREATE TABLE `sessionActionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(128) NOT NULL,
	`planItems` json,
	`executiveSummary` text,
	`overallRiskLevel` enum('baixo','medio','alto','critico'),
	`complianceScore` int,
	`status` enum('gerando','gerado','aprovado','em_execucao') NOT NULL DEFAULT 'gerando',
	`totalActions` int DEFAULT 0,
	`criticalActions` int DEFAULT 0,
	`generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `sessionBranchAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(128),
	`projectId` int,
	`branchCode` varchar(20) NOT NULL,
	`branchName` varchar(100) NOT NULL,
	`generatedQuestions` json,
	`answers` json,
	`status` enum('pendente','em_andamento','concluido') NOT NULL DEFAULT 'pendente',
	`aiAnalysis` text,
	`riskLevel` enum('baixo','medio','alto','critico'),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `sessionConsolidations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(255) NOT NULL,
	`executiveSummary` text,
	`keyFindings` json,
	`topRecommendations` json,
	`branchSummaries` json,
	`timeline` json,
	`estimatedBudget` json,
	`complianceScore` int,
	`overallRiskLevel` varchar(50),
	`totalActions` int DEFAULT 0,
	`criticalActions` int DEFAULT 0,
	`estimatedDays` int,
	`status` enum('gerando','gerado','exportado','salvo_historico') NOT NULL DEFAULT 'gerando',
	`convertedToProjectId` int,
	`exportedAt` timestamp,
	`savedToHistoryAt` timestamp,
	`generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(128) NOT NULL,
	`mode` enum('temporario','historico') NOT NULL DEFAULT 'temporario',
	`companyDescription` text,
	`suggestedBranches` json,
	`confirmedBranches` json,
	`currentStep` enum('modo_uso','briefing','confirmar_ramos','questionario','plano_acao','matriz_riscos','consolidacao','concluido') NOT NULL DEFAULT 'modo_uso',
	`projectId` int,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
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
	`updated_at` bigint NOT NULL
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
	`topicos` text,
	`titulo` varchar(255),
	`severidade_base` varchar(20),
	`vigencia_inicio` varchar(10),
	`risk_category_code` varchar(64),
	`classification_scope` enum('risk_engine','diagnostic_only') NOT NULL DEFAULT 'risk_engine',
	`mapping_review_status` enum('curated_internal','pending_legal','approved_legal') NOT NULL DEFAULT 'curated_internal',
	`lei_ref` varchar(64),
	`artigo_ref` varchar(128)
);
--> statement-breakpoint
CREATE TABLE `stepComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`step` enum('briefing','matrizes','plano_acao') NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`userRole` enum('cliente','equipe_solaris','advogado_senior','advogado_junior') NOT NULL,
	`content` text NOT NULL,
	`isEdited` tinyint(1) NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `taskComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `taskHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`taskId` varchar(100) NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`eventType` enum('criacao','status','responsavel','prazo','progresso','titulo','prioridade','notificacao','comentario') NOT NULL,
	`field` varchar(100),
	`oldValue` text,
	`newValue` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `taskObservers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL,
	`project_id` int NOT NULL,
	`action_plan_id` varchar(36) NOT NULL,
	`titulo` varchar(500) NOT NULL,
	`descricao` text,
	`responsavel` varchar(100) NOT NULL,
	`prazo` date,
	`status` enum('todo','doing','done','blocked','deleted') NOT NULL DEFAULT 'todo',
	`ordem` int NOT NULL DEFAULT 0,
	`deleted_reason` text,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`data_inicio` date NOT NULL,
	`data_fim` date NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('cliente','equipe_solaris','advogado_senior','advogado_junior') NOT NULL DEFAULT 'cliente',
	`companyName` varchar(255),
	`cnpj` varchar(20),
	`cpf` varchar(14),
	`segment` varchar(100),
	`phone` varchar(20),
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `action_plans` ADD CONSTRAINT `action_plans_risk_id_fk` FOREIGN KEY (`risk_id`) REFERENCES `risks_v4`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `iagen_answers` ADD CONSTRAINT `iagen_answers_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `iagen_answers` ADD CONSTRAINT `fk_iagen_risk_category` FOREIGN KEY (`risk_category_code`) REFERENCES `risk_categories`(`codigo`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `project_status_log` ADD CONSTRAINT `project_status_log_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `regulatory_requirements_v3` ADD CONSTRAINT `fk_req_v3_risk_category` FOREIGN KEY (`risk_category_code`) REFERENCES `risk_categories`(`codigo`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `risks_v4` ADD CONSTRAINT `fk_risks_v4_categoria` FOREIGN KEY (`categoria`) REFERENCES `risk_categories`(`codigo`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `solaris_answers` ADD CONSTRAINT `solaris_answers_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solaris_answers` ADD CONSTRAINT `solaris_answers_question_id_solaris_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `solaris_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solaris_questions` ADD CONSTRAINT `fk_solaris_q_risk_category` FOREIGN KEY (`risk_category_code`) REFERENCES `risk_categories`(`codigo`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_action_plan_id_fk` FOREIGN KEY (`action_plan_id`) REFERENCES `action_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `action_plans_project_id_idx` ON `action_plans` (`project_id`);--> statement-breakpoint
CREATE INDEX `action_plans_risk_id_idx` ON `action_plans` (`risk_id`);--> statement-breakpoint
CREATE INDEX `action_plans_status_idx` ON `action_plans` (`status`);--> statement-breakpoint
CREATE INDEX `activityBranches_code_unique` ON `activityBranches` (`code`);--> statement-breakpoint
CREATE INDEX `assessmentPhase1_projectId_unique` ON `assessmentPhase1` (`projectId`);--> statement-breakpoint
CREATE INDEX `assessmentPhase2_projectId_unique` ON `assessmentPhase2` (`projectId`);--> statement-breakpoint
CREATE INDEX `audit_log_project_id_idx` ON `audit_log` (`project_id`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_entity_id_idx` ON `audit_log` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `briefings_projectId_unique` ON `briefings` (`projectId`);--> statement-breakpoint
CREATE INDEX `cnaeEmbeddings_cnaeCode_unique` ON `cnaeEmbeddings` (`cnaeCode`);--> statement-breakpoint
CREATE INDEX `complianceSessions_sessionUuid_unique` ON `complianceSessions` (`sessionUuid`);--> statement-breakpoint
CREATE INDEX `compliance_sessions_session_uuid_unique` ON `compliance_sessions` (`session_uuid`);--> statement-breakpoint
CREATE INDEX `corporateActionPlans_projectId_unique` ON `corporateActionPlans` (`projectId`);--> statement-breakpoint
CREATE INDEX `corporateAssessments_projectId_unique` ON `corporateAssessments` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_source` ON `coverage_reports` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_iagen_category` ON `iagen_answers` (`risk_category_code`);--> statement-breakpoint
CREATE INDEX `idx_m1_runner_logs_project` ON `m1_runner_logs` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_m1_runner_logs_status` ON `m1_runner_logs` (`status_arquetipo`);--> statement-breakpoint
CREATE INDEX `idx_m1_runner_logs_created` ON `m1_runner_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_m1_runner_logs_user` ON `m1_runner_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_normative_regime` ON `normative_product_rules` (`regime`);--> statement-breakpoint
CREATE INDEX `idx_normative_ncm` ON `normative_product_rules` (`ncm_code`);--> statement-breakpoint
CREATE INDEX `idx_normative_active` ON `normative_product_rules` (`active`);--> statement-breakpoint
CREATE INDEX `notificationPreferences_userId_unique` ON `notificationPreferences` (`userId`);--> statement-breakpoint
CREATE INDEX `onboardingProgress_userId_unique` ON `onboardingProgress` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `project_briefings_v3` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_client` ON `project_briefings_v3` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_coverage` ON `project_briefings_v3` (`coverage_percent`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `project_briefings_v3` (`status`);--> statement-breakpoint
CREATE INDEX `idx_project_status_log_project_id` ON `project_status_log` (`project_id`);--> statement-breakpoint
CREATE INDEX `questionnaireProgressV3_projectId_unique` ON `questionnaireProgressV3` (`projectId`);--> statement-breakpoint
CREATE INDEX `ragDocuments_anchor_id_unique` ON `ragDocuments` (`anchor_id`);--> statement-breakpoint
CREATE INDEX `idx_rag_usage_anchor` ON `rag_usage_log` (`anchor_id`);--> statement-breakpoint
CREATE INDEX `idx_rag_usage_query` ON `rag_usage_log` (`query`);--> statement-breakpoint
CREATE INDEX `idx_rag_usage_time` ON `rag_usage_log` (`retrieved_at`);--> statement-breakpoint
CREATE INDEX `idx_source` ON `regulatory_articles` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_parent` ON `regulatory_articles` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_level` ON `regulatory_articles` (`hierarchy_level`);--> statement-breakpoint
CREATE INDEX `idx_source` ON `regulatory_requirements` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_article` ON `regulatory_requirements` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `regulatory_requirements` (`requirement_type`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `regulatory_requirements` (`status`);--> statement-breakpoint
CREATE INDEX `regulatory_requirements_v3_code_unique` ON `regulatory_requirements_v3` (`code`);--> statement-breakpoint
CREATE INDEX `uq_req_canonical` ON `req_v3_to_canonical` (`requirement_code`,`canonical_id`);--> statement-breakpoint
CREATE INDEX `idx_req_code` ON `req_v3_to_canonical` (`requirement_code`);--> statement-breakpoint
CREATE INDEX `idx_canonical_id` ON `req_v3_to_canonical` (`canonical_id`);--> statement-breakpoint
CREATE INDEX `idx_canonical_id` ON `requirement_question_mapping` (`canonical_id`);--> statement-breakpoint
CREATE INDEX `idx_section` ON `requirement_question_mapping` (`questionnaire_section`);--> statement-breakpoint
CREATE INDEX `codigo` ON `risk_categories` (`codigo`);--> statement-breakpoint
CREATE INDEX `risk_session_summary_session_id_unique` ON `risk_session_summary` (`session_id`);--> statement-breakpoint
CREATE INDEX `risks_v4_project_id_idx` ON `risks_v4` (`project_id`);--> statement-breakpoint
CREATE INDEX `risks_v4_status_idx` ON `risks_v4` (`status`);--> statement-breakpoint
CREATE INDEX `risks_v4_rule_id_idx` ON `risks_v4` (`rule_id`);--> statement-breakpoint
CREATE INDEX `risks_v4_gap_detected_idx` ON `risks_v4` (`gap_detected`);--> statement-breakpoint
CREATE INDEX `sessions_sessionToken_unique` ON `sessions` (`sessionToken`);--> statement-breakpoint
CREATE INDEX `idx_solaris_q_category` ON `solaris_questions` (`risk_category_code`);--> statement-breakpoint
CREATE INDEX `tasks_project_id_idx` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `tasks_action_plan_id_idx` ON `tasks` (`action_plan_id`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);
*/