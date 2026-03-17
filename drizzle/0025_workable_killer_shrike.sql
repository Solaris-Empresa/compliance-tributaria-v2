CREATE TABLE `stepComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`step` enum('briefing','matrizes','plano_acao') NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`userRole` enum('cliente','equipe_solaris','advogado_senior','advogado_junior') NOT NULL,
	`content` text NOT NULL,
	`isEdited` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stepComments_id` PRIMARY KEY(`id`)
);
