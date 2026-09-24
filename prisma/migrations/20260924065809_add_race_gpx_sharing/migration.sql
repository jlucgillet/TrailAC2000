/*
  Warnings:

  - A unique constraint covering the columns `[gpxShareToken]` on the table `races` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "races" ADD COLUMN     "gpxShareEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gpxShareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "races_gpxShareToken_key" ON "races"("gpxShareToken");
