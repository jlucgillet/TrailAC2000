/*
  Warnings:

  - Made the column `gpxShareToken` on table `races` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "races" ALTER COLUMN "gpxShareToken" SET NOT NULL;
