ALTER TABLE `projects` MODIFY COLUMN `status` enum('rascunho','consistencia_pendente','cnaes_confirmados','perfil_entidade_confirmado','assessment_fase1','assessment_fase2','onda1_solaris','onda2_iagen','diagnostico_corporativo','diagnostico_operacional','q_produto','q_servico','diagnostico_cnae','briefing','riscos','plano','dashboard','matriz_riscos','plano_acao','em_avaliacao','aprovado','em_andamento','concluido','arquivado') NOT NULL DEFAULT 'rascunho';--> statement-breakpoint
ALTER TABLE `projects` ADD `archetype` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `archetypeVersion` varchar(20);--> statement-breakpoint
ALTER TABLE `projects` ADD `archetypePerfilHash` varchar(64);--> statement-breakpoint
ALTER TABLE `projects` ADD `archetypeRulesHash` varchar(64);--> statement-breakpoint
ALTER TABLE `projects` ADD `archetypeConfirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `archetypeConfirmedBy` int;