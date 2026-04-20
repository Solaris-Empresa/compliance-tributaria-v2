DROP TABLE `cpie_analysis_history`;--> statement-breakpoint
DROP TABLE `cpie_settings`;--> statement-breakpoint
ALTER TABLE `projects` DROP COLUMN `profileCompleteness`;--> statement-breakpoint
ALTER TABLE `projects` DROP COLUMN `profileConfidence`;--> statement-breakpoint
ALTER TABLE `projects` DROP COLUMN `profileIntelligenceData`;--> statement-breakpoint
ALTER TABLE `projects` DROP COLUMN `profileLastAnalyzedAt`;