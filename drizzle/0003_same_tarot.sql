ALTER TABLE `projects` ADD `taxRegime` enum('simples_nacional','lucro_presumido','lucro_real');--> statement-breakpoint
ALTER TABLE `projects` ADD `businessType` varchar(255);--> statement-breakpoint
ALTER TABLE `projects` ADD `companySize` enum('mei','micro','pequena','media','grande');