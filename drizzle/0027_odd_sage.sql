CREATE TABLE `ragDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lei` enum('lc214','ec132','lc227','lc116','lc87') NOT NULL,
	`artigo` varchar(20) NOT NULL,
	`titulo` varchar(500) NOT NULL,
	`conteudo` text NOT NULL,
	`topicos` text NOT NULL,
	`cnaeGroups` varchar(500) NOT NULL DEFAULT '',
	`chunkIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ragDocuments_id` PRIMARY KEY(`id`)
);
