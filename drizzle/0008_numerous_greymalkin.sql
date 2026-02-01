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
CREATE TABLE `projectBranches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`branchId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectBranches_id` PRIMARY KEY(`id`)
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
DROP TABLE `tasks`;