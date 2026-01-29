CREATE TABLE `action_plan_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`businessType` varchar(255) NOT NULL,
	`taxRegime` varchar(100),
	`companySize` varchar(50),
	`templateData` text NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `action_plan_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `action_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`templateId` int,
	`planData` text NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`generatedBy` int NOT NULL,
	`approvedAt` timestamp,
	`approvedBy` int,
	CONSTRAINT `action_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `action_plans_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `assessment_phase1` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`taxRegime` enum('simples_nacional','lucro_presumido','lucro_real','mei') NOT NULL,
	`businessType` varchar(255) NOT NULL,
	`companySize` enum('mei','micro','pequena','media','grande') NOT NULL,
	`annualRevenue` decimal(15,2),
	`employeeCount` int,
	`hasInternationalOperations` boolean NOT NULL DEFAULT false,
	`mainActivity` text,
	`stateOperations` text,
	`completedAt` timestamp,
	`completedBy` int,
	CONSTRAINT `assessment_phase1_id` PRIMARY KEY(`id`),
	CONSTRAINT `assessment_phase1_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `assessment_phase2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`generatedQuestions` text NOT NULL,
	`answers` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`completedBy` int,
	CONSTRAINT `assessment_phase2_id` PRIMARY KEY(`id`),
	CONSTRAINT `assessment_phase2_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `briefings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`summaryText` text NOT NULL,
	`gapsAnalysis` text NOT NULL,
	`riskLevel` enum('low','medium','high','critical') NOT NULL,
	`priorityAreas` text NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`generatedBy` int NOT NULL,
	CONSTRAINT `briefings_id` PRIMARY KEY(`id`),
	CONSTRAINT `briefings_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `coso_controls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`category` enum('control_environment','risk_assessment','control_activities','information_communication','monitoring') NOT NULL,
	`controlName` varchar(255) NOT NULL,
	`description` text,
	`status` enum('not_started','in_progress','implemented','validated') NOT NULL DEFAULT 'not_started',
	`riskLevel` enum('low','medium','high','critical') NOT NULL,
	`responsibleUserId` int,
	`implementationDate` date,
	`validationDate` date,
	`notes` text,
	CONSTRAINT `coso_controls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`targetDate` date NOT NULL,
	`completedAt` timestamp,
	`status` enum('pending','completed','delayed') NOT NULL DEFAULT 'pending',
	`notifyOnComplete` boolean NOT NULL DEFAULT true,
	CONSTRAINT `milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('task_assigned','task_overdue','sprint_start','sprint_end','milestone_reached','daily_summary','weekly_summary') NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	`emailSent` boolean NOT NULL DEFAULT false,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('product_owner','scrum_master','team_member','observer') NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`removedAt` timestamp,
	CONSTRAINT `project_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`clientId` int NOT NULL,
	`status` enum('draft','assessment_phase1','assessment_phase2','briefing','planning','execution','completed','archived') NOT NULL DEFAULT 'draft',
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	`notificationFrequency` enum('daily','weekly','on_delay','milestones','custom') NOT NULL DEFAULT 'weekly',
	`customNotificationDays` text,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`goal` text,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`status` enum('planned','active','completed','cancelled') NOT NULL DEFAULT 'planned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sprints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sprintId` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`taskType` enum('compliance','documentation','training','system','review','other') NOT NULL DEFAULT 'other',
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('backlog','todo','in_progress','review','done','blocked') NOT NULL DEFAULT 'backlog',
	`assignedTo` int,
	`estimatedHours` decimal(5,1),
	`actualHours` decimal(5,1),
	`dueDate` date,
	`completedAt` timestamp,
	`blockedReason` text,
	`dependsOn` text,
	`cosoFramework` enum('control_environment','risk_assessment','control_activities','information_communication','monitoring'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','client','team_member') NOT NULL DEFAULT 'client';--> statement-breakpoint
ALTER TABLE `users` ADD `companyName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);