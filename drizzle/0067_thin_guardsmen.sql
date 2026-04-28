CREATE TABLE `actionPlanPromptHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`promptText` text NOT NULL,
	`previousVersion` int NOT NULL,
	`newVersion` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `actionPlanPromptHistory_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`isDefault` boolean NOT NULL DEFAULT false,
	CONSTRAINT `actionPlanPrompts_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `actionPlanTemplates_id` PRIMARY KEY(`id`)
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
	`generatedByAI` boolean NOT NULL,
	`status` enum('em_avaliacao','aprovado','reprovado','em_ajuste') NOT NULL,
	`approvedAt` timestamp,
	`approvedBy` int,
	`rejectionReason` text,
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `actionPlanVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `actionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`planData` text NOT NULL,
	`prompt` text,
	`detailedPlan` text,
	`version` int NOT NULL DEFAULT 1,
	`templateId` int,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`generatedBy` int NOT NULL,
	`generatedByAI` boolean NOT NULL DEFAULT true,
	`status` enum('em_avaliacao','aprovado','reprovado','em_ajuste') NOT NULL DEFAULT 'em_avaliacao',
	`approvedAt` timestamp,
	`approvedBy` int,
	`rejectionReason` text,
	CONSTRAINT `actionPlans_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activityBranches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activityBranches_id` PRIMARY KEY(`id`),
	CONSTRAINT `activityBranches_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `assessmentPhase1` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`taxRegime` enum('simples_nacional','lucro_presumido','lucro_real','mei') NOT NULL,
	`companySize` enum('mei','pequena','media','grande') NOT NULL,
	`annualRevenue` decimal(15,2),
	`businessSector` varchar(100),
	`mainActivity` text,
	`employeeCount` int,
	`hasAccountingDept` varchar(10),
	`currentERPSystem` varchar(100),
	`mainChallenges` text,
	`complianceGoals` text,
	`completedAt` timestamp,
	`completedBy` int,
	`completedByRole` enum('cliente','equipe_solaris'),
	CONSTRAINT `assessmentPhase1_id` PRIMARY KEY(`id`),
	CONSTRAINT `assessmentPhase1_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `assessmentPhase2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`generatedQuestions` text NOT NULL,
	`answers` text,
	`usedTemplateId` int,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`completedBy` int,
	`completedByRole` enum('cliente','equipe_solaris'),
	CONSTRAINT `assessmentPhase2_id` PRIMARY KEY(`id`),
	CONSTRAINT `assessmentPhase2_projectId_unique` UNIQUE(`projectId`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `assessmentTemplates_id` PRIMARY KEY(`id`)
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
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
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
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	`archivedBy` int NOT NULL,
	`archivedReason` varchar(255),
	CONSTRAINT `branchActionPlanVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branchActionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`branchId` int NOT NULL,
	`branchAssessmentId` int NOT NULL,
	`planContent` text NOT NULL,
	`generationPrompt` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`generatedBy` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	CONSTRAINT `branchActionPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branchAssessmentTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`questions` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `branchAssessmentTemplates_id` PRIMARY KEY(`id`)
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
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	`archivedBy` int NOT NULL,
	CONSTRAINT `branchAssessmentVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branchAssessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`branchId` int NOT NULL,
	`generatedQuestions` text NOT NULL,
	`answers` text,
	`usedTemplateId` int,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`completedBy` int,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `branchAssessments_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `branchSuggestions_id` PRIMARY KEY(`id`)
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
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `briefingVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `briefings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`summaryText` text NOT NULL,
	`gapsAnalysis` text NOT NULL,
	`riskLevel` enum('baixo','medio','alto','critico') NOT NULL,
	`priorityAreas` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`generatedBy` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `briefings_id` PRIMARY KEY(`id`),
	CONSTRAINT `briefings_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `clientMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`memberRole` enum('admin','colaborador','visualizador') NOT NULL DEFAULT 'colaborador',
	`active` boolean NOT NULL DEFAULT true,
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cnaeEmbeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cnaeCode` varchar(20) NOT NULL,
	`cnaeDescription` text NOT NULL,
	`embeddingJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cnaeEmbeddings_id` PRIMARY KEY(`id`),
	CONSTRAINT `cnaeEmbeddings_cnaeCode_unique` UNIQUE(`cnaeCode`)
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
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`metadata` json,
	CONSTRAINT `compliance_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `compliance_sessions_session_uuid_unique` UNIQUE(`session_uuid`)
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
	`medium_acknowledged` tinyint NOT NULL DEFAULT 0,
	`medium_acknowledged_at` bigint,
	`medium_acknowledged_by` varchar(255),
	`deterministic_score` int NOT NULL DEFAULT 0,
	`ai_score` int NOT NULL DEFAULT 0,
	`total_issues` int NOT NULL DEFAULT 0,
	`critical_count2` int NOT NULL DEFAULT 0,
	`high_count` int NOT NULL DEFAULT 0,
	`medium_count` int NOT NULL DEFAULT 0,
	`low_count` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint,
	CONSTRAINT `consistency_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `corporateActionPlanVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`projectId` int NOT NULL,
	`planContent` text NOT NULL,
	`generationPrompt` text,
	`version` int NOT NULL,
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	`archivedBy` int NOT NULL,
	`archivedReason` varchar(255),
	CONSTRAINT `corporateActionPlanVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `corporateActionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`corporateAssessmentId` int NOT NULL,
	`planContent` text NOT NULL,
	`generationPrompt` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`generatedBy` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	CONSTRAINT `corporateActionPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `corporateActionPlans_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `corporateAssessmentVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`projectId` int NOT NULL,
	`generatedQuestions` text,
	`answers` text,
	`version` int NOT NULL,
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	`archivedBy` int NOT NULL,
	CONSTRAINT `corporateAssessmentVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `corporateAssessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`taxRegime` enum('simples_nacional','lucro_presumido','lucro_real','mei') NOT NULL,
	`companySize` enum('mei','pequena','media','grande') NOT NULL,
	`annualRevenue` varchar(50),
	`employeeCount` int,
	`hasInternationalOperations` boolean DEFAULT false,
	`hasAccountingDept` boolean DEFAULT false,
	`hasTaxDept` boolean DEFAULT false,
	`hasLegalDept` boolean DEFAULT false,
	`hasITDept` boolean DEFAULT false,
	`erpSystem` varchar(255),
	`hasIntegratedSystems` boolean DEFAULT false,
	`generatedQuestions` text,
	`answers` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`completedBy` int,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `corporateAssessments_id` PRIMARY KEY(`id`),
	CONSTRAINT `corporateAssessments_projectId_unique` UNIQUE(`projectId`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cosoControls_id` PRIMARY KEY(`id`)
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
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	CONSTRAINT `embeddingRebuildLogs_id` PRIMARY KEY(`id`)
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
	`prompt_version` varchar(20),
	CONSTRAINT `iagen_answers_id` PRIMARY KEY(`id`)
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
	`blockers_json` json DEFAULT ('[]'),
	`missing_fields_json` json DEFAULT ('[]'),
	`score_confianca` int,
	`risk_divergence` boolean DEFAULT false,
	`risk_divergence_note` text,
	`data_version` varchar(32) NOT NULL,
	`perfil_hash` varchar(80),
	`rules_hash` varchar(80),
	`duration_ms` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `m1_runner_logs_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskCreated` boolean NOT NULL DEFAULT true,
	`taskStarted` boolean NOT NULL DEFAULT true,
	`taskDueSoon` boolean NOT NULL DEFAULT true,
	`taskOverdue` boolean NOT NULL DEFAULT true,
	`taskCompleted` boolean NOT NULL DEFAULT false,
	`taskCommented` boolean NOT NULL DEFAULT true,
	`emailEnabled` boolean NOT NULL DEFAULT true,
	`inAppEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notificationPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`recipientId` int NOT NULL,
	`type` enum('atraso','marco_importante','lembrete','aprovacao_pendente','aprovado','reprovado') NOT NULL,
	`subject` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`read` boolean NOT NULL DEFAULT false,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboardingProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentStep` int NOT NULL DEFAULT 0,
	`completedSteps` varchar(500) NOT NULL DEFAULT '',
	`skipped` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboardingProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `onboardingProgress_userId_unique` UNIQUE(`userId`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `phases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planApprovals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planType` enum('corporate','branch') NOT NULL,
	`planId` int NOT NULL,
	`projectId` int NOT NULL,
	`status` enum('pending','approved','rejected','needs_revision') NOT NULL DEFAULT 'pending',
	`requestedBy` int NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewComments` text,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `planApprovals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`approvalId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`comment` text NOT NULL,
	`reviewType` enum('comment','suggestion','concern','approval') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `planReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectBranches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`branchId` int NOT NULL,
	`branchStatus` enum('pendente','questionario_em_andamento','questionario_concluido','plano_gerado','plano_aprovado','riscos_gerados','concluido') NOT NULL DEFAULT 'pendente',
	`questionnaireDepth` enum('sintetico','abrangente') DEFAULT 'sintetico',
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectBranches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectParticipants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('responsavel','membro_equipe','observador') NOT NULL,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	`addedBy` int NOT NULL,
	CONSTRAINT `projectParticipants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectPermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`permissionLevel` enum('view','edit','approve','admin') NOT NULL,
	`areas` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `projectPermissions_id` PRIMARY KEY(`id`)
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
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`clientId` int NOT NULL,
	`status` enum('rascunho','consistencia_pendente','cnaes_confirmados','assessment_fase1','assessment_fase2','onda1_solaris','onda2_iagen','diagnostico_corporativo','diagnostico_operacional','q_produto','q_servico','diagnostico_cnae','briefing','riscos','plano','dashboard','matriz_riscos','plano_acao','em_avaliacao','aprovado','em_andamento','concluido','arquivado') NOT NULL DEFAULT 'rascunho',
	`planPeriodMonths` int,
	`createdById` int NOT NULL,
	`createdByRole` enum('cliente','equipe_solaris') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	`notificationFrequency` enum('diaria','semanal','apenas_atrasos','marcos_importantes','personalizada') NOT NULL DEFAULT 'semanal',
	`notificationEmail` varchar(320),
	`mode` enum('temporario','historico') NOT NULL DEFAULT 'historico',
	`sessionToken` varchar(128),
	`description` text,
	`confirmedCnaes` json,
	`currentStep` int NOT NULL DEFAULT 1,
	`currentStepName` varchar(64) DEFAULT 'perfil_empresa',
	`stepUpdatedAt` timestamp DEFAULT (now()),
	`stepHistory` json,
	`taxRegime` enum('simples_nacional','lucro_presumido','lucro_real'),
	`businessType` varchar(255),
	`companySize` enum('mei','micro','pequena','media','grande'),
	`questionnaireAnswers` json,
	`briefingContent` text,
	`briefingStructured` json,
	`riskMatricesData` json,
	`actionPlansData` json,
	`briefingContentV1` text,
	`briefingContentV3` text,
	`riskMatricesDataV1` json,
	`riskMatricesDataV3` json,
	`actionPlansDataV1` json,
	`actionPlansDataV3` json,
	`scoringData` json,
	`faturamentoAnual` int,
	`decisaoData` json,
	`companyProfile` json,
	`operationProfile` json,
	`taxComplexity` json,
	`financialProfile` json,
	`governanceProfile` json,
	`corporateAnswers` json,
	`operationalAnswers` json,
	`product_answers` json,
	`service_answers` json,
	`solaris_skipped_ids` text,
	`iagen_skipped_ids` text,
	`solaris_skipped_all` boolean DEFAULT false,
	`iagen_skipped_all` boolean DEFAULT false,
	`cnaeAnswers` json,
	`diagnosticStatus` json,
	`profileVersion` varchar(20) DEFAULT '1.0',
	`consistencyStatus` enum('pending','analyzing','ok','warning','blocked') DEFAULT 'pending',
	`consistencyAcceptedRiskBy` int,
	`consistencyAcceptedRiskAt` timestamp,
	`consistencyAcceptedRiskReason` varchar(500),
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaireAnswersV3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`cnaeCode` varchar(20) NOT NULL,
	`cnaeDescription` varchar(255),
	`level` enum('nivel1','nivel2') NOT NULL DEFAULT 'nivel1',
	`roundIndex` int NOT NULL DEFAULT 0,
	`questionIndex` int NOT NULL,
	`questionText` text NOT NULL,
	`questionType` varchar(50),
	`answerValue` text NOT NULL,
	`answeredAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionnaireAnswersV3_id` PRIMARY KEY(`id`)
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
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionnaireProgressV3_id` PRIMARY KEY(`id`),
	CONSTRAINT `questionnaireProgressV3_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `questionnaireQuestionsCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`cnaeCode` varchar(20) NOT NULL,
	`level` enum('nivel1','nivel2') NOT NULL DEFAULT 'nivel1',
	`roundIndex` int NOT NULL DEFAULT 0,
	`questionsJson` text NOT NULL,
	`contextNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionnaireQuestionsCache_id` PRIMARY KEY(`id`)
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
--> statement-breakpoint
CREATE TABLE `ragDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`anchor_id` varchar(255),
	`lei` enum('lc214','ec132','lc227','lc224','lc116','lc87','cg_ibs','rfb_cbs','conv_icms','lc123','resolucao_cgibs_1','resolucao_cgibs_2','resolucao_cgibs_3') NOT NULL,
	`artigo` varchar(300) NOT NULL,
	`titulo` varchar(500) NOT NULL,
	`conteudo` text NOT NULL,
	`topicos` text NOT NULL,
	`cnaeGroups` varchar(500) NOT NULL DEFAULT '',
	`chunkIndex` int NOT NULL DEFAULT 0,
	`autor` text,
	`revisado_por` text,
	`data_revisao` varchar(30),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ragDocuments_id` PRIMARY KEY(`id`),
	CONSTRAINT `ragDocuments_anchor_id_unique` UNIQUE(`anchor_id`)
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `risk_analysis_risk_id` PRIMARY KEY(`risk_id`)
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
	`vigencia_inicio` timestamp NOT NULL,
	`vigencia_fim` timestamp,
	`status` enum('ativo','sugerido','pendente_revisao','inativo','legado') NOT NULL DEFAULT 'ativo',
	`origem` enum('lei_federal','regulamentacao','rag_sensor','manual') NOT NULL,
	`escopo` enum('nacional','estadual','setorial') NOT NULL DEFAULT 'nacional',
	`sugerido_por` varchar(100),
	`aprovado_por` varchar(100),
	`aprovado_at` timestamp,
	`chunk_origem_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`allowed_domains` json,
	`allowed_gap_types` json,
	`rule_code` varchar(64),
	`descricao` text,
	CONSTRAINT `risk_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `riskMatrix` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`riskDescription` text,
	`probability` enum('muito_baixa','baixa','media','alta','muito_alta'),
	`impact` enum('muito_baixo','baixo','medio','alto','muito_alto'),
	`treatmentStrategy` text,
	`suggestedControls` text,
	`expectedEvidence` text,
	`version` int NOT NULL DEFAULT 1,
	`generatedByAI` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `riskMatrix_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `riskMatrixPromptHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`promptText` text NOT NULL,
	`previousVersion` int NOT NULL,
	`newVersion` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `riskMatrixPromptHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `riskMatrixVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`snapshotData` text NOT NULL,
	`riskCount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	`createdByName` varchar(255),
	`triggerType` enum('auto_generation','manual_regeneration','prompt_edit') NOT NULL,
	CONSTRAINT `riskMatrixVersions_id` PRIMARY KEY(`id`)
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
	`calculated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `risk_session_summary_id` PRIMARY KEY(`id`),
	CONSTRAINT `risk_session_summary_session_id_unique` UNIQUE(`session_id`)
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
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessionActionPlans_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessionBranchAnswers_id` PRIMARY KEY(`id`)
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
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessionConsolidations_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_sessionToken_unique` UNIQUE(`sessionToken`)
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
	`risk_category_code` varchar(64),
	`classification_scope` enum('risk_engine','diagnostic_only') NOT NULL DEFAULT 'risk_engine',
	`mapping_review_status` enum('curated_internal','pending_legal','approved_legal') NOT NULL DEFAULT 'curated_internal',
	CONSTRAINT `solaris_questions_id` PRIMARY KEY(`id`)
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
	`isEdited` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stepComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taskComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskComments_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taskObservers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskObservers_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compliance_usage_logs_v3_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_actions_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`requirement_code` varchar(32) NOT NULL,
	`risk_code` varchar(32) NOT NULL,
	`domain` varchar(100) NOT NULL,
	`gap_type` enum('normativo','processo','sistema','cadastro','contrato','financeiro','acessorio') NOT NULL,
	`action_code` varchar(32) NOT NULL,
	`action_name` varchar(255) NOT NULL,
	`action_desc` text NOT NULL,
	`action_type` enum('configuracao_erp','ajuste_cadastro','revisao_contrato','parametrizacao_fiscal','obrigacao_acessoria','documentacao','treinamento','integracao','governanca','conciliacao') NOT NULL,
	`action_priority` enum('imediata','curto_prazo','medio_prazo','planejamento') NOT NULL,
	`estimated_days` int NOT NULL,
	`due_date` timestamp,
	`owner_suggestion` varchar(255) NOT NULL,
	`status` enum('nao_iniciado','em_andamento','em_revisao','concluido','cancelado') NOT NULL DEFAULT 'nao_iniciado',
	`progress_percent` int NOT NULL DEFAULT 0,
	`completed_at` timestamp,
	`analysis_version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_actions_v3_id` PRIMARY KEY(`id`)
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_assessments_v3_id` PRIMARY KEY(`id`)
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
	`critical_evidence_flag` boolean NOT NULL DEFAULT false,
	`action_priority` enum('imediata','curto_prazo','medio_prazo','planejamento') NOT NULL,
	`estimated_days` int NOT NULL,
	`gap_description` text NOT NULL,
	`deterministic_reason` text NOT NULL,
	`ai_reason` text,
	`unmet_criteria` text NOT NULL,
	`recommended_actions` text NOT NULL,
	`analysis_version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_gaps_v3_id` PRIMARY KEY(`id`)
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
	`risk_category_l2` varchar(100),
	`analysis_version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_risks_v3_id` PRIMARY KEY(`id`)
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
	`critical_evidence_flag` boolean NOT NULL DEFAULT false,
	`gap_type` enum('normativo','processo','sistema','cadastro','contrato','financeiro','acessorio') NOT NULL,
	`analysis_version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_scores_v3_id` PRIMARY KEY(`id`)
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
	`is_stale` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_snapshots_v3_id` PRIMARY KEY(`id`)
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_tasks_v3_id` PRIMARY KEY(`id`)
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
	`evaluation_criteria` text NOT NULL,
	`evidence_required` text NOT NULL,
	`tags` text,
	`risk_category_code` varchar(64),
	`legal_reference` varchar(255),
	`legal_article` varchar(100),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regulatory_requirements_v3_id` PRIMARY KEY(`id`),
	CONSTRAINT `regulatory_requirements_v3_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `iagen_answers` ADD CONSTRAINT `iagen_answers_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_status_log` ADD CONSTRAINT `project_status_log_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solaris_answers` ADD CONSTRAINT `solaris_answers_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solaris_answers` ADD CONSTRAINT `solaris_answers_question_id_solaris_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `solaris_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_m1_runner_logs_project` ON `m1_runner_logs` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_m1_runner_logs_status` ON `m1_runner_logs` (`status_arquetipo`);--> statement-breakpoint
CREATE INDEX `idx_m1_runner_logs_created` ON `m1_runner_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_m1_runner_logs_user` ON `m1_runner_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_project_status_log_project_id` ON `project_status_log` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_rag_usage_anchor` ON `rag_usage_log` (`anchor_id`);--> statement-breakpoint
CREATE INDEX `idx_rag_usage_query` ON `rag_usage_log` (`query`);--> statement-breakpoint
CREATE INDEX `idx_rag_usage_time` ON `rag_usage_log` (`retrieved_at`);--> statement-breakpoint
CREATE INDEX `idx_risk_categories_codigo` ON `risk_categories` (`codigo`);--> statement-breakpoint
CREATE INDEX `idx_risk_categories_status` ON `risk_categories` (`status`);--> statement-breakpoint
CREATE INDEX `idx_risk_categories_origem` ON `risk_categories` (`origem`);