-- AlterTable
ALTER TABLE `users` ADD COLUMN `department_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `approval_flows` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_type` ENUM('PURCHASE_REQUEST') NOT NULL,
    `department_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `approval_flows_document_type_department_id_key`(`document_type`, `department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_flow_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `flow_id` INTEGER NOT NULL,
    `step_order` INTEGER NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `approver_id` INTEGER NOT NULL,

    UNIQUE INDEX `approval_flow_steps_flow_id_step_order_key`(`flow_id`, `step_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_approvals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_type` ENUM('PURCHASE_REQUEST') NOT NULL,
    `document_id` INTEGER NOT NULL,
    `round` INTEGER NOT NULL,
    `step_order` INTEGER NOT NULL,
    `step_name` VARCHAR(50) NOT NULL,
    `approver_id` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `acted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `document_approvals_document_type_document_id_idx`(`document_type`, `document_id`),
    INDEX `document_approvals_approver_id_status_idx`(`approver_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_sequences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_type` ENUM('PURCHASE_REQUEST') NOT NULL,
    `department_id` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `last_number` INTEGER NOT NULL,

    UNIQUE INDEX `document_sequences_document_type_department_id_year_key`(`document_type`, `department_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `number` VARCHAR(50) NULL,
    `request_date` DATE NOT NULL,
    `department_id` INTEGER NOT NULL,
    `tehai_hyou_no` VARCHAR(50) NULL,
    `status` ENUM('DRAFT', 'IN_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `round` INTEGER NOT NULL DEFAULT 0,
    `current_step` INTEGER NULL,
    `created_by` INTEGER NOT NULL,
    `submitted_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchase_requests_number_key`(`number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_request_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchase_request_id` INTEGER NOT NULL,
    `line_no` INTEGER NOT NULL,
    `machine_item_id` INTEGER NULL,
    `machine` VARCHAR(255) NULL,
    `account_code` VARCHAR(30) NOT NULL,
    `item_id` INTEGER NULL,
    `item_code` VARCHAR(30) NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(15, 2) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `usage_date` DATE NULL,
    `is_urgent` BOOLEAN NOT NULL DEFAULT false,
    `remarks` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_flows` ADD CONSTRAINT `approval_flows_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_flow_steps` ADD CONSTRAINT `approval_flow_steps_flow_id_fkey` FOREIGN KEY (`flow_id`) REFERENCES `approval_flows`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_flow_steps` ADD CONSTRAINT `approval_flow_steps_approver_id_fkey` FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_approvals` ADD CONSTRAINT `document_approvals_approver_id_fkey` FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_machine_item_id_fkey` FOREIGN KEY (`machine_item_id`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
