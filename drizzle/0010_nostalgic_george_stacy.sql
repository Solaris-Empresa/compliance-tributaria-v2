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
