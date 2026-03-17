CREATE TABLE `taskHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`taskId` varchar(100) NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`eventType` enum('criacao','status','responsavel','prazo','progresso','titulo','prioridade','notificacao','comentario') NOT NULL,
	`field` varchar(100),
	`oldValue` text,
	`newValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskHistory_id` PRIMARY KEY(`id`)
);
