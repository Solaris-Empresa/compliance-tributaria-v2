ALTER TABLE `projects` MODIFY COLUMN `status` enum('rascunho','consistencia_pendente','cnaes_confirmados','assessment_fase1','assessment_fase2','diagnostico_corporativo','diagnostico_operacional','diagnostico_cnae','briefing','riscos','plano','dashboard','matriz_riscos','plano_acao','em_avaliacao','aprovado','em_andamento','concluido','arquivado') NOT NULL DEFAULT 'rascunho';--> statement-breakpoint
ALTER TABLE `ragDocuments` MODIFY COLUMN `artigo` varchar(300) NOT NULL;--> statement-breakpoint
ALTER TABLE `ragDocuments` ADD `anchor_id` varchar(255);--> statement-breakpoint
ALTER TABLE `ragDocuments` ADD `autor` text;--> statement-breakpoint
ALTER TABLE `ragDocuments` ADD `revisado_por` text;--> statement-breakpoint
ALTER TABLE `ragDocuments` ADD `data_revisao` varchar(30);--> statement-breakpoint
ALTER TABLE `ragDocuments` ADD CONSTRAINT `ragDocuments_anchor_id_unique` UNIQUE(`anchor_id`);
