CREATE TABLE `clientMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`memberRole` enum('admin','colaborador','visualizador') NOT NULL DEFAULT 'colaborador',
	`active` boolean NOT NULL DEFAULT true,
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientMembers_id` PRIMARY KEY(`id`)
);
