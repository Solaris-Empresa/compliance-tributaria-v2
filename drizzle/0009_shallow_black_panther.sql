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
