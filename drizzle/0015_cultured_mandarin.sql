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
ALTER TABLE `projectBranches` ADD `branchStatus` enum('pendente','questionario_em_andamento','questionario_concluido','plano_gerado','plano_aprovado','riscos_gerados','concluido') DEFAULT 'pendente' NOT NULL;--> statement-breakpoint
ALTER TABLE `projectBranches` ADD `questionnaireDepth` enum('sintetico','abrangente') DEFAULT 'sintetico';--> statement-breakpoint
ALTER TABLE `projectBranches` ADD `order` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `projectBranches` ADD `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `projects` ADD `mode` enum('temporario','historico') DEFAULT 'historico' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `sessionToken` varchar(128);