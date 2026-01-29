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
CREATE TABLE `actionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`planData` text NOT NULL,
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
CREATE TABLE `assessmentPhase1` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`taxRegime` enum('simples_nacional','lucro_presumido','lucro_real','mei') NOT NULL,
	`businessType` varchar(100) NOT NULL,
	`companySize` enum('mei','pequena','media','grande') NOT NULL,
	`annualRevenue` decimal(15,2),
	`employeeCount` int,
	`hasAccountingDept` boolean DEFAULT false,
	`mainActivity` text,
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
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`clientId` int NOT NULL,
	`status` enum('rascunho','assessment_fase1','assessment_fase2','matriz_riscos','plano_acao','em_avaliacao','aprovado','em_andamento','parado','concluido','arquivado') NOT NULL DEFAULT 'rascunho',
	`planPeriodMonths` int,
	`createdById` int NOT NULL,
	`createdByRole` enum('cliente','equipe_solaris') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	`notificationFrequency` enum('diaria','semanal','apenas_atrasos','marcos_importantes','personalizada') NOT NULL DEFAULT 'semanal',
	`notificationEmail` varchar(320),
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `riskMatrix` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`riskDescription` text NOT NULL,
	`probability` enum('muito_baixa','baixa','media','alta','muito_alta') NOT NULL,
	`impact` enum('muito_baixo','baixo','medio','alto','muito_alto') NOT NULL,
	`treatmentStrategy` text,
	`suggestedControls` text,
	`expectedEvidence` text,
	`version` int NOT NULL DEFAULT 1,
	`generatedByAI` boolean NOT NULL DEFAULT true,
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
CREATE TABLE `taskComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`phaseId` int,
	`riskId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pendencias','a_fazer','em_andamento','concluido') NOT NULL DEFAULT 'pendencias',
	`priority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`assignedTo` int,
	`estimatedHours` int,
	`actualHours` int,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('cliente','equipe_solaris','advogado_senior') NOT NULL DEFAULT 'cliente',
	`companyName` varchar(255),
	`cnpj` varchar(18),
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
