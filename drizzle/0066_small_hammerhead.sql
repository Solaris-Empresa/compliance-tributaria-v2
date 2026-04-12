ALTER TABLE `ragDocuments` MODIFY COLUMN `lei` enum('lc214','ec132','lc227','lc224','lc116','lc87','cg_ibs','rfb_cbs','conv_icms','lc123','resolucao_cgibs_1','resolucao_cgibs_2','resolucao_cgibs_3') NOT NULL;--> statement-breakpoint
ALTER TABLE `risk_categories` ADD `descricao` text;--> statement-breakpoint
ALTER TABLE `regulatory_requirements_v3` ADD `risk_category_code` varchar(64);