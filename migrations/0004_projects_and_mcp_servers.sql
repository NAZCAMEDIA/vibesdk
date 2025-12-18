-- Migration: Add projects and mcp_servers tables
-- Created: 2025-12-18

-- ========================================
-- PROJECTS TABLE
-- ========================================

CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `projects_user_idx` ON `projects` (`user_id`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `projects_name_idx` ON `projects` (`name`);--> statement-breakpoint

-- ========================================
-- PROJECT_APPS JUNCTION TABLE
-- ========================================

CREATE TABLE `project_apps` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`app_id` text NOT NULL,
	`added_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_apps_project_app_idx` ON `project_apps` (`project_id`,`app_id`);--> statement-breakpoint
CREATE INDEX `project_apps_project_idx` ON `project_apps` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_apps_app_idx` ON `project_apps` (`app_id`);--> statement-breakpoint

-- ========================================
-- MCP_SERVERS TABLE
-- ========================================

CREATE TABLE `mcp_servers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`transport` text DEFAULT 'http' NOT NULL,
	`auth_type` text DEFAULT 'none' NOT NULL,
	`auth_secret_id` text,
	`enabled` integer DEFAULT true,
	`status` text DEFAULT 'unknown' NOT NULL,
	`last_checked` integer,
	`last_error` text,
	`description` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`auth_secret_id`) REFERENCES `user_secrets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `mcp_servers_user_idx` ON `mcp_servers` (`user_id`);--> statement-breakpoint
CREATE INDEX `mcp_servers_enabled_idx` ON `mcp_servers` (`enabled`);--> statement-breakpoint
CREATE INDEX `mcp_servers_status_idx` ON `mcp_servers` (`status`);
