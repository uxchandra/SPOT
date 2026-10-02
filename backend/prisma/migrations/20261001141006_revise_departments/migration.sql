/*
  Warnings:

  - You are about to drop the column `is_active` on the `departments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `departments` DROP COLUMN `is_active`,
    ADD COLUMN `position` VARCHAR(100) NULL,
    ADD COLUMN `user_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
