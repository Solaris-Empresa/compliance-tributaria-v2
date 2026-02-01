CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`projectId` int NOT NULL,
	`entityType` enum('task','comment','corporate_assessment','branch_assessment','project','permission') NOT NULL,
	`entityId` int NOT NULL,
	`action` enum('create','update','delete','status_change') NOT NULL,
	`changes` json,
	`metadata` json,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
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
