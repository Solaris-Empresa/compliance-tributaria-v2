-- Sprint L — DEC-002: 4 campos de enriquecimento para Upload CSV Onda 1 SOLARIS
-- Todos nullable — sem NOT NULL, sem DEFAULT
ALTER TABLE `solaris_questions` ADD `titulo` varchar(255);--> statement-breakpoint
ALTER TABLE `solaris_questions` ADD `topicos` text;--> statement-breakpoint
ALTER TABLE `solaris_questions` ADD `severidade_base` varchar(20);--> statement-breakpoint
ALTER TABLE `solaris_questions` ADD `vigencia_inicio` varchar(10);