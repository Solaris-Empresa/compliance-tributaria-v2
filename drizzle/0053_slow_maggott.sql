CREATE TABLE `diagnostic_shadow_divergences` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`project_id` bigint NOT NULL,
	`flow_version` varchar(20) NOT NULL,
	`field_name` varchar(50) NOT NULL,
	`legacy_source_column` varchar(100),
	`new_source_column` varchar(100),
	`legacy_value_json` json,
	`new_value_json` json,
	`reason` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diagnostic_shadow_divergences_id` PRIMARY KEY(`id`)
);
