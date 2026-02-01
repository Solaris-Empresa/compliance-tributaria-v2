CREATE TABLE `planApprovals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planType` enum('corporate','branch') NOT NULL,
	`planId` int NOT NULL,
	`projectId` int NOT NULL,
	`status` enum('pending','approved','rejected','needs_revision') NOT NULL DEFAULT 'pending',
	`requestedBy` int NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewComments` text,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `planApprovals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`approvalId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`comment` text NOT NULL,
	`reviewType` enum('comment','suggestion','concern','approval') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `planReviews_id` PRIMARY KEY(`id`)
);
