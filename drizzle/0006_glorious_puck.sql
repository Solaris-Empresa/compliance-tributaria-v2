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
