CREATE TABLE `iagen_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`question_text` text NOT NULL,
	`resposta` text NOT NULL,
	`confidence_score` decimal(3,2),
	`fonte` varchar(20) DEFAULT 'ia_gen',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `iagen_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `solaris_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`question_id` int NOT NULL,
	`codigo` varchar(10) NOT NULL,
	`resposta` text NOT NULL,
	`fonte` varchar(20) DEFAULT 'solaris',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `solaris_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `status` enum('rascunho','consistencia_pendente','cnaes_confirmados','assessment_fase1','assessment_fase2','onda1_solaris','onda2_iagen','diagnostico_corporativo','diagnostico_operacional','diagnostico_cnae','briefing','riscos','plano','dashboard','matriz_riscos','plano_acao','em_avaliacao','aprovado','em_andamento','concluido','arquivado') NOT NULL DEFAULT 'rascunho';--> statement-breakpoint
ALTER TABLE `solaris_questions` ADD `codigo` varchar(10);--> statement-breakpoint
ALTER TABLE `iagen_answers` ADD CONSTRAINT `iagen_answers_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solaris_answers` ADD CONSTRAINT `solaris_answers_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solaris_answers` ADD CONSTRAINT `solaris_answers_question_id_solaris_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `solaris_questions`(`id`) ON DELETE no action ON UPDATE no action;