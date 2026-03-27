CREATE TABLE `solaris_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`texto` text NOT NULL,
	`categoria` varchar(100) NOT NULL,
	`cnae_groups` json,
	`obrigatorio` tinyint NOT NULL DEFAULT 1,
	`ativo` tinyint NOT NULL DEFAULT 1,
	`observacao` text,
	`fonte` varchar(20) NOT NULL DEFAULT 'solaris',
	`criado_por_id` int,
	`criado_em` bigint NOT NULL,
	`atualizado_em` bigint,
	`upload_batch_id` varchar(64),
	CONSTRAINT `solaris_questions_id` PRIMARY KEY(`id`)
);
