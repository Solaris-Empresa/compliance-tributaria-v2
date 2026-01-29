ALTER TABLE `assessmentPhase1` MODIFY COLUMN `hasAccountingDept` varchar(10);--> statement-breakpoint
ALTER TABLE `assessmentPhase1` ADD `businessSector` varchar(100);--> statement-breakpoint
ALTER TABLE `assessmentPhase1` ADD `currentERPSystem` varchar(100);--> statement-breakpoint
ALTER TABLE `assessmentPhase1` ADD `mainChallenges` text;--> statement-breakpoint
ALTER TABLE `assessmentPhase1` ADD `complianceGoals` text;--> statement-breakpoint
ALTER TABLE `assessmentPhase1` DROP COLUMN `businessType`;