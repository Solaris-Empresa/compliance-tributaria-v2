CREATE TABLE `onboardingProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentStep` int NOT NULL DEFAULT 0,
	`completedSteps` varchar(500) NOT NULL DEFAULT '',
	`skipped` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboardingProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `onboardingProgress_userId_unique` UNIQUE(`userId`)
);
