ALTER TABLE `riskMatrix` MODIFY COLUMN `riskDescription` text;--> statement-breakpoint
ALTER TABLE `riskMatrix` MODIFY COLUMN `probability` enum('muito_baixa','baixa','media','alta','muito_alta');--> statement-breakpoint
ALTER TABLE `riskMatrix` MODIFY COLUMN `impact` enum('muito_baixo','baixo','medio','alto','muito_alto');--> statement-breakpoint
ALTER TABLE `riskMatrix` MODIFY COLUMN `generatedByAI` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `riskMatrix` ADD `title` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `riskMatrix` ADD `description` text;