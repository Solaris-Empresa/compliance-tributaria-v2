CREATE TABLE `rag_usage_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`query` text NOT NULL,
	`anchor_id` varchar(255) NOT NULL,
	`lei` varchar(20),
	`score` decimal(6,4),
	`position` int,
	`retrieved_at` timestamp NOT NULL DEFAULT (now()),
	`source` varchar(20) DEFAULT 'rag',
	`project_id` int,
	`session_id` varchar(50),
	CONSTRAINT `rag_usage_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_rag_usage_anchor` ON `rag_usage_log` (`anchor_id`);--> statement-breakpoint
CREATE INDEX `idx_rag_usage_query` ON `rag_usage_log` (`query`);--> statement-breakpoint
CREATE INDEX `idx_rag_usage_time` ON `rag_usage_log` (`retrieved_at`);