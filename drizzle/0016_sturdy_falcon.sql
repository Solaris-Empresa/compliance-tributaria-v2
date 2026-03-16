CREATE TABLE `sessionBranchAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(128),
	`projectId` int,
	`branchCode` varchar(20) NOT NULL,
	`branchName` varchar(100) NOT NULL,
	`generatedQuestions` json,
	`answers` json,
	`status` enum('pendente','em_andamento','concluido') NOT NULL DEFAULT 'pendente',
	`aiAnalysis` text,
	`riskLevel` enum('baixo','medio','alto','critico'),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessionBranchAnswers_id` PRIMARY KEY(`id`)
);
