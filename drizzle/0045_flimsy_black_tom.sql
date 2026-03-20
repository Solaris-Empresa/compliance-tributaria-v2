CREATE TABLE `risk_analysis` (
	`risk_id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`canonical_id` varchar(50) NOT NULL,
	`mapping_id` varchar(50) NOT NULL,
	`gap_status` enum('compliant','nao_compliant','parcial','nao_aplicavel') NOT NULL,
	`risk_level` enum('baixo','medio','alto','critico') NOT NULL,
	`risk_score` int NOT NULL DEFAULT 0,
	`impact_type` enum('financeiro','operacional','legal','reputacional') NOT NULL,
	`severity_base` enum('critica','alta','media','baixa') NOT NULL,
	`normative_type` enum('obrigacao','vedacao','direito','opcao') NOT NULL,
	`gap_multiplier` varchar(10) NOT NULL DEFAULT '0',
	`base_score` int NOT NULL DEFAULT 0,
	`domain` varchar(100),
	`requirement_name` varchar(255),
	`mitigation_priority` enum('imediata','curto_prazo','medio_prazo','monitoramento') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `risk_analysis_risk_id` PRIMARY KEY(`risk_id`)
);
--> statement-breakpoint
CREATE TABLE `risk_session_summary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`total_risk_score` int NOT NULL DEFAULT 0,
	`avg_risk_score` int NOT NULL DEFAULT 0,
	`max_risk_score` int NOT NULL DEFAULT 0,
	`critical_count` int NOT NULL DEFAULT 0,
	`alto_count` int NOT NULL DEFAULT 0,
	`medio_count` int NOT NULL DEFAULT 0,
	`baixo_count` int NOT NULL DEFAULT 0,
	`financial_risk` int NOT NULL DEFAULT 0,
	`operational_risk` int NOT NULL DEFAULT 0,
	`legal_risk` int NOT NULL DEFAULT 0,
	`overall_risk_level` enum('baixo','medio','alto','critico') NOT NULL,
	`calculated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `risk_session_summary_id` PRIMARY KEY(`id`),
	CONSTRAINT `risk_session_summary_session_id_unique` UNIQUE(`session_id`)
);
