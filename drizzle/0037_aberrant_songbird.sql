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
