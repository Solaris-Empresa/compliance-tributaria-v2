CREATE TABLE `cnaeEmbeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cnaeCode` varchar(20) NOT NULL,
	`cnaeDescription` text NOT NULL,
	`embeddingJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cnaeEmbeddings_id` PRIMARY KEY(`id`),
	CONSTRAINT `cnaeEmbeddings_cnaeCode_unique` UNIQUE(`cnaeCode`)
);
