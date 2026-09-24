/*
  Warnings:

  - Made the column `shareToken` on table `tracks` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "tracks" ALTER COLUMN "shareToken" SET NOT NULL;
