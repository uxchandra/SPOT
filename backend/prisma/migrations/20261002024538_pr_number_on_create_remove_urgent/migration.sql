/*
  Warnings:

  - You are about to drop the column `is_urgent` on the `purchase_request_items` table. All the data in the column will be lost.
  - Made the column `usage_date` on table `purchase_request_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `number` on table `purchase_requests` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `purchase_request_items` DROP COLUMN `is_urgent`,
    MODIFY `usage_date` DATE NOT NULL;

-- AlterTable
ALTER TABLE `purchase_requests` MODIFY `number` VARCHAR(50) NOT NULL,
    MODIFY `status` ENUM('DRAFT', 'IN_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT';
