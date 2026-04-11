ALTER TABLE `iagen_answers` ADD `risk_category_code` varchar(64);--> statement-breakpoint
ALTER TABLE `iagen_answers` ADD `category_assignment_mode` enum('llm_assigned','human_validated');--> statement-breakpoint
ALTER TABLE `iagen_answers` ADD `used_profile_fields` json;--> statement-breakpoint
ALTER TABLE `iagen_answers` ADD `prompt_version` varchar(20);--> statement-breakpoint
ALTER TABLE `solaris_questions` ADD `risk_category_code` varchar(64);--> statement-breakpoint
ALTER TABLE `solaris_questions` ADD `classification_scope` enum('risk_engine','diagnostic_only') DEFAULT 'risk_engine' NOT NULL;--> statement-breakpoint
ALTER TABLE `solaris_questions` ADD `mapping_review_status` enum('curated_internal','pending_legal','approved_legal') DEFAULT 'curated_internal' NOT NULL;