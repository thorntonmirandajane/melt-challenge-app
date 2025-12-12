-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "startWeight" DOUBLE PRECISION,
    "endWeight" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "s3Url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Challenge_shop_startDate_endDate_idx" ON "Challenge"("shop", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Challenge_shop_isActive_idx" ON "Challenge"("shop", "isActive");

-- CreateIndex
CREATE INDEX "Participant_challengeId_idx" ON "Participant"("challengeId");

-- CreateIndex
CREATE INDEX "Participant_shop_customerId_idx" ON "Participant"("shop", "customerId");

-- CreateIndex
CREATE INDEX "Participant_email_idx" ON "Participant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_challengeId_customerId_key" ON "Participant"("challengeId", "customerId");

-- CreateIndex
CREATE INDEX "Submission_participantId_type_idx" ON "Submission"("participantId", "type");

-- CreateIndex
CREATE INDEX "Submission_shop_idx" ON "Submission"("shop");

-- CreateIndex
CREATE INDEX "Photo_submissionId_idx" ON "Photo"("submissionId");

-- CreateIndex
CREATE INDEX "Photo_shop_idx" ON "Photo"("shop");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
