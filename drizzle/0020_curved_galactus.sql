CREATE TABLE `questionnaireAnswersV3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`cnaeCode` varchar(20) NOT NULL,
	`cnaeDescription` varchar(255),
	`level` enum('nivel1','nivel2') NOT NULL DEFAULT 'nivel1',
	`questionIndex` int NOT NULL,
	`questionText` text NOT NULL,
	`questionType` varchar(50),
	`answerValue` text NOT NULL,
	`answeredAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionnaireAnswersV3_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaireProgressV3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`currentCnaeIndex` int NOT NULL DEFAULT 0,
	`currentLevel` enum('nivel1','nivel2') NOT NULL DEFAULT 'nivel1',
	`completedCnaes` json,
	`level2Decisions` json,
	`status` enum('em_andamento','concluido') NOT NULL DEFAULT 'em_andamento',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionnaireProgressV3_id` PRIMARY KEY(`id`),
	CONSTRAINT `questionnaireProgressV3_projectId_unique` UNIQUE(`projectId`)
);
