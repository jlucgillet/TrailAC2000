/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `tracks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tracks_shareToken_key" ON "tracks"("shareToken");
