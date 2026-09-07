-- CreateEnum
CREATE TYPE "RaceStatus" AS ENUM ('draft', 'active', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('registered', 'running', 'finished', 'abandoned', 'disqualified');

-- CreateEnum
CREATE TYPE "Checkpoint" AS ENUM ('start', 'finish');

-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('success', 'rejected', 'duplicate');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "races" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "location" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "status" "RaceStatus" NOT NULL DEFAULT 'draft',
    "qrStartToken" TEXT NOT NULL,
    "qrFinishToken" TEXT NOT NULL,
    "publicResultsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "bibNumber" TEXT,
    "category" TEXT,
    "team" TEXT,
    "email" TEXT,
    "consentGivenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "start_timestamp" TIMESTAMP(3),
    "finish_timestamp" TIMESTAMP(3),
    "status" "RunStatus" NOT NULL DEFAULT 'registered',
    "duration_ms" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_logs" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "participantId" TEXT,
    "checkpoint" "Checkpoint" NOT NULL,
    "result" "ScanResult" NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "races_qrStartToken_key" ON "races"("qrStartToken");

-- CreateIndex
CREATE UNIQUE INDEX "races_qrFinishToken_key" ON "races"("qrFinishToken");

-- CreateIndex
CREATE INDEX "participants_raceId_bibNumber_idx" ON "participants"("raceId", "bibNumber");

-- CreateIndex
CREATE UNIQUE INDEX "participants_raceId_phoneNormalized_key" ON "participants"("raceId", "phoneNormalized");

-- CreateIndex
CREATE INDEX "runs_participant_id_status_idx" ON "runs"("participant_id", "status");

-- CreateIndex
CREATE INDEX "scan_logs_raceId_serverTimestamp_idx" ON "scan_logs"("raceId", "serverTimestamp");

-- AddForeignKey
ALTER TABLE "races" ADD CONSTRAINT "races_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
