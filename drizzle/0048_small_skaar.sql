ALTER TABLE `projects` ADD `profileCompleteness` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `projects` ADD `profileConfidence` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `projects` ADD `profileIntelligenceData` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `profileLastAnalyzedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `profileVersion` varchar(20) DEFAULT '1.0';--> statement-breakpoint
ALTER TABLE `projects` ADD `consistencyStatus` enum('pending','analyzing','ok','warning','blocked') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `projects` ADD `consistencyAcceptedRiskBy` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `consistencyAcceptedRiskAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `consistencyAcceptedRiskReason` varchar(500);