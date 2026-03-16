CREATE TABLE `sessionActionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(128) NOT NULL,
	`planItems` json,
	`executiveSummary` text,
	`overallRiskLevel` enum('baixo','medio','alto','critico'),
	`complianceScore` int,
	`status` enum('gerando','gerado','aprovado','em_execucao') NOT NULL DEFAULT 'gerando',
	`totalActions` int DEFAULT 0,
	`criticalActions` int DEFAULT 0,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessionActionPlans_id` PRIMARY KEY(`id`)
);
