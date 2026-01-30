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
