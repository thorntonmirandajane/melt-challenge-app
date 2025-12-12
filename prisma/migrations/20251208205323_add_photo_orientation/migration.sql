/*
  Warnings:

  - Added the required column `orientation` to the `Photo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Photo" ADD COLUMN "orientation" TEXT NOT NULL DEFAULT 'FRONT';

-- Remove default after adding the column
ALTER TABLE "Photo" ALTER COLUMN "orientation" DROP DEFAULT;
