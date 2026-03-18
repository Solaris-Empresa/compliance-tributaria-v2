CREATE TABLE `questionnaireQuestionsCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`cnaeCode` varchar(20) NOT NULL,
	`level` enum('nivel1','nivel2') NOT NULL DEFAULT 'nivel1',
	`roundIndex` int NOT NULL DEFAULT 0,
	`questionsJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionnaireQuestionsCache_id` PRIMARY KEY(`id`)
);
