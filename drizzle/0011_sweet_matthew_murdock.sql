CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskCreated` boolean NOT NULL DEFAULT true,
	`taskStarted` boolean NOT NULL DEFAULT true,
	`taskDueSoon` boolean NOT NULL DEFAULT true,
	`taskOverdue` boolean NOT NULL DEFAULT true,
	`taskCompleted` boolean NOT NULL DEFAULT false,
	`taskCommented` boolean NOT NULL DEFAULT true,
	`emailEnabled` boolean NOT NULL DEFAULT true,
	`inAppEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notificationPreferences_userId_unique` UNIQUE(`userId`)
);
