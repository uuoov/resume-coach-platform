-- Enum (必须先于 ALTER TABLE)
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER',
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "disabledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AiCallLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "service" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "promptChars" INTEGER NOT NULL,
    "responseChars" INTEGER NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCallLog_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Company add source
ALTER TABLE "Company" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'search';

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE INDEX "User_status_idx" ON "User"("status");

CREATE INDEX "Company_source_idx" ON "Company"("source");

CREATE INDEX "AiCallLog_userId_idx" ON "AiCallLog"("userId");

CREATE INDEX "AiCallLog_service_idx" ON "AiCallLog"("service");

CREATE INDEX "AiCallLog_createdAt_idx" ON "AiCallLog"("createdAt");

CREATE INDEX "AiCallLog_success_idx" ON "AiCallLog"("success");

-- AddForeignKey
ALTER TABLE "AiCallLog" ADD CONSTRAINT "AiCallLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
