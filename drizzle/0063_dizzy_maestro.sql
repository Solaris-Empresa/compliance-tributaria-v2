CREATE TABLE `risk_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(64) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`severidade` enum('alta','media','oportunidade') NOT NULL,
	`urgencia` enum('imediata','curto_prazo','medio_prazo') NOT NULL,
	`tipo` enum('risk','opportunity') NOT NULL,
	`artigo_base` varchar(255) NOT NULL,
	`lei_codigo` varchar(64) NOT NULL,
	`vigencia_inicio` timestamp NOT NULL,
	`vigencia_fim` timestamp,
	`status` enum('ativo','sugerido','pendente_revisao','inativo','legado') NOT NULL DEFAULT 'ativo',
	`origem` enum('lei_federal','regulamentacao','rag_sensor','manual') NOT NULL,
	`escopo` enum('nacional','estadual','setorial') NOT NULL DEFAULT 'nacional',
	`sugerido_por` varchar(100),
	`aprovado_por` varchar(100),
	`aprovado_at` timestamp,
	`chunk_origem_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`allowed_domains` json,
	`allowed_gap_types` json,
	`rule_code` varchar(64),
	CONSTRAINT `risk_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_risk_categories_codigo` ON `risk_categories` (`codigo`);--> statement-breakpoint
CREATE INDEX `idx_risk_categories_status` ON `risk_categories` (`status`);--> statement-breakpoint
CREATE INDEX `idx_risk_categories_origem` ON `risk_categories` (`origem`);