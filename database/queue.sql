-- ISPSC Queue schema
-- Run after Laravel's users table has been created.
-- MySQL 8+, InnoDB, utf8mb4.
-- This direct script is for SQL deployment; use Laravel migrations instead when available.

CREATE DATABASE IF NOT EXISTS `queue_db`
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE `queue_db`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

SET @role_sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE `users` ADD COLUMN `role` varchar(20) NOT NULL DEFAULT ''staff''',
        'SELECT 1'
    )
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'role'
);
PREPARE role_statement FROM @role_sql;
EXECUTE role_statement;
DEALLOCATE PREPARE role_statement;

CREATE TABLE IF NOT EXISTS `queue_services` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `code` varchar(30) NOT NULL,
    `name` varchar(255) NOT NULL,
    `description` text DEFAULT NULL,
    `prefix` varchar(8) NOT NULL,
    `is_active` tinyint(1) NOT NULL DEFAULT 1,
    `sort_order` smallint unsigned NOT NULL DEFAULT 0,
    `created_at` timestamp NULL DEFAULT NULL,
    `updated_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `queue_services_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `service_windows` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `code` varchar(30) NOT NULL,
    `name` varchar(255) NOT NULL,
    `is_active` tinyint(1) NOT NULL DEFAULT 1,
    `assigned_user_id` bigint unsigned DEFAULT NULL,
    `created_at` timestamp NULL DEFAULT NULL,
    `updated_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `service_windows_code_unique` (`code`),
    KEY `service_windows_assigned_user_id_foreign` (`assigned_user_id`),
    CONSTRAINT `service_windows_assigned_user_id_foreign`
        FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `queue_tickets` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `queue_service_id` bigint unsigned DEFAULT NULL,
    `service_window_id` bigint unsigned DEFAULT NULL,
    `served_by` bigint unsigned DEFAULT NULL,
    `student_number` varchar(40) DEFAULT NULL,
    `queue_date` date NOT NULL,
    `number` int unsigned NOT NULL,
    `status` varchar(20) NOT NULL DEFAULT 'waiting',
    `called_at` timestamp NULL DEFAULT NULL,
    `serving_at` timestamp NULL DEFAULT NULL,
    `completed_at` timestamp NULL DEFAULT NULL,
    `skipped_at` timestamp NULL DEFAULT NULL,
    `created_at` timestamp NULL DEFAULT NULL,
    `updated_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `queue_tickets_queue_service_id_queue_date_number_unique`
        (`queue_service_id`, `queue_date`, `number`),
    KEY `queue_tickets_queue_service_id_queue_date_status_index`
        (`queue_service_id`, `queue_date`, `status`),
    KEY `queue_tickets_service_window_id_queue_date_status_index`
        (`service_window_id`, `queue_date`, `status`),
    KEY `queue_tickets_student_date_status_index`
        (`student_number`, `queue_date`, `status`),
    KEY `queue_tickets_served_by_foreign` (`served_by`),
    CONSTRAINT `queue_tickets_queue_service_id_foreign`
        FOREIGN KEY (`queue_service_id`) REFERENCES `queue_services` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `queue_tickets_service_window_id_foreign`
        FOREIGN KEY (`service_window_id`) REFERENCES `service_windows` (`id`)
        ON DELETE SET NULL,
    CONSTRAINT `queue_tickets_served_by_foreign`
        FOREIGN KEY (`served_by`) REFERENCES `users` (`id`)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `service_windows` (`code`, `name`, `is_active`, `created_at`, `updated_at`)
VALUES
    ('window-1', 'Window 1', 1, NOW(), NOW()),
    ('window-2', 'Window 2', 1, NOW(), NOW()),
    ('window-3', 'Window 3', 1, NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;
